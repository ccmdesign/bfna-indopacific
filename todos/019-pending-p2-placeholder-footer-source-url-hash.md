---
status: pending
priority: p2
issue_id: "019"
tags: [code-review, quality, ux, BF-72]
dependencies: []
---

# Placeholder Footer Source URL is `#` -- Confusing Clickable Link

## Problem Statement

In `pages/infographics/straits.vue`, the `footerSource` is set to `{ url: '#', label: 'Source: IMF PortWatch' }`. The `layouts/default.vue` footer renders this as a clickable `<a>` tag with `target="_blank"`. Clicking the link opens a new tab pointing to `#` (the same page with a hash), which is confusing UX. Users expect a "Source" link to navigate to the actual data source.

**Why it matters:** The footer source link is a prominent element on every infographic page. Rendering a broken/useless link labeled "Source: IMF PortWatch" undermines credibility and user trust, even if the page is clearly a placeholder.

## Findings

- **Location:** `pages/infographics/straits.vue` lines 5-6
- **Evidence:** `footerSource: { url: '#', label: 'Source: IMF PortWatch' }` -- the `#` URL opens `about:blank#` in a new tab
- **Agent:** quality-reviewer, ux-reviewer
- **Impact:** Medium -- confusing UX for any visitor who clicks the source link

## Proposed Solutions

### Option 1: Use a real IMF PortWatch URL
- Replace `'#'` with the actual IMF PortWatch URL (e.g., `https://portwatch.imf.org/`).
- **Pros:** Link works correctly; users can verify the data source
- **Cons:** The specific dataset URL may not be known yet
- **Effort:** Trivial
- **Risk:** Low

### Option 2: Omit `footerSource` entirely for the placeholder
- Remove the `footerSource` property from `definePageMeta`. The footer will render without a source link (only the BFNA logo).
- **Pros:** No broken link; cleaner placeholder experience
- **Cons:** When the real component is built, someone must remember to add the source back
- **Effort:** Trivial
- **Risk:** Low

### Option 3: Show a non-clickable source label
- Modify the layout to render a `<span>` instead of `<a>` when URL is `'#'` or empty.
- **Pros:** Shows attribution without misleading click target
- **Cons:** Requires layout changes; more code complexity
- **Effort:** Small
- **Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `pages/infographics/straits.vue`
- **Components:** Page metadata, default layout footer
- **Database changes:** None

## Acceptance Criteria

- [ ] The source link on `/infographics/straits` either navigates to a real URL or is not rendered
- [ ] No broken or confusing links in the footer
- [ ] `/infographics/renewables` footer source link still works correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #10 code review | Placeholder page has a `#` source URL that renders as a broken link |

## Resources

- **PR:** https://github.com/ccmdesign/bfna-indopacific/pull/10
- **Files:** `pages/infographics/straits.vue`, `layouts/default.vue`
