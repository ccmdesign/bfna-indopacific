---
status: resolved
priority: p1
issue_id: "082"
tags: [code-review, regression, BF-96]
dependencies: []
---

# `useStraitsHead` Signature Change Breaks Embed Page

## Problem Statement

The `useStraitsHead` composable signature was changed from `(overrides?)` to `(straitName?, overrides?)` in this PR, but the existing embed page (`pages/embed/straits.vue`) was NOT updated. The embed page calls:

```ts
useStraitsHead({
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
```

After the signature change, this object is interpreted as the `straitName` parameter (first positional argument), not `overrides` (second). As a result:
- The `noindex, nofollow` meta tag is silently dropped from the embed page.
- The embed page becomes indexable by search engines, which is undesirable for iframe-only content.
- `toRef()` receives an object instead of a string, which may cause a runtime warning or unexpected title output like `[object Object]`.

## Findings

- **Agent:** architecture-reviewer, security-reviewer
- **Evidence:** `composables/useStraitsHead.ts` line 15 -- new signature: `(straitName?, overrides?)`
- **Location:** `pages/embed/straits.vue` line 7 -- calls `useStraitsHead({ meta: [...] })` with old single-arg pattern
- **Severity:** P1 -- regression that silently breaks SEO protection on embed pages

## Proposed Solutions

### Option 1: Update the embed page call site (Recommended)
Pass `undefined` as the first argument and the overrides object as the second:

```ts
useStraitsHead(undefined, {
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
```

- **Pros:** Minimal change, preserves the new API
- **Cons:** Slightly awkward `undefined` first arg
- **Effort:** Small
- **Risk:** Low

### Option 2: Use an options object pattern instead of positional args
Refactor `useStraitsHead` to accept a single options object:

```ts
useStraitsHead({ straitName, meta: [...] })
```

- **Pros:** Cleaner API, no positional ambiguity
- **Cons:** Requires updating all call sites
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

Option 1 -- quick fix in `pages/embed/straits.vue`.

## Technical Details

- **Affected files:** `pages/embed/straits.vue`, `composables/useStraitsHead.ts`
- **Components:** useStraitsHead composable, embed page
- **Database changes:** None

## Acceptance Criteria

- [ ] Embed page at `/embed/straits` includes `<meta name="robots" content="noindex, nofollow">` in rendered HTML
- [ ] Page title on embed remains "Indo-Pacific Straits" (not `[object Object]`)
- [ ] `nuxt build` succeeds without type errors
- [ ] Infographic page dynamic title still works when selecting a strait

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Identified during PR #22 code review | Positional arg changes require auditing all call sites |
| 2026-03-07 | Resolved (Option 1): updated embed page to pass `undefined` as first arg | Quick fix preserves new API |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/22
- File: `composables/useStraitsHead.ts`
- File: `pages/embed/straits.vue`
