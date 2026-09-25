/**
 * Shared plumbing for the static-image scripts (export-tiles.mjs, BF-100/BF-92;
 * export-thumbnails.mjs, BF-224): build the prerendered site, serve it locally,
 * and launch a browser to screenshot it.
 */

import { chromium } from 'playwright'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(__dirname, '..', '..')
export const OUTPUT_DIR = path.join(ROOT, '.output', 'public')
export const EXPORTS_ROOT = path.join(ROOT, 'exports')

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

export function runBuild(log) {
  log('Building static site (nuxt generate)...')
  // Deliberately no CONTEXT env var: infographicsToPrerender in nuxt.config.ts
  // only excludes drafts (asean) when CONTEXT === 'production', so a plain
  // local/CI generate prerenders every route the exports need.
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
export async function resolveFile(requestPath) {
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

export function startServer(port) {
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
    server.listen(port, () => resolve(server))
  })
}

/**
 * Launch Chromium. Falls back to the locally installed Chrome when Playwright's
 * bundled build is missing (e.g. after a Playwright bump without
 * `npx playwright install`), so an export doesn't die on a stale browser cache.
 */
export async function launchBrowser(log) {
  try {
    return await chromium.launch()
  } catch (err) {
    if (!String(err).includes("Executable doesn't exist")) throw err
    log('Bundled Chromium missing — falling back to installed Chrome (run `npx playwright install` to fix).')
    return chromium.launch({ channel: 'chrome' })
  }
}
