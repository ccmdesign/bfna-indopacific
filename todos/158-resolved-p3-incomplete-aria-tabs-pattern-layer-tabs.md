---
status: resolved
resolution: "Option B applied — layer control re-expressed as an aria-pressed toggle group"
priority: p3
issue_id: "158"
tags: [code-review, accessibility, BF-71]
dependencies: []
---

# Layer Tabs Use role="tab" Without aria-controls / Matching role="tabpanel"

## Problem Statement

In `components/infographics/AseanInfographic.vue`, the Trade / Green Transition layer tabs
declare the ARIA tabs pattern partially:

```html
<nav class="asean-infographic__tabs" role="tablist" aria-label="Active layer">
  <button type="button" role="tab" :aria-selected="layer === 'trade'" …>Trade</button>
  <button type="button" role="tab" :aria-selected="layer === 'green'" …>Green Transition</button>
</nav>
```

Each `role="tab"` lacks an `aria-controls` pointing at a `role="tabpanel"`, and the BL/BR
panels they drive (the `CardFlip`s) are not marked as `role="tabpanel"` with matching `id`s.
The WAI-ARIA Authoring Practices tabs pattern expects each tab to reference its panel via
`aria-controls`, and each panel to carry `role="tabpanel"` + `aria-labelledby`. As written,
a screen-reader user hears "Trade, tab, selected" but the tab is not programmatically tied to
the content it switches, and keyboard arrow-key navigation between tabs (also part of the
pattern) is not implemented.

**This markup is pre-existing in `dev`** (it lived behind the `SHOW_LEGACY_PANELS = false`
kill switch and was only re-homed by this PR — verified via `git show dev:…`). BF-71 did not
introduce the gap; it surfaced it by turning the panels on. Recording here because the BF-71
review brief explicitly calls out tabs role/aria.

## Findings

- **Source:** `components/infographics/AseanInfographic.vue`, `.asean-infographic__tabs`
  `<nav role="tablist">` and its two `role="tab"` buttons (lines ~99–120); the BL/BR panels
  (lines ~138–212) that are not `role="tabpanel"`.
- **Evidence:** No `aria-controls` on the tabs; no `role="tabpanel"` / `id` /
  `aria-labelledby` on the BL/BR panels; no roving-tabindex / arrow-key handling.
- **Impact:** Minor a11y gap. Tabs are operable (focusable buttons, `aria-selected`
  reflects state) but the tab↔panel relationship and arrow-key navigation expected by the
  tabs pattern are absent.
- **Pre-existing + not a regression:** carried over verbatim from the gated legacy markup.
- **Out of scope for safe-autofix:** completing the pattern means adding `id`s,
  `aria-controls`, `role="tabpanel"` to two panels, and ideally roving-tabindex key
  handling — a semantics change broader than a low-risk in-place fix, and it touches
  pre-existing markup this PR only moved.

## Proposed Solutions

### Option A: Complete the tabs pattern
- **Approach:** Give each `CardFlip` panel a stable `id` and `role="tabpanel"` +
  `aria-labelledby` pointing at its tab; add `aria-controls` + `id` on each tab; implement
  roving tabindex with Left/Right/Home/End arrow handling. Note the two panels (BL + BR)
  are driven by one `layer` state, so the single-tablist-to-two-panels mapping needs a
  deliberate `aria-controls` (space-separated id list) decision.
- **Pros:** Conforms to WAI-ARIA tabs; better SR + keyboard experience.
- **Cons:** Non-trivial; one tablist controlling two panels is slightly off the canonical
  one-tab-one-panel model and needs care.
- **Effort:** Small–Medium.
- **Risk:** Low.

### Option B: Demote to a simple toggle group
- **Approach:** Drop `role="tablist"`/`role="tab"` and present as a labelled toggle
  (e.g. `aria-pressed` on two buttons in a labelled group). Avoids the unmet tabs-pattern
  obligations entirely.
- **Pros:** Honest to what the control actually is (a layer toggle, not document tabs);
  fewer unmet ARIA expectations.
- **Cons:** Changes the existing role semantics.
- **Effort:** Small.
- **Risk:** Low.

## Recommended Action

Option B is arguably the better fit (it's a layer toggle, not a tab/tabpanel relationship),
but either is fine.

## Resolution (2026-05-22)

**Applied Option B** in `components/infographics/AseanInfographic.vue`. The layer control
genuinely is a single-state toggle (one `layer` ref drives both bottom panels in unison),
not a tab/tabpanel relationship, so re-expressing it as a labelled `aria-pressed` toggle
group is the honest, idiomatic fix and avoids the unmet tabs-pattern obligations
(`aria-controls`, matching `role="tabpanel"` panels, roving arrow-key navigation):

- `<nav role="tablist">` → `<div role="group">` (kept `aria-label="Active layer"`).
- Each button: dropped `role="tab"` + `:aria-selected`, added `:aria-pressed` reflecting
  the active `layer`. (`type="button"` retained.)
- No CSS / no visual change to the tab chrome — the `.asean-infographic__tabs` /
  `.asean-infographic__tab` styles and `is-active` class are untouched.

Verified `npm run build` passes. Acceptance criteria met:
- [x] Control re-expressed as a labelled `aria-pressed` toggle group.
- [x] `aria-pressed` continues to reflect the active `layer`.
- [x] No visual change to the tab chrome.

## Technical Details

- **Affected files:** `components/infographics/AseanInfographic.vue`

## Acceptance Criteria

- [ ] Either: tabs reference their panel(s) via `aria-controls`, panels carry
      `role="tabpanel"` + `aria-labelledby`, and arrow-key navigation works; OR the control
      is re-expressed as a labelled `aria-pressed` toggle group.
- [ ] `aria-selected` (or `aria-pressed`) continues to reflect the active `layer`.
- [ ] No visual change to the tab chrome.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-05-22 | Created from PR #45 code review (autofix mode) | Tabs ARIA pattern is incomplete (no aria-controls / tabpanel / arrow-keys); confirmed pre-existing in dev via `git show dev:…`, only re-homed by BF-71 — not a regression, out of scope for safe-autofix |
| 2026-05-22 | Resolved via Option B (todo-resolve) | Re-expressed the layer control as an `aria-pressed` toggle group (`role="group"` + `aria-pressed`) rather than completing the tabs pattern — it's a single-state layer toggle, not document tabs, so this is the honest fit and a low-risk in-place change with no visual delta; build passes |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/45
- Plan: docs/plans/2026-05-22-003-feat-asean-focused-quadrant-content-plan.md (R2, R5)
- WAI-ARIA Authoring Practices — Tabs pattern
