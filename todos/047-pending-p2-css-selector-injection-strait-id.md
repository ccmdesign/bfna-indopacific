---
status: resolved
priority: p2
issue_id: "047"
tags: [code-review, security, BF-77]
dependencies: []
---

# CSS Selector Injection via data-strait-id

## Problem Statement

In `composables/useStraitTransition.ts` line 53, the `straitId` parameter is interpolated directly into a CSS attribute selector without sanitization:

```ts
const selected = svg.querySelector(`[data-strait-id="${straitId}"]`)
```

If `straitId` ever contains characters like `"`, `]`, or `\`, this could break the selector or, in adversarial conditions, select unintended elements. Currently the IDs come from a static JSON file so the risk is low, but this is a defensive-coding gap.

## Findings

- **Source:** `composables/useStraitTransition.ts:53`
- **Agent:** security-sentinel
- **Evidence:** The `open()` function accepts `straitId: string` with no validation before using it in `querySelector`.
- **Current mitigant:** IDs are hardcoded slugs in `straits.json` (e.g., `"malacca"`, `"taiwan"`).

## Proposed Solutions

### Option A: Validate straitId against a regex
- **Pros:** Simple, zero dependencies
- **Cons:** Must keep regex in sync with data format
- **Effort:** Small
- **Risk:** Low

```ts
if (!/^[a-z0-9-]+$/.test(straitId)) return
```

### Option B: Use CSS.escape()
- **Pros:** Handles any string safely, standards-based
- **Cons:** Requires polyfill for SSR (Node lacks CSS.escape)
- **Effort:** Small
- **Risk:** Low

```ts
const selected = svg.querySelector(`[data-strait-id="${CSS.escape(straitId)}"]`)
```

### Option C: Use getElementById or data lookup instead of querySelector
- **Pros:** Eliminates injection vector entirely
- **Cons:** Requires refactoring to assign IDs to elements
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

*(To be filled during triage)*

## Technical Details

- **Affected files:** `composables/useStraitTransition.ts`
- **Affected components:** useStraitTransition composable
- **Database changes:** None

## Acceptance Criteria

- [ ] `straitId` is sanitized or validated before use in querySelector
- [ ] No change in behavior for valid strait IDs

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #16 review | Defensive coding for DOM queries |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/16
- MDN CSS.escape: https://developer.mozilla.org/en-US/docs/Web/API/CSS/escape_static
