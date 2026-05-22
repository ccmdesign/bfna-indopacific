---
status: pending
priority: p2
issue_id: "157"
tags: [code-review, visual-verification, BF-71]
dependencies: []
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

## Technical Details

- **Affected files:** `components/infographics/AseanInfographic.vue`
- **Related:** `components/asean/AseanMap.vue` (`QUADRANT_PAD`, `frameStyle` — read-only;
  do NOT change per R11).

## Acceptance Criteria

- [ ] At 1280×800 (embed + full page), re-clicking the docked country deselects for every
      wired country, including the largest dock (Indonesia).
- [ ] No focused panel (TR/BL/BR) visually overlays the docked country's fill.
- [ ] If clamps were tuned, the BL/BR quarters still read as filled, not empty.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-05-22 | Created from PR #45 code review (autofix mode) | BL clamps clear the TL quarter on paper at 1280×800 but with a tight ~70px/~26px margin; plan Q1 deferred the exact safe-zone margin to visual tuning — verification-required, not a confirmed defect |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/45
- Plan: docs/plans/2026-05-22-003-feat-asean-focused-quadrant-content-plan.md (R9, D2, Q1)
