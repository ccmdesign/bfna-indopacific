---
status: pending
priority: p2
issue_id: "013"
tags: [code-review, architecture, quality, nuxt, BF-71]
dependencies: []
---

# Duplicate useHead Configuration Across Page Files

## Problem Statement

Both `pages/index.vue` and `pages/embed/renewables.vue` contain identical `useHead` calls for the page title ("Renewables on the Rise") and Inter font stylesheet link. As more infographic pages and embed routes are added, this pattern will lead to N copies of the same head configuration, creating drift risk when one page is updated but another is missed.

**Why it matters:** The whole purpose of BF-71 was to establish a "single source of truth" for the renewables infographic. While the template content is now centralized in the component, the head metadata (title, font) is still duplicated across every page that uses the component. This partially undermines the DRY goal.

## Findings

- **Location:** `pages/index.vue` lines 13-18, `pages/embed/renewables.vue` lines 9-17
- **Evidence:** Both files contain:
  ```js
  useHead({
    title: 'Renewables on the Rise',
    link: [
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap', key: 'inter-font' }
    ]
  })
  ```
- **Agent:** architecture-strategist, code-simplicity-reviewer
- **Impact:** Medium -- drift risk increases as more routes reuse the same infographic component.

## Proposed Solutions

### Option 1: Extract a `useRenewablesHead()` composable
- Create `composables/useRenewablesHead.ts` that encapsulates the shared `useHead` call, allowing pages to call `useRenewablesHead()` and only add page-specific overrides (e.g., `noindex` for embed).
- **Pros:** Single source of truth for infographic head metadata; follows Nuxt composable conventions
- **Cons:** Adds a new file; may be over-engineering for only 2 consumers right now
- **Effort:** Small
- **Risk:** Low

### Option 2: Move `useHead` into the `RenewablesInfographic` component itself
- The component calls `useHead` for title and font; pages only set page-level meta like `noindex`.
- **Pros:** Truly self-contained component; pages become even thinner
- **Cons:** Components calling `useHead` is less conventional in Nuxt (typically page-level concern); may cause unexpected behavior if component is used in a context where a different title is desired
- **Effort:** Small
- **Risk:** Low-Medium

### Option 3: Keep as-is, add a code comment linking the two
- Add a `// SYNC:` comment in both files pointing to each other.
- **Pros:** Zero code change; acknowledges the duplication
- **Cons:** Does not prevent drift; relies on developer discipline
- **Effort:** Trivial
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `pages/index.vue`, `pages/embed/renewables.vue`
- **Components:** Page-level head management
- **Database changes:** None

## Acceptance Criteria

- [ ] The Inter font link and page title for the renewables infographic are defined in exactly one location
- [ ] Both `/` and `/embed/renewables` routes still render the correct title and font
- [ ] The embed route retains its `noindex, nofollow` meta tag

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #8 code review | Duplication identified across 2 page files sharing the same infographic component |

## Resources

- **PR:** https://github.com/ccmdesign/bfna-indopacific/pull/8
- **Files:** `pages/index.vue`, `pages/embed/renewables.vue`
