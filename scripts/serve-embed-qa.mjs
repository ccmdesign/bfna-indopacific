#!/usr/bin/env node
/**
 * BF-224 — serves the prerendered site (.output/public) for the embed QA bench
 * at /qa/embeds/ (public/qa/embeds/index.html — also live on every deploy).
 * Missing paths get the generated 404 page, as on Netlify.
 *
 * Usage:
 *   node scripts/serve-embed-qa.mjs            # serve the existing build
 *   node scripts/serve-embed-qa.mjs --build    # nuxt generate first
 *   node scripts/serve-embed-qa.mjs --port=4400
 */

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { OUTPUT_DIR, runBuild, resolveFile } from './lib/static-site.mjs'

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=')
    return [k, v.length ? v.join('=') : true]
  })
)
const PORT = Number(args.port ?? 4310)

function log(msg) {
  console.log(`[embed-qa] ${msg}`)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon'
}

async function main() {
  if (args.build) runBuild(log)
  if (!existsSync(OUTPUT_DIR)) {
    throw new Error(`No build at ${OUTPUT_DIR} — run with --build (or npm run generate) first.`)
  }

  const notFound = path.join(OUTPUT_DIR, '404.html')
  const server = createServer(async (req, res) => {
    try {
      const url = decodeURIComponent((req.url ?? '/').split('?')[0])
      const file = await resolveFile(url)
      if (!file) {
        // Mirror Netlify: missing paths get the generated 404 page.
        res.writeHead(404, { 'Content-Type': MIME['.html'] })
        res.end(existsSync(notFound) ? await readFile(notFound) : 'Not found')
        return
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' })
      res.end(await readFile(file))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(String(err))
    }
  })
  server.listen(PORT, () => log(`QA bench: http://localhost:${PORT}/qa/embeds/  (serving ${path.relative(process.cwd(), OUTPUT_DIR)})`))
}

main().catch((err) => {
  console.error('[embed-qa] failed:', err)
  process.exitCode = 1
})
