#!/usr/bin/env node
/**
 * BF-224 — teaser thumbnails for every infographic that has an embed canvas.
 *
 * Renders the design-size canvas (/embed/canvas/<slug>?capture&bare — the visual
 * with its own text hidden) and composes it into designed teasers: headline,
 * "Interactive infographic" kicker, an explore call-to-action and the BFNA logo.
 * Earlier Squarespace tiles were straight screenshots of the whole infographic,
 * which read as static charts at gallery size and never said "click me".
 *
 * Two destinations:
 *   public/thumbnails/  (committed, served by the site)
 *     <slug>-og.jpg        1200×630  link previews (og:image / twitter:image)
 *     <slug>-card.jpg      1200×750  catalog cards on the hub page (visual only)
 *     <slug>-visual.jpg    canvas    embed cover-card background (visual only)
 *   exports/thumbnails/ (gitignored, handed to the client)
 *     <slug>-square-2160.jpg      1:1 Squarespace gallery tile
 *     <slug>-feature-2400x1600.jpg 3:2 homepage feature slot
 *     <slug>-og-1200x630.jpg      same link-preview image, for manual use
 *     manifest.json + squarespace-snippets.html (image ↔ interactive URL)
 *
 * Usage:
 *   npm run export:thumbnails
 *   npm run export:thumbnails -- --skip-build
 *   npm run export:thumbnails -- --base-url=https://example.org
 */

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { ROOT, OUTPUT_DIR, EXPORTS_ROOT, runBuild, startServer, launchBrowser } from './lib/static-site.mjs'

const PORT = 4175
const DEFAULT_BASE_URL = 'https://bfna-indopacific.netlify.app'
const PUBLIC_DIR = path.join(ROOT, 'public', 'thumbnails')
const EXPORT_DIR = path.join(EXPORTS_ROOT, 'thumbnails')

/**
 * Per-infographic teaser settings. Canvas sizes and aspect bounds mirror
 * `canvas` in data/infographics.ts (this script runs under bare node and can't
 * import the TS module); headline/description are read from that file below.
 *
 * `text` places the teaser copy where the visual has room: the Straits map is
 * busiest across its upper half, Renewables leaves a band free above its chart
 * once its intro paragraph is hidden. `focal` is the object-position used when
 * a format crops the visual.
 */
const SLUGS = {
  straits: {
    canvas: { width: 1440, height: 810, minAspect: 1.33, maxAspect: 2.2 },
    text: 'bottom',
    focal: '55% 42%'
  },
  renewables: {
    canvas: { width: 1412, height: 993, minAspect: 1.36, maxAspect: 1.55 },
    text: 'top',
    focal: '70% 50%'
  }
}

/**
 * Output formats. `width`/`height` are CSS pixels of the composition; `scale`
 * is the device pixel ratio, so the file is width×scale by height×scale.
 *
 * Layouts:
 *   overlay — visual full-bleed, copy over a scrim (landscape formats)
 *   stack   — copy on a solid band above the whole visual at its design shape;
 *             a square crop of a landscape infographic cut off its data, and
 *             title-over-visual matches the client's existing gallery tiles
 *   visual  — the visual alone (catalog cards, embed cover-card background)
 */
const FORMATS = [
  { id: 'og', width: 1200, height: 630, scale: 1, layout: 'overlay', quality: 86, public: '{slug}-og.jpg', export: '{slug}-og-1200x630.jpg' },
  { id: 'square', width: 1080, height: 1080, scale: 2, layout: 'stack', quality: 90, export: '{slug}-square-2160.jpg' },
  { id: 'feature', width: 1200, height: 800, scale: 2, layout: 'overlay', quality: 90, export: '{slug}-feature-2400x1600.jpg' },
  { id: 'card', width: 800, height: 500, scale: 1.5, layout: 'visual', quality: 82, public: '{slug}-card.jpg' },
  { id: 'visual', width: null, height: null, scale: 1.5, layout: 'visual', quality: 78, public: '{slug}-visual.jpg' }
]

function log(msg) {
  console.log(`[export-thumbnails] ${msg}`)
}

function parseArgs(argv) {
  const out = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...rest] = arg.slice(2).split('=')
    out[key] = rest.length ? rest.join('=') : true
  }
  return out
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Shallow parse of data/infographics.ts for headline + description (see export-tiles.mjs readTitles). */
async function readCopy() {
  const src = await readFile(path.join(ROOT, 'data', 'infographics.ts'), 'utf8')
  const copy = {}
  const entry = /\{\s*slug:\s*'([^']+)'([\s\S]*?)\n  \}/g
  let match
  while ((match = entry.exec(src)) !== null) {
    const body = match[2]
    copy[match[1]] = {
      description: body.match(/description:\s*'([^']+)'/)?.[1],
      headline: body.match(/headline:\s*'([^']+)'/)?.[1] ?? body.match(/title:\s*'([^']+)'/)?.[1]
    }
  }
  return copy
}

/** Canvas size for a target shape — same rule as components/EmbedStage.vue. */
function canvasFor(canvas, targetAspect) {
  const designAspect = canvas.width / canvas.height
  const aspect = Math.min(canvas.maxAspect, Math.max(canvas.minAspect, targetAspect))
  return aspect >= designAspect
    ? { width: Math.round(canvas.height * aspect), height: canvas.height }
    : { width: canvas.width, height: Math.round(canvas.width / aspect) }
}

/** Screenshot the bare canvas at the size a format needs; returns a PNG buffer. */
async function captureVisual(browser, localUrl, slug, size, pixelRatio) {
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: pixelRatio,
    reducedMotion: 'reduce'
  })
  const page = await context.newPage()
  try {
    await page.goto(`${localUrl}/embed/canvas/${slug}?capture&bare`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(600)
    return await page.screenshot({ type: 'png' })
  } finally {
    await context.close()
  }
}

function teaserHtml({ format, slugCfg, copy, visualDataUrl, logoSvg }) {
  const { width: W, height: H } = format
  // One unit = 1% of the short side, so every format shares proportions.
  const u = Math.min(W, H) / 100
  const stack = format.layout === 'stack'
  const textTop = stack || slugCfg.text === 'top'
  const showDesc = format.id !== 'og'
  const headlineSize = (stack ? 6.6 : 8.6) * u
  // Stack: the visual keeps its design shape, pinned to the bottom edge.
  const visualH = stack ? Math.round(W / (slugCfg.canvas.width / slugCfg.canvas.height)) : H

  // Straits keeps its right half (Malacca → Taiwan) bright: the scrim runs from
  // the bottom-left corner instead of across the whole bottom edge.
  const scrim = stack
    ? `linear-gradient(to bottom, #050d1a 0%, rgba(5,13,26,.85) 12%, rgba(5,13,26,0) 34%)`
    : textTop
      ? `linear-gradient(to bottom, rgba(4,10,22,.96) 0%, rgba(4,10,22,.8) 28%, rgba(4,10,22,.3) 50%, rgba(4,10,22,0) 64%)`
      : `linear-gradient(to top right, rgba(4,10,22,.97) 0%, rgba(4,10,22,.85) 28%, rgba(4,10,22,.35) 50%, rgba(4,10,22,0) 66%),
         linear-gradient(to top, rgba(4,10,22,.55) 0%, rgba(4,10,22,0) 40%)`

  return `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Encode+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #050d1a; }
  body { position: relative; font-family: 'Encode Sans', sans-serif; color: #fff; }
  .frame { position: absolute; left: 0; right: 0; bottom: 0; height: ${visualH}px; }
  .visual { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: ${stack ? '50% 50%' : slugCfg.focal}; }
  .scrim { position: absolute; inset: 0; background: ${scrim}; }
  .logo { position: absolute; width: ${Math.min(20 * u, 190)}px; right: ${5 * u}px; top: ${5 * u}px; }
  .logo svg { display: block; width: 100%; height: auto; }
  .text { position: absolute; left: ${6 * u}px; right: ${6 * u}px; ${textTop ? `top: ${6 * u}px;` : `bottom: ${6 * u}px;`}
    display: flex; flex-direction: column; align-items: flex-start; gap: ${1.8 * u}px; }
  .kicker { font-size: ${Math.max(1.9 * u, 12)}px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: rgba(255,255,255,.72); }
  .kicker::before { content: ''; display: inline-block; width: ${4 * u}px; height: 1px; background: rgba(255,255,255,.6); vertical-align: middle; margin-right: ${1.4 * u}px; }
  h1 { margin: 0; font-size: ${headlineSize}px; font-weight: 600; line-height: 1.02; letter-spacing: -.015em; max-width: ${stack ? '80%' : '72%'}; text-wrap: balance; text-shadow: 0 2px 18px rgba(0,0,0,.35); }
  p { margin: 0; max-width: ${stack ? '76%' : '58%'}; font-size: ${Math.max(2.5 * u, 14)}px; line-height: 1.45; color: rgba(255,255,255,.78); }
  .cta { margin-top: ${0.8 * u}px; display: inline-flex; align-items: center; gap: ${1.2 * u}px; padding: ${1.5 * u}px ${2.4 * u}px;
    font-size: ${Math.max(1.9 * u, 12)}px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #04111f; background: #fff; }
  .cta svg { width: ${1.8 * u}px; height: ${1.8 * u}px; }
</style></head>
<body>
  <div class="frame">
    <img class="visual" src="${visualDataUrl}" alt="">
    <div class="scrim"></div>
  </div>
  <div class="logo">${logoSvg}</div>
  <div class="text">
    <span class="kicker">Interactive infographic</span>
    <h1>${escapeHtml(copy.headline)}</h1>
    ${showDesc ? `<p>${escapeHtml(copy.description)}</p>` : ''}
    <span class="cta">Explore the interactive
      <svg viewBox="0 0 10 10" fill="none"><path d="M3 1h6v6M9 1 1 9" stroke="currentColor" stroke-width="1.4"/></svg>
    </span>
  </div>
</body></html>`
}

function visualHtml({ format, slugCfg, visualDataUrl }) {
  return `<!doctype html><html><head><style>
  html, body { margin: 0; width: ${format.width}px; height: ${format.height}px; overflow: hidden; background: #050d1a; }
  img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: ${slugCfg.focal}; }
</style></head><body><img src="${visualDataUrl}" alt=""></body></html>`
}

async function renderFormat(browser, { format, html, outPaths }) {
  const context = await browser.newContext({
    viewport: { width: format.width, height: format.height },
    deviceScaleFactor: format.scale
  })
  const page = await context.newPage()
  try {
    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    const buffer = await page.screenshot({ type: 'jpeg', quality: format.quality })
    for (const p of outPaths) {
      await writeFile(p, buffer)
      log(`Wrote ${path.relative(ROOT, p)}`)
    }
  } finally {
    await context.close()
  }
}

async function writeLinkArtifacts(entries, baseUrl) {
  await writeFile(
    path.join(EXPORT_DIR, 'manifest.json'),
    `${JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), images: entries }, null, 2)}\n`,
    'utf8'
  )
  const blocks = entries
    .map((e) => `<!-- ${escapeHtml(e.headline)} — ${e.format} (${e.width}x${e.height}) -->
<a href="${escapeHtml(e.interactiveUrl)}" target="_blank" rel="noopener">
  <img src="${escapeHtml(e.file)}" alt="${escapeHtml(e.headline)} — interactive infographic" width="${e.width}" height="${e.height}" style="max-width:100%;height:auto" />
</a>`)
    .join('\n\n')
  await writeFile(
    path.join(EXPORT_DIR, 'squarespace-snippets.html'),
    `<!--
  Generated by scripts/export-thumbnails.mjs — do not edit by hand.
  Upload each JPG to Squarespace, then point the block's click-through link (or the
  img src below) at it. The href is the live interactive version.
-->

${blocks}
`,
    'utf8'
  )
  log(`Wrote ${path.relative(ROOT, path.join(EXPORT_DIR, 'manifest.json'))} + squarespace-snippets.html`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const baseUrl = String(args['base-url'] ?? DEFAULT_BASE_URL).replace(/\/+$/, '')

  if (args['skip-build'] === true && existsSync(OUTPUT_DIR)) {
    log('--skip-build: reusing existing .output/public')
  } else {
    runBuild(log)
  }

  const copy = await readCopy()
  const logoSvg = await readFile(path.join(ROOT, 'assets', 'images', 'bfna.svg'), 'utf8')

  const server = await startServer(PORT)
  const localUrl = `http://localhost:${PORT}`
  const browser = await launchBrowser(log)

  await rm(EXPORT_DIR, { recursive: true, force: true })
  await mkdir(EXPORT_DIR, { recursive: true })
  await mkdir(PUBLIC_DIR, { recursive: true })

  const entries = []
  try {
    for (const [slug, slugCfg] of Object.entries(SLUGS)) {
      if (!existsSync(path.join(OUTPUT_DIR, 'embed', 'canvas', slug, 'index.html'))) {
        throw new Error(`/embed/canvas/${slug} was not prerendered — is it in nuxt.config.ts embedCanvasRoutes?`)
      }
      const slugCopy = {
        headline: copy[slug]?.headline ?? slug,
        description: copy[slug]?.description ?? ''
      }

      for (const base of FORMATS) {
        const format = base.id === 'visual'
          ? { ...base, width: slugCfg.canvas.width, height: slugCfg.canvas.height }
          : base

        // Capture the canvas at the format's shape (within the infographic's
        // aspect bounds) and at enough density to survive the cover crop.
        const box = format.layout === 'stack'
          ? { width: format.width, height: format.width / (slugCfg.canvas.width / slugCfg.canvas.height) }
          : { width: format.width, height: format.height }
        const size = canvasFor(slugCfg.canvas, box.width / box.height)
        const cover = Math.max(box.width / size.width, box.height / size.height)
        const png = await captureVisual(browser, localUrl, slug, size, Math.max(1, cover * format.scale))
        const visualDataUrl = `data:image/png;base64,${png.toString('base64')}`

        const html = format.layout !== 'visual'
          ? teaserHtml({ format, slugCfg, copy: slugCopy, visualDataUrl, logoSvg })
          : visualHtml({ format, slugCfg, visualDataUrl })

        const outPaths = []
        if (format.public) outPaths.push(path.join(PUBLIC_DIR, format.public.replace('{slug}', slug)))
        if (format.export) outPaths.push(path.join(EXPORT_DIR, format.export.replace('{slug}', slug)))
        await renderFormat(browser, { format, html, outPaths })

        if (format.export) {
          entries.push({
            slug,
            format: format.id,
            headline: slugCopy.headline,
            file: format.export.replace('{slug}', slug),
            width: Math.round(format.width * format.scale),
            height: Math.round(format.height * format.scale),
            interactiveUrl: `${baseUrl}/infographics/${slug}`
          })
        }
      }
    }
  } finally {
    await browser.close()
    server.close()
  }

  await writeLinkArtifacts(entries, baseUrl)
  log(`Done — ${entries.length} client images in ${path.relative(ROOT, EXPORT_DIR)}/, site assets in ${path.relative(ROOT, PUBLIC_DIR)}/`)
}

main().catch((err) => {
  console.error('[export-thumbnails] failed:', err)
  process.exitCode = 1
})
