#!/usr/bin/env node
/**
 * BF-100 — static tile export pipeline.
 *
 * Builds the prerendered static site (`nuxt generate`), serves it locally,
 * and screenshots each infographic's `/embed/<slug>` route with Playwright at
 * its target tile size — settled (no ambient/decorative animation, reduced
 * motion) via the `?capture` query flag (see composables/useCaptureMode.ts,
 * plugins/capture-mode.client.ts, assets/styles.css `.is-capturing` rules).
 *
 * Usage:
 *   npm run export:tiles              # rebuild + export all 3 tiles
 *   npm run export:tiles -- --skip-build   # reuse an existing .output/public
 *
 * Output: exports/tiles/<slug>-<width>x<height>.png (gitignored — the
 * pipeline is the deliverable, not its output).
 */

import { chromium } from 'playwright'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, '.output', 'public')
const EXPORT_DIR = path.join(ROOT, 'exports', 'tiles')
const PORT = 4174

// Device-scale factor used for every tile: the Playwright viewport is set to
// target/DSF (CSS px) so `page.screenshot()` (no fullPage) lands on the exact
// target pixel dimensions — no crop/composite step needed.
const DSF = 2

/** @type {{ slug: string, width: number, height: number }[]} */
const TILES = [
  { slug: 'renewables', width: 2824, height: 1986 },
  { slug: 'straits', width: 2824, height: 1986 },
  { slug: 'asean', width: 3840, height: 3840 }
]

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

async function exportTile(browser, baseUrl, tile) {
  const viewport = { width: tile.width / DSF, height: tile.height / DSF }
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: DSF,
    reducedMotion: 'reduce'
  })
  const page = await context.newPage()

  try {
    await page.goto(`${baseUrl}/embed/${tile.slug}?capture`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    // Fixed settle delay: lets the capture-mode class/CSS apply and any
    // Vue enter-transitions on the idle state finish before the shot.
    await page.waitForTimeout(500)

    await mkdir(EXPORT_DIR, { recursive: true })
    const fileName = `${tile.slug}-${tile.width}x${tile.height}.png`
    const filePath = path.join(EXPORT_DIR, fileName)
    await page.screenshot({ path: filePath, type: 'png' })
    log(`Wrote exports/tiles/${fileName}`)
  } finally {
    await context.close()
  }
}

async function main() {
  const skipBuild = process.argv.includes('--skip-build')

  if (skipBuild && existsSync(OUTPUT_DIR)) {
    log('--skip-build: reusing existing .output/public')
  } else {
    runBuild()
  }

  if (!existsSync(OUTPUT_DIR)) {
    throw new Error(`Build output not found at ${OUTPUT_DIR} — nuxt generate did not produce a static site.`)
  }

  log(`Serving ${OUTPUT_DIR} on http://localhost:${PORT}`)
  const server = await startServer()
  const baseUrl = `http://localhost:${PORT}`

  const browser = await chromium.launch()
  try {
    for (const tile of TILES) {
      await exportTile(browser, baseUrl, tile)
    }
  } finally {
    await browser.close()
    server.close()
  }

  log(`Done — ${TILES.length} tiles written to exports/tiles/`)
}

main().catch((err) => {
  console.error('[export-tiles] failed:', err)
  process.exitCode = 1
})
