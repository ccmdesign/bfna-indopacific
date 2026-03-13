---
status: pending
priority: p2
issue_id: "BF-111"
tags: [code-review, reliability, iframe]
dependencies: []
---

# iframe load event fires for about:blank, resetting error state

## Problem Statement

In `MarineTrafficEmbed.vue`, the `onBeforeUnmount` hook sets `iframeRef.value.src = 'about:blank'` to abort in-flight requests. This triggers the iframe's `@load` event, which calls `onIframeLoad()`, setting `loaded = true` and `errored = false`. If the component is being reused (strait switch via watch), this can create a brief incorrect state where `loaded` is true for the new strait before the actual content loads.

## Findings

- `onBeforeUnmount` (line 40-44) sets `src = 'about:blank'`
- `onIframeLoad` (line 17-21) sets `loaded = true` unconditionally
- The `watch` on `straitId` (line 31-35) resets `loaded = false`, but the `about:blank` load event fires asynchronously and may race with the watch reset.
- In practice, since `onBeforeUnmount` runs before the component is destroyed and the watch runs on the new instance, this is primarily a concern for the rapid-switch case where Vue reuses the component.

## Proposed Solutions

### Option 1: Guard onIframeLoad against about:blank

**Approach:** Check the iframe's current src before marking as loaded:

```ts
function onIframeLoad() {
  if (iframeRef.value?.src === 'about:blank') return
  loaded.value = true
  errored.value = false
  if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null }
}
```

**Pros:**
- Directly addresses the root cause

**Cons:**
- `iframeRef.value.src` may be the fully resolved URL, need to check for both

**Effort:** 15 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `components/straits/MarineTrafficEmbed.vue:17-21, 40-44`

## Resources

- **PR:** #35

## Acceptance Criteria

- [ ] Rapidly switching straits does not flash "loaded" state incorrectly
- [ ] Normal load still triggers fade-in correctly

## Work Log

### 2026-03-12 - Code Review Discovery

**By:** Claude Code (ce-review)
