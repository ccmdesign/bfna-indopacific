---
status: resolved
priority: p2
issue_id: "135"
tags: [code-review, architecture, quality]
dependencies: []
---

# useFisheyeCanvas has 7 positional parameters — needs options object

## Problem Statement

`useFisheyeCanvas` now accepts 7 positional parameters (canvasRef, imageUrl, distortion, aberration, strength, specular, vignette), with a TODO comment acknowledging this: `// TODO: Refactor to options object when touching existing call sites`. This makes call sites fragile — swapping two numeric refs is a silent bug with no type error.

**Why it matters:** Positional parameter lists beyond 3-4 args are a known maintenance hazard. Since this PR adds 3 new parameters to an existing composable, now is the right time to refactor to an options object.

## Findings

- **Location:** `composables/useFisheyeCanvas.ts` line 174-181
- **Evidence:** The function signature is `useFisheyeCanvas(canvasRef, imageUrl, distortion, aberration, strength, specular?, vignette?)`. The TODO at line 181 confirms the author recognizes this.
- **Agent:** quality-reviewer

## Proposed Solutions

### Option A: Refactor to options object now
```ts
interface FisheyeOptions {
  canvasRef: Ref<HTMLCanvasElement | null>
  imageUrl: Ref<string | undefined>
  distortion: Ref<number>
  aberration: Ref<number>
  strength: Ref<number>
  specular?: Ref<number>
  vignette?: Ref<number>
}
```

- **Pros:** Type-safe, self-documenting call sites, prevents parameter swap bugs
- **Cons:** Slightly more verbose at call site
- **Effort:** Small
- **Risk:** Low

### Option B: Defer (accept TODO)
Leave as-is and address in a follow-up PR.

- **Pros:** Smaller PR scope
- **Cons:** Technical debt accumulates; risk of silent bugs
- **Effort:** None
- **Risk:** Low (short term)

## Recommended Action

_To be decided during triage._

## Technical Details

- **Affected files:** `composables/useFisheyeCanvas.ts`, `components/straits/FisheyeLens.vue`

## Acceptance Criteria

- [ ] Composable uses named options object
- [ ] Call site in FisheyeLens.vue updated
- [ ] No functional regression

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-10 | Created | Code review finding from PR #33 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/33
