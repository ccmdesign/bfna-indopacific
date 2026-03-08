---
status: pending
priority: p2
issue_id: "BF-101"
tags: [code-review, architecture, correctness]
dependencies: []
---

# Hardcoded SVG viewBox "0 0 1080 1080" ignores corridor viewBox from data

## Problem Statement

`StraitCircle.vue` hardcodes `viewBox="0 0 1080 1080"` on the SVG element that renders ship positions. The corridor geometry coordinates are derived from `corridors.json`, which defines its own `viewBox` per corridor. Currently only Hormuz exists and happens to use `[0, 0, 1080, 1080]`, so the coordinates match. When additional corridors are added with different viewBox dimensions, ships will render at wrong positions or off-screen.

## Findings

- `StraitCircle.vue:83` — `viewBox="0 0 1080 1080"` is hardcoded
- `corridors.json` defines `viewBox` per corridor as `[minX, minY, width, height]`
- Currently only `hormuz` corridor exists with viewBox `[0, 0, 1080, 1080]` — coincidental match
- The corridor's `viewBox` is available from `useCorridor` but not threaded to the SVG element
- Ship `x`/`y` coordinates are in corridor-local coordinates matching the corridor's viewBox

## Proposed Solutions

### Option 1: Thread corridor viewBox to SVG element

**Approach:** Extract the corridor's viewBox from `useCorridor` (or pass it as a prop) and bind it to the SVG's `viewBox` attribute dynamically.

**Pros:**
- Correct for any corridor regardless of coordinate system
- Small change, corridor data already has viewBox

**Cons:**
- Need to expose viewBox from useCorridor composable or pass through props

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Normalize all corridors to a canonical viewBox

**Approach:** Normalize corridor geometry to a standard coordinate space (e.g., 0-1080) during geometry derivation in `useCorridor`.

**Pros:**
- Simplifies rendering code
- Single coordinate system everywhere

**Cons:**
- More complex geometry derivation
- Changes existing coordinate system semantics

**Effort:** 2-3 hours

**Risk:** Medium

## Recommended Action

*To be filled during triage.*

## Technical Details

**Affected files:**
- `components/straits/StraitCircle.vue:83` — hardcoded viewBox
- `composables/useCorridor.ts` — corridor data source
- `data/straits/corridors.json` — viewBox definitions per corridor

## Resources

- **PR:** #25

## Acceptance Criteria

- [ ] SVG viewBox matches the corridor's coordinate system
- [ ] Ships render at correct positions for corridors with non-1080 viewBoxes
- [ ] Existing Hormuz rendering is not affected

## Work Log

### 2026-03-08 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified mismatch between hardcoded viewBox and data-driven corridor geometry
- Verified current corridors.json only has hormuz with matching dimensions
- Flagged as time bomb for future corridor additions
