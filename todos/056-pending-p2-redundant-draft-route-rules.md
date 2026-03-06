---
status: resolved
priority: p2
issue_id: "056"
tags: [code-review, nuxt, architecture, BF-84]
dependencies: []
---

# Redundant `routeRules` exclusion for draft infographics

## Problem Statement

In `nuxt.config.ts`, draft infographic routes are excluded via `routeRules` using `draftInfographics`. However, draft routes are already absent from the `prerender.routes` array (which only includes `publishedInfographics`). For a static site generated with `preset: 'static'`, routes not listed in `prerender.routes` are simply not generated. The `routeRules` exclusion is redundant and adds maintenance cost (an extra import, extra code, extra mental overhead).

## Findings

- **Source:** Architecture review of PR #17
- **Location:** `nuxt.config.ts:22-28` (routeRules block) and `data/infographics.ts:37-39` (draftInfographics export)
- **Evidence:** With `preset: 'static'`, Nuxt only generates HTML for routes explicitly listed in `prerender.routes` or discovered via `crawlLinks`. Since `crawlLinks` is not enabled and only `publishedInfographics` are in `prerender.routes`, draft routes are never generated regardless of `routeRules`.
- **Impact:** Extra code complexity. The `draftInfographics` import in `nuxt.config.ts` and the `Object.fromEntries(draftInfographics.flatMap(...))` block could be removed entirely.

## Proposed Solutions

### Option A: Remove redundant routeRules for drafts
Remove the `draftInfographics` import and the spread in `routeRules`. Keep only `'/test/**': { prerender: false }`.

- **Pros:** Simpler config, fewer imports, single mechanism for route exclusion
- **Cons:** If `crawlLinks` is ever enabled, draft routes could be discovered and prerendered
- **Effort:** Small
- **Risk:** Low (add a code comment noting the assumption)

### Option B: Keep as defensive measure
The belt-and-suspenders approach protects against future config changes that might enable `crawlLinks`.

- **Pros:** Defensive, future-proof
- **Cons:** Extra complexity for a hypothetical scenario
- **Effort:** None (already implemented)
- **Risk:** None

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

- **Affected files:** `nuxt.config.ts`, `data/infographics.ts`
- **Components:** Build configuration
- **Database changes:** None

## Acceptance Criteria

- [ ] Draft routes are not prerendered in static build output
- [ ] Config is clear about why draft routes are excluded

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created from PR #17 code review | Nuxt static preset only generates explicitly listed prerender routes |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/17
- Nuxt prerendering docs: https://nuxt.com/docs/getting-started/prerendering
