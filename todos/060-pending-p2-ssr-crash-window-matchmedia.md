---
status: pending
priority: p2
issue_id: "060"
tags: [code-review, ssr, nuxt, quality]
dependencies: []
---

# SSR Crash: window.matchMedia Called at Module Scope

## Problem Statement

In `StraitLensZoom.vue` (lines 86-89), `window.matchMedia` is evaluated at module scope during the `<script setup>` block:

```ts
const prefersReducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
```

While there is a `typeof window !== 'undefined'` guard, this code runs during SSR/SSG when Nuxt pre-renders the page. The guard prevents a crash, but it means `prefersReducedMotion` is always `false` during SSR and never re-evaluated on the client. For this component, this happens to work because TresCanvas is client-only and the component is behind `v-if`, but this is fragile -- if Nuxt's hydration strategy changes or the component is used in a different context, the guard may not be sufficient.

The idiomatic Nuxt pattern is to use `useNuxtApp().isHydrating` or wrap in `onMounted`.

## Findings

- **Agent:** quality-reviewer
- **Location:** `components/StraitLensZoom.vue:86-89`
- **Evidence:** `typeof window !== 'undefined'` is a code smell in Nuxt apps; the idiomatic approach is `import.meta.client` or `onMounted`
- **Impact:** Currently safe due to `v-if` gating, but fragile if component usage changes

## Proposed Solutions

### Option A: Move to `onMounted` (Recommended)

Compute `prefersReducedMotion` inside `onMounted` where `window` is guaranteed available.

- **Pros:** Idiomatic, SSR-safe, no guard needed
- **Cons:** Must use a `ref` instead of a `const`
- **Effort:** Small
- **Risk:** Low

### Option B: Use `import.meta.client`

```ts
const prefersReducedMotion = import.meta.client
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false
```

- **Pros:** One-line fix, Nuxt-idiomatic
- **Cons:** Still evaluated at setup time, not reactive to media query changes
- **Effort:** Small
- **Risk:** Low

## Recommended Action

_(To be filled during triage)_

## Technical Details

- **Affected files:** `components/StraitLensZoom.vue`
- **Components:** StraitLensZoom

## Acceptance Criteria

- [ ] `prefersReducedMotion` is not evaluated during SSR
- [ ] `nuxt generate` succeeds without warnings
- [ ] Reduced motion preference is respected on the client

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #18 review | SSR guard pattern identified |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/18
- Nuxt SSR docs: https://nuxt.com/docs/guide/concepts/rendering
