---
status: pending
priority: p2
issue_id: "063"
tags: [code-review, quality, webgl, race-condition]
dependencies: []
---

# Texture May Be Null on First Lens Render

## Problem Statement

In `StraitLensZoom.vue`, the shader uniform `uMap` starts as `null` (line 59) and is only populated after the texture loads asynchronously via `useLoader` (lines 65-73). If the user clicks a strait before the texture finishes loading, the shader will sample from a null texture, which in WebGL typically renders as black or transparent.

The `watch(texture, ...)` on line 67 sets the uniform after load, but there is no visual indication to the user that loading is in progress, and no guard preventing the lens from opening before the texture is ready.

## Findings

- **Agent:** quality-reviewer
- **Location:** `components/StraitLensZoom.vue:59, 65-73`
- **Evidence:** `uMap: { value: null as Texture | null }` -- shader renders with null texture until async load completes
- **Impact:** Brief black flash in lens circle if texture hasn't loaded yet (especially on slow connections or first visit)

## Proposed Solutions

### Option A: Loading State with Spinner (Recommended)

Track `isLoading` from `useLoader` and show a loading indicator until the texture is ready. Only render TresCanvas when texture is available.

```ts
const { state: texture, isLoading } = useLoader(TextureLoader, '...')
```

- **Pros:** Clean UX, no black flash
- **Cons:** Slight delay before lens content appears
- **Effort:** Small
- **Risk:** Low

### Option B: Preload Texture at Page Level

Start loading the texture when the straits page mounts (before any circle is clicked), so it is likely cached by the time a user clicks.

- **Pros:** Eliminates perceived delay, no UX change
- **Cons:** Loads ~1.3MB texture even if user never clicks a circle
- **Effort:** Small
- **Risk:** Low (bandwidth concern for mobile)

## Recommended Action

_(To be filled during triage)_

## Technical Details

- **Affected files:** `components/StraitLensZoom.vue`
- **Texture file:** `public/assets/map-indo-pacific-2x.webp` (1.3MB)

## Acceptance Criteria

- [ ] No black flash when lens opens on first click
- [ ] Loading state is visually communicated to the user

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #18 review | Async texture loading race |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/18
