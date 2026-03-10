---
status: resolved
priority: p2
issue_id: "133"
tags: [code-review, performance, memory-leak, webgl]
dependencies: []
---

# FisheyeLens animation completes into destroyed canvas after rapid deselect

## Problem Statement

When `FisheyeLens.vue` is deselected, `animateOut()` runs a 200ms exit animation. However, the parent `StraitCircle.vue` uses `v-if="selected"` to conditionally render the component. If Vue unmounts the component before the 200ms animation completes, `onUnmounted` calls `cancelAnimation()` which is correct — but the `useFisheyeCanvas` composable's `onUnmounted` also fires, calling `cleanup()` which sets `gl = null`. Meanwhile, if the rAF callback fires between Vue scheduling the unmount and the microtask completing, `render()` will be called on a null `gl` context.

More importantly, the exit animation is effectively invisible because `v-if` removes the DOM element immediately when `selected` becomes false, so the 200ms ease-in exit never visually plays.

**Why it matters:** The exit animation code is dead weight — it runs but produces no visible effect. The component is removed from DOM before the animation can be seen.

## Findings

- **Location:** `components/straits/FisheyeLens.vue` lines 82-98 (`animateOut`), `components/straits/StraitCircle.vue` line 63 (`v-if="selected"`)
- **Evidence:** `v-if` tears down the component synchronously when `selected` goes false. The `animateOut` watcher fires, but the DOM node is already scheduled for removal. The 200ms animation renders to a canvas that is being destroyed.
- **Agent:** architecture-reviewer

## Proposed Solutions

### Option A: Switch to v-show for FisheyeLens
Use `v-show` instead of `v-if` so the canvas stays in DOM during exit animation. Add a `@transitionend` or timer-based cleanup to fully hide afterward.

- **Pros:** Exit animation becomes visible; no wasted rAF cycles
- **Cons:** Canvas and WebGL context persist in DOM when hidden; slightly more memory usage
- **Effort:** Small
- **Risk:** Low

### Option B: Remove exit animation entirely
Since the component is `v-if`'d away, remove `animateOut()` and the exit watcher branch. Simplify to entrance-only animation.

- **Pros:** Less code, no dead code path, no risk of render-after-destroy
- **Cons:** No smooth exit (abrupt disappearance)
- **Effort:** Small
- **Risk:** Low

### Option C: Emit "animation-done" event, let parent control lifecycle
FisheyeLens emits an event when exit animation completes. Parent delays `v-if` removal until after the event.

- **Pros:** Full animation lifecycle control; clean separation
- **Cons:** More complexity in parent; needs careful timeout fallback
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

_To be decided during triage._

## Technical Details

- **Affected files:** `components/straits/FisheyeLens.vue`, `components/straits/StraitCircle.vue`
- **Components:** FisheyeLens, StraitCircle

## Acceptance Criteria

- [ ] Exit animation either visibly plays or is removed as dead code
- [ ] No rAF callbacks fire after component unmount
- [ ] No console errors on rapid select/deselect

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-10 | Created | Code review finding from PR #33 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/33
