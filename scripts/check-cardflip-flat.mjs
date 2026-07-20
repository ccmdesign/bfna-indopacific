// Verifies CardFlip's flat fallback. Per engine:
//   webkit   -> flat on: no rotation, instant swap, trade face hidden immediately
//   chromium -> flat off: rotation still animates (no regression)
//   chromium + prefers-reduced-motion -> flat on
// BF-104 acceptance (no trade face perceivable on Critical Minerals) is asserted
// in every mode, across a producer and two non-producers.
import { chromium, webkit } from 'playwright'

const URL = 'http://localhost:3111/infographics/asean'
const COUNTRIES = ['Indonesia', 'Brunei', 'Timor-Leste']
const fail = []
const ok = (cond, msg) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fail.push(msg) }

// Timor-Leste's Panel 1 sits in a display:none subtree (BF-104 hides the trade
// panel for it), where computed transform is always 'none'. Filtering to
// rendered panels keeps the rotation assertions meaningful; the visibility
// assertions below still cover every panel that can actually be seen.
const inspect = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.card-flip__inner')].filter((el) => el.offsetParent !== null).map((el) => ({
    flat: el.classList.contains('is-flat'),
    transform: getComputedStyle(el).transform,
    transition: getComputedStyle(el).transitionDuration,
    fronts: [...el.querySelectorAll('.card-flip__face:not(.card-flip__face--back)')]
      .map((f) => getComputedStyle(f).visibility),
  }))
)

async function openCountry(page, country) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  const pill = page.locator('.asean-legend__pill')
  if (await pill.count()) await pill.click()
  await page.locator('.asean-legend__row', { hasText: country }).first().click()
  await page.getByRole('tab', { name: /critical minerals/i }).click()
}

async function run(engine, name, expectFlat, opts = {}) {
  const browser = await engine.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...opts })
  console.log(`\n=== ${name} (expect flat=${expectFlat}) ===`)

  for (const country of COUNTRIES) {
    await openCountry(page, country)
    // Sampled right after the tab click: the window where a real flip still
    // paints both faces and flat mode must already have settled.
    const immediate = await inspect(page)
    await page.waitForTimeout(1000)
    const settled = await inspect(page)

    ok(settled.length > 0, `${country}: card-flip panels present (${settled.length})`)
    ok(settled.every((p) => p.flat === expectFlat), `${country}: is-flat === ${expectFlat}`)

    if (expectFlat) {
      ok(settled.every((p) => p.transform === 'none'), `${country}: no rotation`)
      ok(settled.every((p) => p.transition === '0s'), `${country}: transition disabled`)
      ok(immediate.every((p) => p.fronts.every((v) => v === 'hidden')),
        `${country}: trade face hidden IMMEDIATELY on tab switch`)
    } else {
      ok(settled.every((p) => p.transform !== 'none'), `${country}: rotation still applied`)
      ok(settled.every((p) => p.transition !== '0s'), `${country}: flip still animates`)
    }

    ok(settled.every((p) => p.fronts.every((v) => v === 'hidden')),
      `${country}: settled — no trade face perceivable (BF-104)`)
  }
  await browser.close()
}

await run(webkit, 'webkit', true)
await run(chromium, 'chromium', false)
await run(chromium, 'chromium + reduced-motion', true, { reducedMotion: 'reduce' })

console.log(fail.length ? `\n${fail.length} FAILURE(S)` : '\nall green')
process.exit(fail.length ? 1 : 0)
