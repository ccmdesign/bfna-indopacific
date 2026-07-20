# BF-92 — Static image exports per infographic for Squarespace

## Context / prior art

BF-100 already shipped `scripts/export-tiles.mjs` (`npm run export:tiles`): it runs
`nuxt generate`, serves `.output/public` locally, and screenshots each infographic's
`/embed/<slug>?capture` route with Playwright at a settled idle state. Output lands in
`exports/tiles/` (gitignored).

So the screenshot pipeline exists. BF-92's remaining gaps are:

1. **Dimensions are hardcoded** in a `TILES` array. The ticket is blocked on Marshall
   confirming pixel dimensions — nothing in the current script lets that number be
   dropped in without editing source.
2. **The "links out to the interactive version" half is prose only.** The README tells a
   human to wire the link by hand in Squarespace. Nothing emits the pairing, so it is
   re-derived (and mis-typed) every time.
3. **Squarespace-appropriate web sizes don't exist.** The BF-100 tiles (2824×1986,
   3840×3840) were measured off the client's print-ish source infographics. Squarespace
   resizes anything wider than 2500px on upload, so those get silently downscaled.

## Approach

Extend the existing script rather than adding a second one — the build/serve/screenshot
machinery (~150 lines) is shared and should not be duplicated.

- Hoist sizing into a single `PRESETS` config block at the top of the file:
  - `tiles` (default, unchanged) — preserves BF-100 behavior exactly.
  - `squarespace` — width **2400px**, per-slug native aspect ratio.
- Add CLI flags so Marshall's number needs no code edit:
  `--preset=`, `--width=`, `--height=`, `--base-url=`.
- Emit link-out artifacts alongside the PNGs:
  - `manifest.json` — slug, title, file, dimensions, interactive URL.
  - `squarespace-snippets.html` — paste-ready `<a href="…"><img …></a>` per infographic.

### Why 2400px wide

Squarespace resizes uploads above 2500px, and its widest content column is ~1500px. 2400px
sits just under the cap and still renders crisp at 2× on a 1200px column. Heights follow
each infographic's native aspect (16:10 landscape; ASEAN square) so nothing is letterboxed.
Documented as a one-line constant + `--width` flag — swap in Marshall's number when it lands.

## Files

- `scripts/export-tiles.mjs` — presets, CLI arg parsing, manifest/snippet emitters.
- `README.md` — document the preset, flags, and emitted artifacts.
- `docs/plans/BF-92-plan.md` — this file.

## Test strategy

- `node scripts/export-tiles.mjs --preset=squarespace --skip-build` end to end; assert 3
  PNGs at expected pixel dimensions (`file`/`sips`), plus manifest + snippets.
- Re-run the default preset to confirm BF-100 output is byte-compatible in size.
- Browser test: load an emitted PNG and confirm the snippet link resolves to a live
  `/infographics/<slug>` page.

## Risks

- **Regressing BF-100.** Mitigation: `tiles` stays the default and its numbers are
  untouched; verify both presets.
- **Unknown final dimensions.** Mitigation: the whole point of the flags — no re-work when
  Marshall confirms, just a different `--width`.
- **Large binaries.** `exports/` is already gitignored; keep it that way.

## Default recorded (autonomous decision)

Marshall has not confirmed pixel dimensions. Defaulting to 2400px wide rather than
stalling; the value is a single constant and a CLI flag, so confirming it later is a
one-line change with no code review.
