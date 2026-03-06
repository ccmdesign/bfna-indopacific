---
status: pending
priority: p2
issue_id: "055"
tags: [code-review, vue, quality, BF-84]
dependencies: []
---

# v-bind spreads `status` attribute onto InfographicCard DOM element

## Problem Statement

In `pages/index.vue`, `v-bind="info"` spreads all registry fields onto `<InfographicCard>`. Since `InfographicCard.vue` does not declare a `status` prop, Vue 3's attribute fallthrough causes `status="published"` to appear as an HTML attribute on the rendered `<article>` element. This pollutes the DOM with a non-standard attribute.

## Findings

- **Source:** Architecture / quality review of PR #17
- **Location:** `pages/index.vue:29` (`v-bind="info"`) and `components/InfographicCard.vue` (no `status` prop declared)
- **Evidence:** Vue 3 passes undeclared props as `$attrs`, which fall through to the root element. The `InfographicEntry` type now includes `status`, `description`, `embedTitle`, `slug`, `title`, and `thumbnail`. Only `slug`, `title`, `description`, `thumbnail`, and `embedTitle` are declared as props.
- **Impact:** Non-standard `status` attribute on `<article>` element. No functional breakage, but impure DOM output.

## Proposed Solutions

### Option A: Explicit prop binding (exclude `status`)
Replace `v-bind="info"` with explicit prop bindings that omit `status`.

```vue
<InfographicCard
  v-for="info in publishedInfographics"
  :key="info.slug"
  :slug="info.slug"
  :title="info.title"
  :description="info.description"
  :embed-title="info.embedTitle"
  :thumbnail="info.thumbnail"
  role="listitem"
/>
```

- **Pros:** Clean DOM, explicit about what's passed
- **Cons:** More verbose, must be updated when props change
- **Effort:** Small
- **Risk:** Low

### Option B: Add `inheritAttrs: false` to InfographicCard
Add `defineOptions({ inheritAttrs: false })` to suppress fallthrough.

- **Pros:** Keeps `v-bind` convenience, prevents any future leakage
- **Cons:** Silently swallows all extra attrs (could hide bugs)
- **Effort:** Small
- **Risk:** Low

### Option C: Accept as-is
The `status` attribute on `<article>` is harmless for a 2-item array.

- **Pros:** Zero code change
- **Cons:** Impure DOM
- **Effort:** None
- **Risk:** None

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

- **Affected files:** `pages/index.vue`, `components/InfographicCard.vue`
- **Components:** InfographicCard
- **Database changes:** None

## Acceptance Criteria

- [ ] No non-standard attributes appear on rendered `<article>` elements on the homepage
- [ ] All declared InfographicCard props still receive correct values

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created from PR #17 code review | Vue 3 attr fallthrough applies to all undeclared v-bind fields |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/17
- Vue 3 Fallthrough Attributes: https://vuejs.org/guide/components/attrs.html
