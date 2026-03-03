---
status: pending
priority: p2
issue_id: "018"
tags: [code-review, performance, quality, nuxt, BF-72]
dependencies: []
---

# Inter Font Loaded by `useStraitsHead` but Placeholder Uses Encode Sans

## Problem Statement

The `useStraitsHead.ts` composable loads the Inter font family via a Google Fonts stylesheet link (`Inter:wght@300;400;600;700`), but the `StraitsInfographic.vue` placeholder component's CSS uses `font-family: 'Encode Sans', sans-serif` for its title. This means every visit to `/infographics/straits` or `/embed/straits` triggers a network request to download the Inter font, which is never rendered on screen.

**Why it matters:** Loading an unused font (4 weights of Inter) adds ~80-120KB of unnecessary network transfer and introduces a render-blocking or FOIT/FOUT delay on the straits pages. This is a wasted resource request that affects page load performance, particularly on mobile connections.

## Findings

- **Location:** `composables/useStraitsHead.ts` lines 14-19 (loads Inter), `components/infographics/StraitsInfographic.vue` line 28 (uses Encode Sans)
- **Evidence:** The composable loads `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap` but the only font-family declaration in the placeholder is `'Encode Sans', sans-serif`
- **Agent:** performance-oracle, code-simplicity-reviewer
- **Impact:** Medium -- unnecessary network request on every page load; Encode Sans is already loaded globally via `nuxt.config.ts`

## Proposed Solutions

### Option 1: Remove Inter font loading from `useStraitsHead` until the real component needs it
- Remove the `link` array from `useStraitsHead.ts` base configuration. Add it back when the real `StraitsInfographic` component is built (if it uses Inter).
- **Pros:** Eliminates wasted network request; cleaner placeholder experience
- **Cons:** Will need to re-add when real component is built; risk of forgetting to add it back
- **Effort:** Trivial
- **Risk:** Low

### Option 2: Change the placeholder font-family to Inter
- Update `StraitsInfographic.vue` placeholder CSS to use Inter instead of Encode Sans, matching the loaded font.
- **Pros:** The loaded font is actually used; consistent with composable intent
- **Cons:** Encode Sans is the global site font (set in `public/styles.css`); using Inter for the placeholder may look visually inconsistent with site chrome
- **Effort:** Trivial
- **Risk:** Low

### Option 3: Accept as intentional future-proofing
- The composable was written to match the `useRenewablesHead` pattern, which also loads Inter. Keep it consistent and accept the minor performance cost.
- **Pros:** Pattern consistency; no code change needed
- **Cons:** Wasted network request until real component is built
- **Effort:** None
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `composables/useStraitsHead.ts`, `components/infographics/StraitsInfographic.vue`
- **Components:** Head composable, placeholder component
- **Database changes:** None

## Acceptance Criteria

- [ ] The Inter font is either used by the placeholder or not loaded until needed
- [ ] No visual regressions on straits pages
- [ ] Page load performance is not degraded by unused font downloads

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #10 code review | Font mismatch between composable (loads Inter) and placeholder component (uses Encode Sans) |

## Resources

- **PR:** https://github.com/ccmdesign/bfna-indopacific/pull/10
- **Files:** `composables/useStraitsHead.ts`, `components/infographics/StraitsInfographic.vue`
