---
status: resolved
priority: p2
issue_id: "041"
tags: [code-review, ux, layout]
dependencies: []
---

# Layout max-height: 100vh May Clip Tall Test Page Content

## Problem Statement

The `default.vue` layout sets `max-height: 100vh` on `.page-wrapper` (line 66-68). The test page at `/test/embeds` renders two full-size iframe previews (each with `max-height: 60vh`) plus headers, embed code blocks, and copy buttons. The total content height will significantly exceed 100vh. Without explicit `overflow: auto` on `.page-wrapper`, the content may be clipped on desktop viewports.

The mobile media query (`max-width: 900px`) switches to `max-height: 100%; height: 100%`, which also does not guarantee scrollability for content taller than the viewport.

**Why it matters:** Users on desktop may not be able to scroll to the second embed section, making the test page only partially functional.

## Findings

- `layouts/default.vue` line 66-68: `.page-wrapper { max-height: 100vh; padding-bottom: 4rem; }`
- `layouts/default.vue` line 72-75: `@media (max-width: 900px) { max-height: 100%; height: 100%; }`
- No `overflow` property is set on `.page-wrapper`
- The test page `layoutClass: 'layout-test'` has no corresponding CSS in the layout or globally
- Two iframe previews with `max-height: 60vh` each = up to 120vh of iframe content alone

## Proposed Solutions

### Option A: Add overflow-y: auto via the layout-test class (Recommended)
Define a `.layout-test` class (either scoped in the test page or in the global styles) that sets `overflow-y: auto; max-height: none;` on the page wrapper.

- **Pros:** Targeted fix; does not affect other pages
- **Cons:** Requires defining the `layout-test` class somewhere
- **Effort:** Small
- **Risk:** Low

### Option B: Set overflow-y: auto on .page-wrapper globally
Add `overflow-y: auto` to the `.page-wrapper` rule in `default.vue`.

- **Pros:** Fixes scrolling for any tall page
- **Cons:** May cause unexpected behavior on pages designed for fixed viewport (infographic pages)
- **Effort:** Small
- **Risk:** Medium

## Recommended Action

Option A -- define `.layout-test` styles that override the viewport-height constraint.

## Technical Details

**Affected files:**
- `layouts/default.vue` (lines 66-76)
- `pages/test/embeds.vue` (line 9 references `layout-test`)

## Acceptance Criteria

- [ ] The test page is fully scrollable on desktop viewports
- [ ] Both embed sections (renewables and straits) are reachable by scrolling
- [ ] Existing infographic pages are unaffected

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-05 | Created during code review of PR #15 | layout-test class is referenced but never defined |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/15
- Layout: `layouts/default.vue:66-76`
