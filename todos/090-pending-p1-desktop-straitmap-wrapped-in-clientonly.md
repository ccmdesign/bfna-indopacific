---
status: resolved
priority: p1
issue_id: "090"
tags: [code-review, architecture, seo, ssr, BF-89]
dependencies: []
---

# Desktop StraitMap Wrapped in ClientOnly Breaks SSR and SEO

## Problem Statement

The `[[id]].vue` page now wraps the entire content (including the desktop `<StraitMap>`) in `<ClientOnly>`. This means on desktop viewports, the entire page renders as an empty `<div class="strait-loading-skeleton" />` during SSR. All content — the SVG map, strait names, data — is invisible to search engine crawlers and produces a flash of empty content on initial page load.

Previously, `<StraitMap>` was rendered server-side. This change regresses SSR rendering for desktop users (the primary audience) to accommodate the mobile viewport check.

## Findings

- **Agent:** architecture-strategist, seo-reviewer
- **Evidence:** `pages/infographics/straits/[[id]].vue` lines 58-95 — entire template wrapped in `<ClientOnly>`
- **Impact:** No SSR content for desktop users; SEO regression; loading skeleton flash

## Proposed Solutions

### Option 1: Move ClientOnly to mobile branch only
Render `<StraitMap>` outside `<ClientOnly>` as the default SSR path. Only wrap the mobile components in `<ClientOnly>`:

```vue
<StraitMap v-if="!isMobile" ... />
<ClientOnly v-else>
  <StraitCardList v-if="!straitId" ... />
  <StraitMobileDetail v-else-if="selectedStrait" ... />
</ClientOnly>
```

- **Pros:** Restores SSR for desktop, minimal change
- **Cons:** `isMobile` defaults to `false` during SSR, so StraitMap renders — this is correct behavior
- **Effort:** Small
- **Risk:** Low

### Option 2: Use CSS-based responsive rendering
Use CSS `display: none` at the media query breakpoint instead of `v-if`, rendering both paths and hiding one via CSS.

- **Pros:** Full SSR for both, no hydration mismatch risk
- **Cons:** Both components mount (heavier initial load), need careful cleanup
- **Effort:** Medium
- **Risk:** Medium

## Recommended Action

Option 1 — since `useViewport` defaults `isMobile` to `false` during SSR, `<StraitMap>` will render server-side. The mobile branch only needs `<ClientOnly>` because it depends on client-side viewport detection.

## Technical Details

- **Affected files:** `pages/infographics/straits/[[id]].vue`

## Acceptance Criteria

- [ ] Desktop `<StraitMap>` renders during SSR (view page source shows SVG content)
- [ ] Mobile components still render correctly via `<ClientOnly>`
- [ ] No hydration mismatch warnings in console

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-09 | Created | Found during PR #26 code review |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/26
