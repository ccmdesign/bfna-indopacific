---
status: resolved
priority: p3
issue_id: "103"
tags: [code-review, quality]
dependencies: []
---

# nextId Monotonically Increases Without Bound

## Problem Statement

`nextId` increments on every spawn (line 253) and is never reset (even on pool clear/restart). Over very long sessions, it could theoretically exceed `Number.MAX_SAFE_INTEGER` (~9 quadrillion), at which point IDs would lose uniqueness.

**Why it matters:** Practically negligible risk (would require ~4.7 billion years at 60fps, 2 spawns/frame). However, `nextId` could be reset in `initPool()` to keep IDs compact and make debugging easier.

## Findings

- **Source:** `composables/useShipSimulation.ts` line 253, 205
- **Evidence:** `nextId` is set to `size` in `initPool()` but never reset on subsequent `start()` calls since `initPool()` is called in `start()`. Actually, `initPool` does set `nextId = size`, so this resets on restart. The concern is only within a single continuous session.

## Proposed Solutions

### Option A: Accept and add a comment
- Document that overflow is not a practical concern.
- **Effort:** Trivial

### Option B: Reset nextId in initPool
- Already done (line 205). No action needed -- this finding can be closed.

## Recommended Action

_Pending triage. May be a non-issue since initPool resets nextId._

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-07 | Created | PR #24 code review finding |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/24
