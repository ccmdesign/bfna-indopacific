---
status: resolved
priority: p2
issue_id: "BF-91"
tags: [code-review, performance, javascript]
dependencies: []
---

# RAF gate pattern drops final resize event

## Problem Statement

The ResizeObserver callback uses an RAF gate (`if (resizeRafId !== null) return`) that drops resize events arriving while a frame is pending. In a rapid resize sequence (e.g., device rotation), events fire as: E1, E2, E3. E1 schedules RAF, E2 and E3 are dropped. The RAF fires with E1's data, but E3's final size is never applied. The circle may render at a stale intermediate size until the next resize event.

This matches the project's existing pattern in `useFisheyeCanvas.ts` and `useParticleSystem.ts`, so it is a known trade-off, but the mobile detail hero circle is more visually prominent and the mismatch would be more noticeable.

## Findings

- `StraitMobileDetail.vue:34-39` - RAF gate drops events when `resizeRafId !== null`
- Same pattern exists in `composables/useFisheyeCanvas.ts:348` and `composables/useParticleSystem.ts:314`
- ResizeObserver spec guarantees at least one callback at the settled size, but only AFTER the RAF gate would have already returned for intermediate events
- In practice, orientation change fires multiple events in rapid succession; the final settled event may coincide with a pending RAF

## Proposed Solutions

### Option 1: Coalesce instead of drop

**Approach:** Store the latest entry and always use it in the RAF callback, rather than returning early.

```typescript
let latestEntry: ResizeObserverEntry | null = null
const ro = new ResizeObserver(([entry]) => {
  latestEntry = entry
  if (resizeRafId !== null) return
  resizeRafId = requestAnimationFrame(() => {
    resizeRafId = null
    if (latestEntry) {
      heroRadius.value = Math.round(latestEntry.contentRect.width / 2)
      latestEntry = null
    }
  })
})
```

**Pros:**
- Always uses the most recent size
- Minimal code change
- Still throttled to one update per frame

**Cons:**
- Slightly more memory (one extra variable)

**Effort:** 15 minutes

**Risk:** Low

---

### Option 2: Accept as-is (known project pattern)

**Approach:** Document the trade-off. ResizeObserver will fire again at the settled size, so the issue is transient.

**Pros:**
- No code change
- Consistent with project conventions

**Cons:**
- Brief visual mismatch possible during orientation changes

**Effort:** 0

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `components/straits/StraitMobileDetail.vue:34-39`

## Resources

- **PR:** #28
- **Related issue:** BF-91
- **Similar patterns:** `composables/useFisheyeCanvas.ts:347-350`, `composables/useParticleSystem.ts:314-317`

## Acceptance Criteria

- [ ] Hero circle settles at correct size after device rotation
- [ ] No visible stale-size flash during rapid viewport changes

## Work Log

### 2026-03-09 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified lossy RAF gate pattern in new ResizeObserver code
- Compared with existing project patterns in composables
- Drafted coalescing alternative

**Learnings:**
- Project consistently uses drop-on-gate pattern; coalescing would be a minor improvement
