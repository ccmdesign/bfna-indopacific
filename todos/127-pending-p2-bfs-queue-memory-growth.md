---
status: resolved
priority: p2
issue_id: "BF-104"
tags: [code-review, performance]
dependencies: []
---

# BFS queue in buildDistanceField retains all processed entries in memory

## Problem Statement

`buildDistanceField()` in `utils/particleEngine.ts:187-236` uses an array-based BFS with `push`/`head++` pattern. The `head` pointer advances but processed entries remain in the array, preventing garbage collection. For the 270x270 grid (72,900 cells), the queue array grows to hold all water cells while only the tail is actively used.

## Findings

- `utils/particleEngine.ts:189,213-214` — `queue` array with `head++` indexing.
- Grid size is 270x270 = 72,900 cells. Water cells are a subset but can be 30-50% of total.
- Each entry is a number (4 bytes), so peak memory is ~150KB — modest for this use case.
- The function runs once at initialization, not per frame.
- A proper queue implementation would reduce peak memory but the practical impact is small.

## Proposed Solutions

### Option 1: Accept current implementation (document)

**Approach:** Add a comment noting the memory trade-off is acceptable for a one-time initialization on a 270x270 grid.

**Pros:**
- No code changes
- Already fast enough

**Cons:**
- Not idiomatic BFS

**Effort:** 5 minutes

**Risk:** None

---

### Option 2: Use circular buffer or shift periodically

**Approach:** Replace with a proper queue that releases processed entries.

**Pros:**
- Textbook-correct BFS
- Lower peak memory

**Cons:**
- More complex code for negligible benefit at this grid size

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `utils/particleEngine.ts:187-236` — `buildDistanceField()` function

## Resources

- **PR:** #32

## Acceptance Criteria

- [ ] Either documented as acceptable or refactored to proper queue
- [ ] No performance regression

## Work Log

### 2026-03-09 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified BFS queue memory pattern
- Assessed practical impact as low given grid size and one-time execution
