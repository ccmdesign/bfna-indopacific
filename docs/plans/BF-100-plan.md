# BF-100 — Static tile export pipeline for Squarespace

## Findings that shape the approach

- `.master-grid` (the shared page box for `layout-1`/`layout-2`/`layout-3`) is
  hard-locked to `aspect-ratio: 16/9` (`public/styles.css`). Target tile
  aspect ratios (1.42:1 landscape, 1:1 square) don't match 16:9, so a capture
  mode needs to relax that lock rather than fight it.
- ASEAN's own root (`.asean-infographic`) is `position:fixed; inset:0`, so it
  already escapes the grid box and fills the true viewport regardless of
  `.master-grid`'s size — the override mainly matters for renewables/straits,
  which are grid-placed (`grid-row`/`grid-column`) inside the box.
- Reduced-motion is already wired through nearly everything that matters:
  `useTypewriter`, `useScramble`, `useParticleFlow`, `useStraitTransition`,
  `StraitMap`, `AseanMap`, `StraitParticleCanvas`, and the renewables
  `.bg-image` float all check `prefers-reduced-motion: reduce` (via
  `matchMedia` or the CSS media query) and snap to a settled end state.
  Playwright's `reducedMotion: 'reduce'` context option covers all of these
  for free.
- The one thing that does NOT respect reduced motion: `components/GridOverlay.vue`
  (decorative background grid, `requestAnimationFrame` loop, random active
  cells). Needs an explicit capture-mode gate for deterministic output.
- The `ccm-feedback` review FAB is already force-hidden globally via CSS
  (`assets/styles.css`, `ccm-feedback-widget { display: none !important; }`),
  independent of environment — no extra work needed there.
- Capture source: `/embed/<slug>` (minimal `layouts/embed.vue`, no footer/
  header/embed-code button) — this is what the iframe currently shows, so the
  static tile should visually match it, not the full `/infographics/<slug>`
  page chrome.

## Per-infographic size choice

| slug | target | rationale |
|---|---|---|
| renewables | 2824×1986 (landscape) | explicitly named as the reference tile in the brief |
| straits | 2824×1986 (landscape) | same grid-placed chart/map composition as renewables |
| asean | 3840×3840 (square) | brief calls the square size "their main map tile"; ASEAN is a full-bleed map and already escapes the 16:9 box via `position:fixed` |

## Capture mechanism

1. `composables/useCaptureMode.ts` — `route.query.capture !== undefined`.
2. `plugins/capture-mode.client.ts` — on client init, if capture mode, add
   `is-capturing` class to `<html>`.
3. CSS (appended to `assets/styles.css`):
   - `.is-capturing .master-grid { aspect-ratio: auto !important; height: 100svh !important; }`
     — both width and height become definite, so `aspect-ratio` becomes a
     no-op and the grid fills whatever viewport Playwright gives it.
   - `.is-capturing, .is-capturing * { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }`
     — belt-and-suspenders on top of `prefers-reduced-motion` for any CSS
     animation/transition not already gated.
4. `GridOverlay.vue` — skip starting its `requestAnimationFrame` loop when
   `useCaptureMode()` is true (renders as a static, inactive grid texture).
5. Export script sets the Playwright browser context to
   `reducedMotion: 'reduce'` and navigates to `/embed/<slug>?capture`.

## Script (`scripts/export-tiles.mjs`, `npm run export:tiles`)

- Boots the **built, prerendered static site** (not the dev server): runs
  `nuxt generate` (draft infographics — asean — are included whenever
  `CONTEXT !== 'production'`, which is the case for a local/CI run), then
  serves `.output/public` with a small dependency-free Node static file
  server (clean-URL → `<route>/index.html` resolution). This matches
  production output exactly and avoids dev-server HMR/overlay noise.
- Chromium via Playwright, one browser context per tile with
  `deviceScaleFactor: 2` and a CSS-pixel viewport equal to
  `target / 2` (1412×993 landscape, 1920×1920 square) — so `page.screenshot()`
  (no `fullPage`) lands on the exact target pixel dimensions without any
  crop/composite step.
- Per tile: navigate → `page.waitForLoadState('networkidle')` →
  `document.fonts.ready` → fixed settle delay (~500 ms) → screenshot to
  `exports/tiles/<slug>-<W>x<H>.png`.
- `exports/` is gitignored; the pipeline is the deliverable, not its output.

## Docs

Short `docs/tile-export.md` (linked from README): how to run
`npm run export:tiles`, where output lands, and the intended Squarespace
usage (tile image block + link to `https://<site>/infographics/<slug>` — or
whichever live URL the client actually links to for the interactive version).

## `browser-test-bf67.spec.ts`

Installing `@playwright/test` as part of the `playwright` devDependency makes
the import resolve; the spec should become runnable as-is (no playwright
config exists yet, so a minimal `playwright.config.ts` — or documenting
`npx playwright test browser-test-bf67.spec.ts` against a running preview
server — may be needed). Treated as in-scope only if it turns out trivial;
otherwise noted as out-of-scope in the PR.
