---
status: resolved
priority: p3
issue_id: "020"
tags: [code-review, architecture, quality, nuxt, BF-72]
dependencies: []
---

# `useStraitsHead` Shallow Spread Does Not Deep-Merge `meta` Arrays

## Problem Statement

In `composables/useStraitsHead.ts`, the `useHead` call uses object spread (`{...base, ...overrides}`) to merge base and override configurations. While the `link` array is manually concatenated (`[...base.link, ...overrides.link]`), the `meta` array is not. If `base` ever defines a `meta` array (e.g., Open Graph tags), passing `overrides` with a `meta` array (as the embed page does for `noindex`) would silently clobber the base meta tags instead of merging them.

**Why it matters:** Currently `base` has no `meta` property, so the embed page's `noindex` override works correctly. However, this is a latent bug -- the plan document explicitly recommends adding Open Graph / social sharing meta tags to the head composable, which would trigger this issue.

## Findings

- **Location:** `composables/useStraitsHead.ts` lines 23-27
- **Evidence:** `useHead({ ...base, ...overrides, link: [...base.link, ...overrides.link] })` -- note `meta` is not explicitly merged like `link` is
- **Agent:** architecture-strategist
- **Impact:** Low currently, but would become P2 if/when OG meta tags are added to the base config

## Proposed Solutions

### Option 1: Add explicit `meta` array merging (same pattern as `link`)
- Add `meta: [...(base.meta || []), ...((overrides.meta as any[]) || [])]` to the `useHead` call.
- **Pros:** Prevents future clobber bug; consistent with link array handling
- **Cons:** Slightly more verbose; solves a problem that doesn't exist yet
- **Effort:** Trivial
- **Risk:** None

### Option 2: Use a deep merge utility
- Use a utility like `defu` (already a Nuxt dependency) to deep-merge base and overrides.
- **Pros:** Handles all nested properties automatically; more robust
- **Cons:** Adds a dependency awareness; may merge things unexpectedly
- **Effort:** Small
- **Risk:** Low

### Option 3: Leave as-is with a code comment
- Add a comment noting that `meta` is not merged and must be handled if base meta is added.
- **Pros:** No code change; documents the limitation
- **Cons:** Relies on developer discipline
- **Effort:** Trivial
- **Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `composables/useStraitsHead.ts` (same pattern exists in `composables/useRenewablesHead.ts`)
- **Components:** Head composable merge logic
- **Database changes:** None

## Acceptance Criteria

- [ ] Adding a `meta` array to the base config does not clobber page-level meta overrides
- [ ] The embed page's `noindex, nofollow` tag is preserved regardless of base meta configuration
- [ ] Same fix applied to `useRenewablesHead.ts` if applicable

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #10 code review | Shallow spread merge pattern works for current usage but would break when base meta tags are added |

## Resources

- **PR:** https://github.com/ccmdesign/bfna-indopacific/pull/10
- **Files:** `composables/useStraitsHead.ts`, `composables/useRenewablesHead.ts`
- **Nuxt docs:** https://nuxt.com/docs/api/composables/use-head
