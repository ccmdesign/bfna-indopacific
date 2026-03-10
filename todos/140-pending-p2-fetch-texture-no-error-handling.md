---
status: pending
priority: p2
issue_id: "140"
tags: [code-review, reliability, error-handling]
dependencies: []
---

# Texture fetch silently swallows network errors with no retry or fallback signal

## Problem Statement

In `useFisheyeCanvas.ts`, the `loadTexture` function uses `fetch(url).then(...).catch(() => {})` to load the satellite image. Network failures (offline, 404, CORS) are silently swallowed. The comment says "the CSS circle is still visible underneath," but the parent `StraitCircle.vue` relies on `webglReady` to toggle between the WebGL canvas and the `<img>` fallback. If the texture fails to load, `webglReady` is still `true` (WebGL initialized fine), so the `<img>` fallback is hidden via `strait-bg-image--hidden`, resulting in a blank/transparent circle.

**Why it matters:** On texture load failure, the user sees an empty circle with no satellite imagery — neither the WebGL lens (no texture) nor the CSS fallback image (hidden because WebGL is "available").

## Findings

- **Location:** `composables/useFisheyeCanvas.ts` lines 226-243 (loadTexture catch block)
- **Evidence:** `.catch(() => {})` silently discards errors. The `webglAvailable` ref remains `true`. In `StraitCircle.vue`, the class `strait-bg-image--hidden` is applied when `webglReady && !prefersReducedMotion`, hiding the fallback `<img>`.
- **Agent:** reliability-reviewer

## Proposed Solutions

### Option A: Emit a texture-load-failed signal
Add a `textureLoaded` ref or emit from the composable. FisheyeLens forwards it to StraitCircle, which shows the `<img>` fallback if texture fails.

- **Pros:** Graceful degradation; user always sees satellite imagery
- **Cons:** Slightly more state management
- **Effort:** Small
- **Risk:** Low

### Option B: Show fallback <img> until texture is confirmed loaded
Default to showing the `<img>` fallback. Only hide it after the first successful `render()` with texture.

- **Pros:** Progressive enhancement pattern; always shows something
- **Cons:** Brief flash of non-distorted image before lens kicks in
- **Effort:** Small
- **Risk:** Low

## Recommended Action

_To be decided during triage._

## Technical Details

- **Affected files:** `composables/useFisheyeCanvas.ts`, `components/straits/FisheyeLens.vue`, `components/straits/StraitCircle.vue`

## Acceptance Criteria

- [ ] Satellite image is always visible (either via WebGL lens or <img> fallback)
- [ ] Network failure during texture load does not result in blank circle
- [ ] Successful texture load hides the fallback correctly

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-10 | Created | Code review finding from PR #33 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/33
