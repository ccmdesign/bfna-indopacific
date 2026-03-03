---
status: pending
priority: p3
issue_id: "005"
tags: [code-review, quality, naming-convention]
dependencies: []
---

# Component File Naming Inconsistency: gridOverlay.vue

## Problem Statement

The `components/` directory contains four Vue SFC files. Three use PascalCase naming (`GridCounter.vue`, `RenewableEnergyChart.vue`, `RotateDeviceOverlay.vue`), while one uses camelCase (`gridOverlay.vue`). The template in `pages/index.vue` references it as `<GridOverlay />` (PascalCase), which works because Nuxt's auto-import resolves component names case-insensitively.

**Why it matters:** Inconsistent naming conventions make the codebase harder to navigate and can cause issues on case-sensitive file systems (e.g., Linux CI/CD environments). While Nuxt handles this gracefully, it is a code quality concern. This is a pre-existing issue.

## Findings

- **Location:** `components/gridOverlay.vue` (filename)
- **Evidence:** All other components use PascalCase: `GridCounter.vue`, `RenewableEnergyChart.vue`, `RotateDeviceOverlay.vue`. Only `gridOverlay.vue` deviates.
- **Agent:** pattern-recognition-specialist
- **Impact:** Low -- cosmetic consistency issue with potential CI implications on case-sensitive systems.

## Proposed Solutions

### Option 1: Rename `gridOverlay.vue` to `GridOverlay.vue`
- **Pros:** Consistent with the project's predominant convention and Vue style guide
- **Cons:** Requires a `git mv` to ensure case-sensitive rename is tracked properly
- **Effort:** Small
- **Risk:** None (Nuxt auto-import is case-insensitive)

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `components/gridOverlay.vue` (rename to `GridOverlay.vue`)
- **Components:** File naming convention
- **Database changes:** None

## Acceptance Criteria

- [ ] File is renamed from `gridOverlay.vue` to `GridOverlay.vue`
- [ ] `git mv` is used to ensure proper case-sensitive tracking
- [ ] Component still renders correctly after rename

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #4 code review | Pre-existing naming inconsistency |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/4
- [Vue Style Guide: Component File Names](https://vuejs.org/style-guide/rules-strongly-recommended.html#single-file-component-filename-casing)
