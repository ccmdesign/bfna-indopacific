---
status: pending
priority: p2
issue_id: "061"
tags: [code-review, performance, gsap, memory-leak]
dependencies: []
---

# GSAP Context Overwrite Causes Orphaned Animations

## Problem Statement

In `StraitLensZoom.vue`, the `ctx` variable is shared between the open animation (line 151) and the close animation (line 105). When `close()` is called, it reassigns `ctx` to a new `gsap.context()`:

```ts
// onMounted -- open animation
ctx = gsap.context(() => { /* open timeline */ })

// close() -- close animation
ctx = gsap.context(() => { /* close timeline */ })
```

This overwrites the reference to the open animation context. When `onUnmounted` calls `ctx?.revert()`, it only reverts the close context, leaving the open animation's inline styles and timelines orphaned. While the open animation is likely complete by the time close runs, rapid open/close sequences (e.g., double-click) could leak GSAP tweens.

## Findings

- **Agent:** performance-reviewer
- **Location:** `components/StraitLensZoom.vue:92-115, 151-164, 173-175`
- **Evidence:** `ctx` is reassigned in `close()`, discarding the open animation context reference
- **Impact:** Potential memory leak with orphaned GSAP timelines on rapid interaction

## Proposed Solutions

### Option A: Single GSAP Context for Component Lifetime (Recommended)

Create one `gsap.context()` in `onMounted` and use it for both open and close animations:

```ts
onMounted(() => {
  ctx = gsap.context(() => {})  // empty scope
  // open animation within ctx
  ctx.add(() => { /* open timeline */ })
})

function close() {
  ctx.add(() => { /* close timeline */ })
}
```

- **Pros:** Single context tracks all animations, `ctx.revert()` cleans up everything
- **Cons:** Slightly different GSAP pattern
- **Effort:** Small
- **Risk:** Low

### Option B: Revert Before Reassigning

```ts
function close() {
  ctx?.revert()  // clean up open animation first
  ctx = gsap.context(() => { /* close timeline */ })
}
```

- **Pros:** Simple, explicit cleanup
- **Cons:** Reverts open animation styles mid-component lifecycle (could cause visual flash)
- **Effort:** Small
- **Risk:** Medium (visual artifact possible)

## Recommended Action

_(To be filled during triage)_

## Technical Details

- **Affected files:** `components/StraitLensZoom.vue`

## Acceptance Criteria

- [ ] All GSAP animations are cleaned up on unmount (no console warnings)
- [ ] Rapid open/close does not leak timelines
- [ ] No visual artifacts during close animation

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #18 review | GSAP context lifecycle pattern |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/18
- GSAP Context docs: https://gsap.com/docs/v3/GSAP/gsap.context()
