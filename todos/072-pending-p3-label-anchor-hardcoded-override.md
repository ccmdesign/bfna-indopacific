---
status: pending
priority: p3
issue_id: "072"
tags: [code-review, architecture, maintainability]
dependencies: []
---

# Label Anchor Hardcoded in StraitData Template Overrides Data Prop

## Problem Statement

`StraitData.vue` receives a `labelAnchor` prop from the strait data, but the template ignores it and uses a hardcoded ternary expression instead:

```vue
:anchor="(id === 'taiwan' || id === 'luzon') ? 'right' : 'below'"
```

This duplicates placement logic that already exists in `straits.json` (where each strait has a `labelAnchor` field). If label positions need to change, there are now two places to update.

## Findings

- **Source:** `components/straits/StraitData.vue`, line 59
- **Source:** `data/straits/straits.json` - each strait has `labelAnchor` (e.g., "left", "right", "below")
- **Evidence:** The prop is declared but ignored in the template

## Proposed Solutions

### Option A: Use the prop directly - `:anchor="labelAnchor"`
- **Pros:** Single source of truth; data-driven
- **Effort:** Small
- **Risk:** Low (need to verify data values match desired positions)

## Recommended Action

_To be filled during triage._

## Technical Details

- **Affected files:** `components/straits/StraitData.vue`

## Acceptance Criteria

- [ ] Label placement is driven by `labelAnchor` from data, not hardcoded IDs

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Identified during PR #20 code review | Data has correct values; template overrides them |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/20
