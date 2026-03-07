---
status: pending
priority: p3
issue_id: "094"
tags: [code-review, quality, architecture]
dependencies: []
---

# CorridorId Union Type Will Drift From corridors.json

## Problem Statement

`CorridorId` in `types/strait.ts` is a hardcoded union type (`'hormuz' | 'malacca' | ...`). When a new corridor is added to `corridors.json`, the type must be manually updated. There is no compile-time or runtime enforcement that they stay in sync.

**Why it matters:** Type drift means TypeScript won't catch missing corridors or typos in corridor IDs.

## Findings

- **Source:** `types/strait.ts` line 81
- **Evidence:** `export type CorridorId = 'hormuz' | 'malacca' | 'lombok' | 'sunda' | 'taiwan' | 'bab-el-mandeb'`

## Proposed Solutions

### Option A: Derive type from JSON keys at build time
- Use `as const` import pattern or a build-time script to generate the union from `corridors.json` keys
- **Pros:** Always in sync
- **Cons:** More complex build setup
- **Effort:** Medium
- **Risk:** Low

### Option B: Use `string` type with runtime validation
- Change `CorridorId` to `string` and validate at runtime
- **Pros:** Simple, never drifts
- **Cons:** Loses compile-time autocomplete
- **Effort:** Trivial
- **Risk:** Low

## Recommended Action

_(To be filled during triage)_

## Technical Details

- **Affected files:** `types/strait.ts`

## Acceptance Criteria

- [ ] Adding a new corridor to corridors.json does not require a manual type update (or the type update is enforced)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #23 code review | Hardcoded union type vs dynamic data |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/23
