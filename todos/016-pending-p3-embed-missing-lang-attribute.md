---
status: pending
priority: p3
issue_id: "016"
tags: [code-review, accessibility, nuxt, BF-71]
dependencies: []
---

# Embed Route May Lack HTML lang Attribute in iframe Context

## Problem Statement

When `/embed/renewables` is loaded inside an `<iframe>` on a third-party site, the HTML document needs its own `lang` attribute for accessibility. While Nuxt typically sets this at the app level (via `nuxt.config.ts` or `app.vue`), this project does not appear to set `lang` explicitly anywhere. For the main page, browsers may infer language from the parent document or other signals. For an iframe embed on a foreign-language site, the absence of `lang="en"` could cause screen readers to announce the English content with the wrong language pronunciation.

**Why it matters:** WCAG 3.1.1 (Level A) requires that the default human language of each web page can be programmatically determined. Embed iframes are independent documents and need their own `lang` attribute.

## Findings

- **Location:** Project-wide -- no `lang` attribute found in `nuxt.config.ts`, `app.vue`, or any layout file
- **Evidence:** `nuxt.config.ts` does not set `app.head.htmlAttrs.lang`. Neither `layouts/default.vue` nor `layouts/embed.vue` set a lang attribute.
- **Agent:** accessibility-reviewer
- **Impact:** Low-Medium -- accessibility compliance gap affecting screen reader users in embed contexts.

## Proposed Solutions

### Option 1: Set lang globally in nuxt.config.ts
```ts
app: {
  head: {
    htmlAttrs: { lang: 'en' },
    // ... existing config
  }
}
```
- **Pros:** Applies to all routes including embeds; one-line fix; follows Nuxt conventions
- **Cons:** None
- **Effort:** Trivial
- **Risk:** None

### Option 2: Set lang via useHead in embed page only
- **Pros:** Scoped to embed context
- **Cons:** Should really be set globally; doesn't fix the main page either
- **Effort:** Trivial
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `nuxt.config.ts`
- **Components:** App-level HTML configuration
- **Database changes:** None

## Acceptance Criteria

- [ ] The generated HTML for all routes includes `<html lang="en">`
- [ ] Screen readers announce the content in English when the page loads

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #8 code review | Embed iframes are independent documents needing their own lang |

## Resources

- **PR:** https://github.com/ccmdesign/bfna-indopacific/pull/8
- **WCAG:** https://www.w3.org/WAI/WCAG21/quickref/#language-of-page
- **Nuxt docs:** https://nuxt.com/docs/api/configuration/nuxt-config#head
