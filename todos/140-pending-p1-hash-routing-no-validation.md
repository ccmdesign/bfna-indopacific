---
status: pending
priority: p1
issue_id: "BF-111"
tags: [code-review, security, routing]
dependencies: []
---

# Hash-based strait routing bypasses VALID_IDS validation

## Problem Statement

The new hash-based routing in `pages/infographics/straits/[[id]].vue` reads `route.hash` and uses it directly as `straitId` without checking it against `VALID_IDS`. The existing `watch` on `route.params.id` only validates the URL param, not the hash. Any arbitrary string in the hash (e.g., `#bogus`) becomes a `straitId`, leading to `marineTrafficConfigs[props.straitId]` returning `undefined`, which causes the embed component to silently fail. More critically, `historicalByStrait(straitId.value)` and `straits.find(...)` will return undefined, and `document.body.dataset.strait` will be set to an arbitrary user-controlled string.

This is a P1 because it introduces an input validation gap on a user-controlled value that flows through multiple components.

## Findings

- `straitId` computed (line 26-32) reads hash without validation:
  ```ts
  const hash = route.hash?.replace('#', '')
  return hash || null
  ```
- The `watch` on `route.params.id` (line 35-43) only validates the `id` param, not the hash.
- `onSelect` writes the hash but there is no guard on read-back.
- `document.body.dataset.strait = id` sets an arbitrary string on the DOM.

## Proposed Solutions

### Option 1: Validate hash against VALID_IDS in the computed

**Approach:** Add VALID_IDS check to the hash branch of the `straitId` computed.

```ts
const straitId = computed(() => {
  const id = route.params.id as string | undefined
  if (id && VALID_IDS.has(id)) return id
  const hash = route.hash?.replace('#', '')
  if (hash && VALID_IDS.has(hash)) return hash
  return null
})
```

**Pros:**
- Simple, minimal change
- Catches all invalid hashes

**Cons:**
- None significant

**Effort:** 15 minutes

**Risk:** Low

## Recommended Action

## Technical Details

**Affected files:**
- `pages/infographics/straits/[[id]].vue:26-32` — straitId computed

## Resources

- **PR:** #35

## Acceptance Criteria

- [ ] Navigating to `#bogus` does not select any strait
- [ ] Valid hashes like `#hormuz` still work
- [ ] Invalid hashes are ignored, not passed to downstream components

## Work Log

### 2026-03-12 - Code Review Discovery

**By:** Claude Code (ce-review)

**Actions:**
- Identified hash input not validated against VALID_IDS
- Traced data flow through components to confirm impact

## Notes

- The URL param path already validates via the watch; only the hash path is unguarded.
