---
status: resolved
priority: p3
issue_id: "113"
tags: [code-review, quality, robustness]
dependencies: []
---

# globalSharePct Regex Uses En-Dash in Character Class

## Problem Statement
The `globalSharePct` computed in `StraitMobileDetail.vue` uses the regex `/~?[\d.–-]+%/` which includes an en-dash (`–`, U+2013) and a hyphen (`-`) in the character class. While this works for current data like "~30%" or "25–30%", the en-dash is a non-obvious Unicode character that could be missed in future edits, and the regex would silently fail if data used an em-dash or other dash variant.

**Why it matters:** The fallback behavior (returning the full `globalShareLabel`) is reasonable, so this is not a breaking issue. However, explicit character handling would be more maintainable.

## Findings
- **File:** `components/straits/StraitMobileDetail.vue`, line 61
- Regex: `/~?[\d.–-]+%/`
- The en-dash is visually indistinguishable from a hyphen in many editors
- Fallback to full label is safe but may show overly long text in the metric card

## Proposed Solutions

### Option A: Use Unicode escape for clarity
- Change to `/~?[\d.\u2013\-]+%/` to make the en-dash explicit
- **Pros:** Self-documenting, no behavioral change
- **Effort:** Small
- **Risk:** Low

### Option B: Use a broader dash pattern
- Change to `/~?[\d.\p{Dash_Punctuation}]+%/u` to catch all dash types
- **Pros:** Handles em-dash, figure-dash, etc.
- **Effort:** Small
- **Risk:** Low

## Recommended Action
<!-- Filled during triage -->

## Technical Details
- **Affected files:** `components/straits/StraitMobileDetail.vue`

## Acceptance Criteria
- [ ] Regex handles en-dash, em-dash, and hyphen variants
- [ ] Existing labels like "~30%" still match correctly

## Work Log
| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-09 | Created from PR #29 code review | Unicode dash in regex |

## Resources
- PR: https://github.com/ccmdesign/bfna-indopacific/pull/29
