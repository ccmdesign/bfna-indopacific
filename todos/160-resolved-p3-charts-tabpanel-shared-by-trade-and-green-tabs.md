---
status: pending
priority: p3
issue_id: "160"
tags: [code-review, accessibility, wai-aria, BF-72]
dependencies: []
---

# Trade and Green Tabs Share One `role="tabpanel"` (Shared-Panel APG Variation)

## Problem Statement

In `components/infographics/AseanInfographic.vue` the three tabs map to two tabpanels:

- `description` tab → `aria-controls="asean-tabpanel-description"`
- `trade` tab and `green` tab → both `aria-controls="asean-tabpanel-charts"`

The charts `<section role="tabpanel">` carries:

```html
<section
  v-show="tab === 'trade' || tab === 'green'"
  id="asean-tabpanel-charts"
  role="tabpanel"
  :aria-labelledby="`asean-tab-${tab === 'green' ? 'green' : 'trade'}`"
  ...
>
```

Two tabs controlling a single tabpanel is a recognized **shared-panel** variation of the
WAI-ARIA APG Tabs pattern (the canonical model is one tab ↔ one panel). It is operable and
not wrong, but it is worth a deliberate note.

A secondary detail: `aria-labelledby` evaluates to `asean-tab-trade` whenever
`tab !== 'green'` — including when `tab === 'description'`, at which point the charts panel is
`display:none` (so the stale `trade` association is not exposed to AT). Harmless, but the
ternary technically labels the hidden panel by the `trade` tab even on the Description tab.

## Findings

- **Source:** `components/infographics/AseanInfographic.vue` charts `<section role="tabpanel">` (around line 311–316) and the tab `aria-controls` binding (around line 265).
- **Impact:** Minor. The pattern is operable and conveys selection state correctly. Strict
  one-tab-one-panel conformance would split Trade and Green into two panels, but the two views
  are the same two CardFlips flipped in unison, so a shared panel is a defensible design.
- **Severity:** P3, advisory.

## Proposed Solutions

### Option A: Keep the shared panel, document it
- Add a comment that Trade + Green deliberately share `asean-tabpanel-charts` (same content,
  flipped), so the shared-panel variation is intentional. Optionally compute `aria-labelledby`
  only for `trade`/`green` (guard the ternary so it is not set while `description` is active).
- **Effort:** Trivial. **Risk:** None.

### Option B: Split into two tabpanels
- Give Trade and Green separate `role="tabpanel"` ids and `aria-controls`, each rendering the
  CardFlips at the appropriate `:flipped` state.
- **Pros:** Strict APG one-tab-one-panel. **Cons:** Duplicates the panel markup for what is one
  flipping surface; more code for marginal AT benefit.
- **Effort:** Small. **Risk:** Low.

## Recommended Action

Option A — the shared panel is a reasonable fit for "same two cards, flipped." Document the
intent; optionally tighten the `aria-labelledby` ternary so it is not set on the Description tab.

## Technical Details

- **Affected files:** `components/infographics/AseanInfographic.vue`

## Acceptance Criteria

- [ ] The Trade/Green shared-tabpanel decision is documented (or split per Option B).
- [ ] `aria-labelledby` on the charts panel reflects only the active chart tab.
- [ ] `npm run build` passes.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-05-22 | Created from PR #46 code review (autofix mode) | Two tabs share one tabpanel (shared-panel APG variation); operable and defensible since both render the same CardFlips flipped. Advisory only. |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/46
- Plan: docs/plans/2026-05-22-004-feat-asean-country-switch-transition-plan.md (R2, R3)
- WAI-ARIA Authoring Practices — Tabs pattern
- Run artifact: /tmp/compound-engineering/ce-code-review/20260522-173335-61abe09e/
