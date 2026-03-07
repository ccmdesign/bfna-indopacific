---
status: resolved
priority: p3
issue_id: "073"
tags: [code-review, quality, maintainability]
dependencies: []
---

# Shader Tuning Values Are Magic Numbers in StraitCircle

## Problem Statement

The distortion (0.65) and aberration (0.008) values are hardcoded as refs in `StraitCircle.vue` with no documentation of what these values mean or how to tune them. While the PR description mentions "Shader effect tuning values: distortion: 0.65, aberration: 0.008", these are not configurable from parent components, making it difficult to adjust per-strait or globally.

## Findings

- **Source:** `components/straits/StraitCircle.vue`, lines 28-29
- **Evidence:** `const distortion = ref(0.65)` and `const aberration = ref(0.008)` with no props or constants

## Proposed Solutions

### Option A: Extract as named constants with comments
- **Pros:** Self-documenting; easy to find and adjust
- **Effort:** Small
- **Risk:** Low

### Option B: Accept as props with defaults
- **Pros:** Configurable per-strait if needed
- **Cons:** Over-engineering if values should be uniform
- **Effort:** Small
- **Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

- **Affected files:** `components/straits/StraitCircle.vue`

## Acceptance Criteria

- [ ] Shader tuning values are documented (named constants or prop defaults with comments)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Identified during PR #20 code review | Values are visual tuning parameters |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/20
