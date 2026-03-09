---
status: pending
priority: p3
issue_id: "099"
tags: [code-review, quality, BF-89]
dependencies: []
---

# StraitCard.vue Uses computed() Without Explicit Import

## Problem Statement

`components/straits/StraitCard.vue` uses `computed()` (line 8) but does not import it from Vue. This works because Nuxt auto-imports Vue's composition API, but it is inconsistent with other components in this PR (e.g., `StraitCardList.vue` does not use `computed`, `StraitMobileDetail.vue` also relies on auto-import). Minor style inconsistency.

## Findings

- **Agent:** quality-reviewer
- **Evidence:** `components/straits/StraitCard.vue` line 8 — `const ariaLabel = computed(() => ...)`

## Proposed Solutions

### Option 1: Accept auto-import (Nuxt convention)
No change needed — Nuxt auto-imports are standard practice.

- **Pros:** Follows Nuxt convention
- **Effort:** None

### Option 2: Add explicit import for clarity
Add `import { computed } from 'vue'` for explicitness.

- **Pros:** Explicit, helps IDEs and new developers
- **Effort:** Small

## Technical Details

- **Affected files:** `components/straits/StraitCard.vue`

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-09 | Created | Found during PR #26 code review |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/26
