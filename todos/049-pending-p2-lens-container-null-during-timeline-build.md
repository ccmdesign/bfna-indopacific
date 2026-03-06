---
status: pending
priority: p2
issue_id: "049"
tags: [code-review, reliability, animation, BF-77]
dependencies: []
---

# lensContainer may be null when GSAP timeline targets it

## Problem Statement

In `StraitsInfographic.vue`, the watch on `selectedStrait` uses `flush: 'post'` to ensure the `StraitLens` component is mounted before calling `open()`. However, the `lensContainer` computed depends on `lensRef.value?.backdropRef`, which requires both:

1. Vue to mount the `StraitLens` component (`v-if` becomes true)
2. Vue to populate the template ref (`lensRef`)
3. `StraitLens`'s `onMounted` to run and the `backdropRef` to be exposed

The `<Teleport to="body">` adds an additional layer of indirection. If the Teleport target resolution is deferred (e.g., SSR hydration edge cases), `targets.lensContainer.value` could be `null` when the GSAP timeline reaches Step 3 (line 135-142 of `useStraitTransition.ts`). The code already guards with `if (targets.lensContainer.value)`, so it won't crash, but the lens will not animate in -- it will remain at opacity 0.

## Findings

- **Source:** `useStraitTransition.ts:135-142`, `StraitsInfographic.vue:57-71`
- **Agent:** architecture-strategist
- **Evidence:** The `if` guard on line 135 silently skips the lens fade-in animation if lensContainer is null. Combined with `flush: 'post'`, this works in most cases but is fragile.

## Proposed Solutions

### Option A: Add a nextTick or requestAnimationFrame before calling open
- **Pros:** Ensures DOM is fully settled including Teleport
- **Cons:** Adds slight delay
- **Effort:** Small
- **Risk:** Low

```ts
watch(selectedStrait, async (newStrait) => {
  if (newStrait) {
    await nextTick()
    const mapped = straitMapRef.value?.mappedStraits?.find(...)
    if (mapped) open(newStrait.id, { cx: mapped.cx, cy: mapped.cy })
  }
}, { flush: 'post' })
```

### Option B: Make the timeline build lazy — add lens animation after lens mounts
- **Pros:** Guaranteed correct timing
- **Cons:** More complex architecture
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

*(To be filled during triage)*

## Technical Details

- **Affected files:** `composables/useStraitTransition.ts`, `components/infographics/StraitsInfographic.vue`
- **Affected components:** useStraitTransition, StraitsInfographic

## Acceptance Criteria

- [ ] Lens fade-in animation plays reliably on first click
- [ ] No silent failure where lens stays at opacity 0
- [ ] Works correctly with Teleport in both CSR and SSR/hydration

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #16 review | Teleport + flush:post timing can be fragile |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/16
- Vue Teleport docs: https://vuejs.org/guide/built-ins/teleport
