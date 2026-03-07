---
status: pending
priority: p2
issue_id: "090"
tags: [code-review, architecture, quality]
dependencies: []
---

# Duplicated Logic Across Three Strait Panel Components

## Problem Statement

`StraitDetailPanel.vue` is a copy-paste merge of `StraitQuantPanel.vue` and `StraitQualPanel.vue`. All three components duplicate computed properties (`vesselSegments`, `fmtUsd`, `fmtNum`), stacked-bar CSS, and panel chrome (header, close button, scrollbar styles). Changes to formatting or layout must be applied in 3 places.

**Why it matters:** Maintenance burden and divergence risk. A bug fix in one panel can easily be missed in the other two.

## Findings

- **Source:** `components/straits/StraitDetailPanel.vue`, `components/straits/StraitQuantPanel.vue`, `components/straits/StraitQualPanel.vue`
- **Evidence:** `fmtUsd`, `fmtNum`, `vesselSegments` computed, and stacked-bar CSS are identical across StraitDetailPanel and StraitQuantPanel. StraitQualPanel duplicates header/close/tags/facts sections from StraitDetailPanel.

## Proposed Solutions

### Option A: Extract shared utilities and sub-components
- Move `fmtUsd`, `fmtNum` to a shared `utils/format.ts`
- Extract `StackedBar.vue` and `PanelHeader.vue` sub-components
- **Pros:** DRY, single source of truth for formatting and shared UI
- **Cons:** Requires refactoring three components
- **Effort:** Medium
- **Risk:** Low

### Option B: Remove redundant components
- If StraitDetailPanel is the canonical panel, remove StraitQuantPanel and StraitQualPanel (or vice versa)
- **Pros:** Eliminates duplication entirely
- **Cons:** May break planned mobile/desktop split
- **Effort:** Small
- **Risk:** Medium (may conflict with upcoming mobile layout work)

## Recommended Action

_(To be filled during triage)_

## Technical Details

- **Affected files:** `components/straits/StraitDetailPanel.vue`, `components/straits/StraitQuantPanel.vue`, `components/straits/StraitQualPanel.vue`

## Acceptance Criteria

- [ ] Formatting functions exist in exactly one location
- [ ] Stacked bar UI is a single component or shared CSS module
- [ ] No copy-paste duplication across panel components

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #23 code review | Three panel components share ~80% identical code |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/23
