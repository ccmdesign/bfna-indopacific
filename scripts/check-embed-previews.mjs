import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

// Run after CONTEXT=production npm run generate.
for (const [slug, title] of [
  ['renewables', 'Renewables on the Rise'],
  ['straits', 'Indo-Pacific Straits'],
]) {
  const path = `.output/public/test/embeds/${slug}/index.html`
  assert.ok(existsSync(path), `Published embed preview must be generated: ${slug}`)
  const html = readFileSync(path, 'utf8')
  assert.ok(html.includes(`Embed Preview: ${title}`), `Preview must render its own page: ${slug}`)
  assert.match(html, new RegExp(`<iframe[^>]+src="/embed/${slug}"`))
  assert.match(html, /name="robots" content="noindex, nofollow"/)
}

const index = readFileSync('.output/public/test/embeds/index.html', 'utf8')
assert.ok(index.includes('/embed/straits'))
assert.ok(index.includes('/embed/renewables'))
assert.ok(!index.includes('src="/embed/asean"'), 'Production preview index must exclude drafts')
assert.ok(!existsSync('.output/public/test/embeds/asean/index.html'), 'Draft preview must not be generated in production')
assert.ok(!existsSync('.output/public/test/hormuz/index.html'), 'Development test pages must stay excluded')
console.log('Published embed previews generated; drafts and development test pages excluded.')
