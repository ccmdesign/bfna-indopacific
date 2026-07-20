#!/usr/bin/env node
/**
 * BF-100 / BF-92 — static image export pipeline.
 *
 * Builds the prerendered static site (`nuxt generate`), serves it locally,
 * and screenshots each infographic's `/embed/<slug>` route with Playwright at
 * its target size — settled (no ambient/decorative animation, reduced
 * motion) via the `?capture` query flag (see composables/useCaptureMode.ts,
 * plugins/capture-mode.client.ts, assets/styles.css `.is-capturing` rules).
 *
 * BF-92 adds the Squarespace half: a web-sized preset, CLI overrides so the
 * client's final pixel dimensions can be dropped in without editing source,
 * and link-out artifacts (manifest.json + paste-ready HTML snippets) pairing
 * each PNG with the live interactive page it should link to.
 *
 * Usage:
 *   npm run export:tiles                              # BF-100 native tiles
 *   npm run export:squarespace                        # 2400px-wide web images
 *   npm run export:tiles -- --skip-build              # reuse .output/public
 *   npm run export:tiles -- --preset=squarespace --width=1800
 *   npm run export:tiles -- --base-url=https://example.org
 *
 * Output: exports/<preset>/ (gitignored — the pipeline is the deliverable,
 * not its output):
 *   <slug>-<width>x<height>.png
 *   manifest.json
 *   squarespace-snippets.html
 */

import { chromium } from 'playwright'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, '.output', 'public')
const EXPORTS_ROOT = path.join(ROOT, 'exports')
const PORT = 4174

// Public origin the emitted snippets link to. Override with --base-url when
// pointing at a preview deploy or the client's final domain.
const DEFAULT_BASE_URL = 'https://bfna-indopacific.netlify.app'

/**
 * CSS-pixel layout viewport per infographic — the size the design is composed
 * for, NOT the output resolution.
 *
 * These two are deliberately decoupled. The layout viewport decides how the
 * infographic reflows (type scale, chart margins, whether the title wraps); the
 * output resolution is then reached purely by `deviceScaleFactor`. Rendering at
 * a smaller CSS viewport to get a smaller PNG would silently re-flow and clip
 * the design — an earlier pass at this did exactly that, cropping the
 * renewables title and x-axis. Change these only to change composition.
 */
const LAYOUTS = {
  renewables: { width: 1412, height: 993 },
  straits: { width: 1412, height: 993 },
  asean: { width: 1920, height: 1920 }
}

// --- BF-92: Squarespace target width -----------------------------------------
// Marshall has not yet confirmed the client's pixel dimensions. 2400px is the
// documented default: Squarespace resizes any upload wider than 2500px, and its
// widest content column is ~1500px — so 2400px sits under the cap while still
// rendering crisp at 2x. Change this one constant (or pass --width=N) when the
// confirmed number lands; heights follow from each infographic's layout aspect.
const SQUARESPACE_WIDTH = 2400

/**
 * Named presets, expressed as an output width per infographic. `tiles`
 * reproduces BF-100 exactly (2x the layout viewport = the native sizes measured
 * from the client's source infographics) and stays the default, so existing
 * usage is unchanged. `squarespace` is the BF-92 web-sized variant.
 *
 * @type {Record<string, Record<string, number>>}
 */
const PRESETS = {
  tiles: {
    renewables: 2824, // 1412 x 2
    straits: 2824,
    asean: 3840 // 1920 x 2
  },
  squarespace: {
    renewables: SQUARESPACE_WIDTH,
    straits: SQUARESPACE_WIDTH,
    asean: SQUARESPACE_WIDTH
  }
}

const DEFAULT_PRESET = 'tiles'

/** Parse `--flag=value` / `--flag` argv into a plain object. */
function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rest] = arg.slice(2).split('=')
    out[rawKey] = rest.length ? rest.join('=') : true
  }
  return out
}

/** Read a positive-integer flag, or throw a usage error. */
function intFlag(args, name) {
  if (args[name] === undefined) return undefined
  const value = Number(args[name])
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer (got "${args[name]}")`)
  }
  return value
}

/**
 * Resolve the export plan from CLI args: which preset, at what dimensions,
 * written where, linking to which origin.
 */
function resolvePlan(args) {
  const presetName = args.preset === undefined ? DEFAULT_PRESET : String(args.preset)
  const preset = PRESETS[presetName]
  if (!preset) {
    throw new Error(
      `Unknown --preset "${presetName}". Available: ${Object.keys(PRESETS).join(', ')}`
    )
  }

  const widthOverride = intFlag(args, 'width')
  const heightOverride = intFlag(args, 'height')

  // Output size is reached by scaling the layout viewport, never by resizing
  // it. --width sets the output width directly; --height sets it via the
  // layout's aspect ratio. Passing both is rejected rather than silently
  // stretching, since a non-uniform scale isn't expressible as a single
  // deviceScaleFactor and would distort the design.
  if (widthOverride && heightOverride) {
    throw new Error(
      'Pass --width or --height, not both: output is a uniform scale of the layout viewport, so one determines the other.'
    )
  }

  const targets = Object.entries(preset).map(([slug, presetWidth]) => {
    const layout = LAYOUTS[slug]
    if (!layout) throw new Error(`No layout viewport defined for slug "${slug}"`)

    const outWidth = widthOverride
      ?? (heightOverride ? Math.round(heightOverride * (layout.width / layout.height)) : presetWidth)

    // Derive the scale factor from width, then let height fall out of it, so
    // the declared filename always matches the actual screenshot dimensions.
    const scale = outWidth / layout.width
    return {
      slug,
      layout,
      scale,
      width: outWidth,
      height: Math.round(layout.height * scale)
    }
  })

  const baseUrl = String(args['base-url'] ?? DEFAULT_BASE_URL).replace(/\/+$/, '')

  return {
    presetName,
    targets,
    baseUrl,
    exportDir: path.join(EXPORTS_ROOT, presetName),
    skipBuild: args['skip-build'] === true
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
}

function log(msg) {
  console.log(`[export-tiles] ${msg}`)
}

function runBuild() {
  log('Building static site (nuxt generate)...')
  // Deliberately no CONTEXT env var: infographicsToPrerender in nuxt.config.ts
  // only excludes drafts (asean) when CONTEXT === 'production', so a plain
  // local/CI generate prerenders all three routes we need.
  const env = { ...process.env }
  delete env.CONTEXT
  const result = spawnSync('npx', ['nuxt', 'generate'], {
    cwd: ROOT,
    stdio: 'inherit',
    env
  })
  if (result.status !== 0) {
    throw new Error(`nuxt generate failed with exit code ${result.status}`)
  }
}

/** Resolve a request path to a file under OUTPUT_DIR (clean-URL aware). */
async function resolveFile(requestPath) {
  const cleanPath = requestPath.split('?')[0]
  const candidates = []
  if (cleanPath.endsWith('/')) {
    candidates.push(path.join(OUTPUT_DIR, cleanPath, 'index.html'))
  } else {
    candidates.push(path.join(OUTPUT_DIR, cleanPath))
    candidates.push(path.join(OUTPUT_DIR, cleanPath, 'index.html'))
    candidates.push(path.join(OUTPUT_DIR, `${cleanPath}.html`))
  }
  for (const candidate of candidates) {
    try {
      const stats = await stat(candidate)
      if (stats.isFile()) return candidate
    } catch {
      // try next candidate
    }
  }
  return null
}

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const filePath = await resolveFile(decodeURIComponent(req.url ?? '/'))
      if (!filePath) {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not found')
        return
      }
      const ext = path.extname(filePath)
      const body = await readFile(filePath)
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' })
      res.end(body)
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(String(err))
    }
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(PORT, () => resolve(server))
  })
}

async function exportTile(browser, localUrl, tile, exportDir) {
  const context = await browser.newContext({
    viewport: { width: tile.layout.width, height: tile.layout.height },
    deviceScaleFactor: tile.scale,
    reducedMotion: 'reduce'
  })
  const page = await context.newPage()

  try {
    await page.goto(`${localUrl}/embed/${tile.slug}?capture`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    // Fixed settle delay: lets the capture-mode class/CSS apply and any
    // Vue enter-transitions on the idle state finish before the shot.
    await page.waitForTimeout(500)

    await mkdir(exportDir, { recursive: true })
    const fileName = `${tile.slug}-${tile.width}x${tile.height}.png`
    await page.screenshot({ path: path.join(exportDir, fileName), type: 'png' })
    log(`Wrote ${path.relative(ROOT, path.join(exportDir, fileName))}`)
    return fileName
  } finally {
    await context.close()
  }
}

/**
 * Read display titles out of data/infographics.ts.
 *
 * Deliberately a shallow regex parse rather than an import: that file is
 * TypeScript and this script runs under bare node. A miss is non-fatal — the
 * slug is used as the title instead, so a refactor of the data file degrades
 * the snippet labels rather than breaking the export.
 */
async function readTitles() {
  /** @type {Record<string, string>} */
  const titles = {}
  try {
    const src = await readFile(path.join(ROOT, 'data', 'infographics.ts'), 'utf8')
    const entry = /slug:\s*'([^']+)'[\s\S]*?title:\s*'([^']+)'/g
    let match
    while ((match = entry.exec(src)) !== null) {
      titles[match[1]] = match[2]
    }
  } catch (err) {
    log(`WARN: could not read infographic titles (${err.message}); falling back to slugs`)
  }
  return titles
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Emit the link-out artifacts. Each static image is only half the deliverable —
 * the other half is the URL of the interactive version it must link to, which
 * was previously left to be retyped by hand in Squarespace.
 */
async function writeLinkArtifacts(exportDir, entries, baseUrl, presetName) {
  const manifestPath = path.join(exportDir, 'manifest.json')
  await writeFile(
    manifestPath,
    `${JSON.stringify({ preset: presetName, baseUrl, generatedAt: new Date().toISOString(), images: entries }, null, 2)}\n`,
    'utf8'
  )
  log(`Wrote ${path.relative(ROOT, manifestPath)}`)

  const blocks = entries
    .map(
      (e) => `<!-- ${escapeHtml(e.title)} — ${e.width}x${e.height} -->
<a href="${escapeHtml(e.interactiveUrl)}" target="_blank" rel="noopener">
  <img src="${escapeHtml(e.file)}" alt="${escapeHtml(e.title)}" width="${e.width}" height="${e.height}" style="max-width:100%;height:auto" />
</a>`
    )
    .join('\n\n')

  const snippetsPath = path.join(exportDir, 'squarespace-snippets.html')
  await writeFile(
    snippetsPath,
    `<!--
  Generated by scripts/export-tiles.mjs (preset: ${presetName}) — do not edit by hand.

  For each infographic: upload the PNG in this folder to Squarespace, then swap the
  img src below for the URL Squarespace gives the uploaded file. The href already
  points at the live interactive version and should not need changing.
-->

${blocks}
`,
    'utf8'
  )
  log(`Wrote ${path.relative(ROOT, snippetsPath)}`)
}

async function main() {
  const plan = resolvePlan(parseArgs(process.argv.slice(2)))

  log(`Preset "${plan.presetName}" → ${path.relative(ROOT, plan.exportDir)}/`)
  log(`Interactive links point at ${plan.baseUrl}`)

  // Filenames carry their dimensions, so a run at a different --width leaves
  // the previous run's PNGs behind. The client then has two versions of each
  // infographic in one folder with no way to tell which the snippets refer to.
  // Clear the preset's own directory (never `exports/` as a whole, so sibling
  // presets survive) and let this run be the single source of truth.
  await rm(plan.exportDir, { recursive: true, force: true })
  await mkdir(plan.exportDir, { recursive: true })

  if (plan.skipBuild && existsSync(OUTPUT_DIR)) {
    log('--skip-build: reusing existing .output/public')
  } else {
    runBuild()
  }

  if (!existsSync(OUTPUT_DIR)) {
    throw new Error(`Build output not found at ${OUTPUT_DIR} — nuxt generate did not produce a static site.`)
  }

  log(`Serving ${OUTPUT_DIR} on http://localhost:${PORT}`)
  const server = await startServer()
  const localUrl = `http://localhost:${PORT}`
  const titles = await readTitles()

  const entries = []
  const browser = await chromium.launch()
  try {
    for (const tile of plan.targets) {
      const file = await exportTile(browser, localUrl, tile, plan.exportDir)
      entries.push({
        slug: tile.slug,
        title: titles[tile.slug] ?? tile.slug,
        file,
        width: tile.width,
        height: tile.height,
        interactiveUrl: `${plan.baseUrl}/infographics/${tile.slug}`
      })
    }
  } finally {
    await browser.close()
    server.close()
  }

  await writeLinkArtifacts(plan.exportDir, entries, plan.baseUrl, plan.presetName)

  log(`Done — ${entries.length} images written to ${path.relative(ROOT, plan.exportDir)}/`)
}

main().catch((err) => {
  console.error('[export-tiles] failed:', err)
  process.exitCode = 1
})
