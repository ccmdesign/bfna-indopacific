---
status: pending
priority: p2
issue_id: "062"
tags: [code-review, quality, data-coupling]
dependencies: []
---

# Legend Hardcodes Domain Values That Should Derive from Data

## Problem Statement

The scale legend in `StraitMap.vue` (line 182) hardcodes `[25, 50, 100]` as the legend entry values. These correspond to the current `flowScalar` domain minimum (25, Hormuz), a midpoint (50), and maximum (100, Malacca). However, these values are duplicated knowledge -- the actual domain is computed from data at lines 28-35 using `d3-array`'s `min`/`max`. If a new strait is added with `flowScalar: 10` or an existing value changes, the legend circles will no longer align with the actual data range.

**Why it matters:** The component already uses `scaleSqrt().domain([minFlow, maxFlow])` to compute circle radii from data. The legend should use the same data-derived domain to stay consistent. The current approach creates a silent drift risk.

## Findings

- **Location:** `components/StraitMap.vue`, line 182
- **Evidence:** `const values = [25, 50, 100]` is hardcoded, while `domain` at line 35 is `[minFlow, maxFlow]` computed from data.
- **Agent:** architecture-reviewer, quality-reviewer
- **Impact:** Legend becomes inaccurate if data changes. The "Low" circle would show a size that doesn't match the actual smallest strait.

## Proposed Solutions

### Option 1: Derive legend values from computed domain
- **Description:** Replace hardcoded values with:
  ```ts
  const legendEntries = computed(() => {
    const lo = domain[0]
    const hi = domain[1]
    const mid = (lo + hi) / 2
    return [lo, mid, hi].map(v => ({ value: v, r: radiusScale(v) }))
  })
  ```
- **Pros:** Legend always matches data; single source of truth
- **Cons:** Mid value is an interpolation, not a real data point (acceptable for a qualitative legend)
- **Effort:** Small (10 min)
- **Risk:** None

### Option 2: Use actual data points as legend anchors
- **Description:** Pick the smallest, a middle, and the largest strait's `flowScalar` from the sorted data.
- **Pros:** Legend values correspond to real straits
- **Cons:** More complex; middle selection is arbitrary
- **Effort:** Small (15 min)
- **Risk:** None

## Recommended Action

Option 1 -- derive from domain for simplicity.

## Technical Details

- **Affected files:** `components/StraitMap.vue`
- **Affected lines:** 181-186

## Acceptance Criteria

- [ ] Legend values derive from the same domain used by `radiusScale`
- [ ] Adding a new strait with a different `flowScalar` range automatically updates legend
- [ ] Visual appearance unchanged for current data

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created from PR #19 code review | Hardcoded domain values duplicate knowledge from d3 scale setup |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/19
