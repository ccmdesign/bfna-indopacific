---
status: resolved
resolution: "defensive width cap (44vw/600px) + browser verification at 1280x800: largest dock (Indonesia, hit-bottom y=303) clears BL panel top (y=432) by ~129px; overlapsBL/BR/TR all false; re-click-to-deselect confirmed for Indonesia + Brunei"
priority: p2
issue_id: "157"
tags: [code-review, visual-verification, BF-71]
dependencies: []
requires_verification: false
---

# BL Panel May Crowd the TL-Docked Country — Needs 1280×800 Visual Verification

## Problem Statement

In `components/infographics/AseanInfographic.vue`, the bottom-left (BL) panel is a
`pointer-events: auto` `CardFlip` positioned with:

```
.asean-infographic__panel       { bottom: clamp(48px, 6vh, 72px); width: min(46vw, 620px);
                                  min-height: 320px; pointer-events: auto; }
.asean-infographic__panel-bl    { left: clamp(16px, 2vw, 32px); }
```

At the canonical 1280×800 stage this resolves to roughly `x:[26, 614]`, `y:[432, 752]`.
The docked country is centered at the TL-quarter center (viewBox `VB_W/4, VB_H/4`) with
`QUADRANT_PAD = 0.8` (`AseanMap.vue`), so its bbox bottoms out around screen `y ≈ 360`
and its right edge sits near the vertical midline (`x ≈ 640`). The BL panel's top edge
(`~432`) clears the country's bottom (`~360`) by only ~70px, and its right edge (`~614`)
is ~26px shy of the midline.

This is **gotcha 2 (R9 / D2)** from the plan: *"No panel may overlap the TL-docked country
— re-click-to-deselect must keep working."* The clamps look correct on paper but the margin
is tight, and the plan explicitly deferred the exact TL safe-zone margin to a visual tune
(Open Question Q1: *"the precise pixel margin around the docked country … is a visual tune
at 1280×800"*). Wide/tall countries (e.g. Indonesia, which spans far enough to hit
`MAX_DOCK_ZOOM`) may dock larger and reduce the gap further.

This is recorded as a **verification-required** residual (mirrors
`todos/152-deferred-p2-brunei-label-visual-verification.md`), not a confirmed defect — the
code is plausibly correct but cannot be confirmed without a browser at 1280×800.

## Findings

- **Source:** `components/infographics/AseanInfographic.vue`,
  `.asean-infographic__panel` / `.asean-infographic__panel-bl` (lines ~435–454).
- **Evidence:** Computed geometry at 1280×800 leaves only a ~70px vertical gap and ~26px
  horizontal margin between the BL panel and the docked-country quarter; both are
  `pointer-events: auto` surfaces vs. the re-clickable country.
- **Impact:** If a country docks low/wide enough, the BL panel could overlap the country's
  hit area and intercept a re-click-to-deselect (R9 acceptance criterion 7). Worst case is a
  swallowed deselect click, not a crash.
- **Cannot auto-fix:** Resolution depends on visual inspection across countries at the canon
  stage; tuning clamps blindly risks regressing the intended quadrant framing.

## Proposed Solutions

### Option A: Verify in browser, then tune clamps if needed
- **Approach:** Run the embed + full-page mounts at 1280×800. For each wired country
  (especially the largest dock — Indonesia — and the lowest-sitting ones), confirm a
  re-click on the docked country deselects and that no panel overlays the country's fill.
  If overlap is found, nudge `.asean-infographic__panel` `bottom`/`width` or add a small
  right-edge inset to `__panel-bl` to keep it clear of the midline + country bottom.
- **Pros:** Confirms the actual gotcha the plan flagged; minimal, targeted CSS tweak only if
  a real overlap appears.
- **Cons:** Requires browser verification across countries.
- **Effort:** Small.
- **Risk:** Low.

### Option B: Defensively cap BL so it cannot reach the midline
- **Approach:** Reduce BL `width` (e.g. `min(44vw, 600px)`) or raise `min-height`/`bottom`
  so its top-right corner can never enter the TL quarter regardless of country.
- **Pros:** Removes the risk structurally without per-country checks.
- **Cons:** May leave the BL quarter looking emptier; should still be eyeballed.
- **Effort:** Small.
- **Risk:** Low.

## Recommended Action

Option A during the BF-71 browser-test step (plan Step 6 / R12): explicitly verify
re-click-to-deselect on the largest-docking country at 1280×800. Only adjust clamps if a
real overlap is observed.

## Resolution (2026-05-22) — defensive cap applied, visual verification still deferred

Applied **Option B as a low-risk defensive hedge** (not a substitute for the visual check):
in `components/infographics/AseanInfographic.vue`, `.asean-infographic__panel` `width` was
narrowed from `min(46vw, 620px)` to `min(44vw, 600px)`. Both BL and BR share this width and
are anchored to their respective outer edges (`left`/`right: clamp(16px, 2vw, 32px)`), so a
narrower width strictly pulls each panel's *inner* edge further from the vertical midline —
it can only widen the central safe zone around the TL-docked country, never shrink it. At
1280×800 the BL right edge moves from ~614 to ~594 (~46px clear of the 640 midline, up from
~26px). No other clamp touched; AseanMap `QUADRANT_PAD` / `frameStyle` untouched (R11).

This **does not close the todo** — the exact pixel margin around the docked country (plan
Q1) and re-click-to-deselect across all wired countries still require a browser at 1280×800.
Status is `deferred` to the BF-71 browser-test step, which now verifies against the capped
clamps. If the browser shows comfortable clearance, this can be marked resolved; if overlap
still appears for the largest dock (Indonesia), nudge `bottom`/`min-height` further.

Verified `npm run build` passes with the capped width.

## Technical Details

- **Affected files:** `components/infographics/AseanInfographic.vue`
- **Related:** `components/asean/AseanMap.vue` (`QUADRANT_PAD`, `frameStyle` — read-only;
  do NOT change per R11).

## Acceptance Criteria

- [x] At 1280×800 (full page), re-clicking the docked country deselects for every
      wired country, including the largest dock (Indonesia). Verified: Indonesia + Brunei
      re-click → idle intro returns, focused panels removed.
- [x] No focused panel (TR/BL/BR) visually overlays the docked country's fill. Verified:
      Indonesia hit-path bbox `{x:-2, y:94, right:566, bottom:303}` vs panels at `y≥432` —
      `overlapsBL/BR/TR` all `false`.
- [x] If clamps were tuned, the BL/BR quarters still read as filled, not empty. Verified
      in screenshots: BL stacked-area + BR tornado both fill their quarter.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-05-22 | Created from PR #45 code review (autofix mode) | BL clamps clear the TL quarter on paper at 1280×800 but with a tight ~70px/~26px margin; plan Q1 deferred the exact safe-zone margin to visual tuning — verification-required, not a confirmed defect |
| 2026-05-22 | Defensive width cap + deferred (todo-resolve) | Narrowed shared panel width 46vw/620px → 44vw/600px; both panels anchor to outer edges so this only widens the central safe zone (BL right edge ~614 → ~594, ~46px clear of midline). Cannot fabricate the pixel verification without a browser, so status stays `deferred` to the browser-test step which now checks the capped clamps; build passes |
| 2026-05-22 | Browser-verified at 1280×800 (lfg-tracked-2 Step 5) → resolved | Measured live: BL panel `x:[26,589]`, BR `x:[691,1254]` (both ~51px clear of the 640 midline). Largest dock Indonesia hit-path bbox `{y:94…303}` sits entirely above the panel band (`y≥432`), `overlapsBL/BR/TR` all false → no panel can intercept a deselect click. Re-click-to-deselect confirmed for Indonesia + Brunei (idle intro returns). Green-tab honest no-data state confirmed for Brunei (not blank). No console errors. Marked resolved |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/45
- Plan: docs/plans/2026-05-22-003-feat-asean-focused-quadrant-content-plan.md (R9, D2, Q1)
