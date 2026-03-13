---
status: resolved
priority: p2
issue_id: "BF-111"
tags: [code-review, performance, iframe]
dependencies: []
---

# loading="lazy" on iframe is redundant with v-if gating and may delay visible loads

## Problem Statement

The `MarineTrafficEmbed.vue` iframe uses `loading="lazy"`, but the entire component is already gated by `v-if="selected"` in `StraitCircle.vue`. The iframe is only mounted when a user clicks a strait circle, meaning it is always in or near the viewport when it exists. The `loading="lazy"` attribute tells the browser to defer loading until the element is near the viewport, which adds an unnecessary delay to an iframe that the user has explicitly requested to see.

## Findings

- `components/straits/MarineTrafficEmbed.vue:55` has `loading="lazy"`
- The component is only mounted via `v-if="selected"` in StraitCircle
- When mounted, the circle is zoomed/centered, so the iframe is always in the viewport
- The lazy loading adds a browser-dependent delay (typically ~1-2 frames) before the load begins

## Proposed Solutions

### Option 1: Remove loading="lazy"

**Approach:** Remove the attribute so the iframe begins loading immediately when mounted.

**Pros:**
- Faster perceived load time
- No redundant lazy-loading logic

**Cons:**
- None for the desktop case; on mobile the embed is in a scrollable view, where lazy might help

**Effort:** 2 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `components/straits/MarineTrafficEmbed.vue:55`

## Resources

- **PR:** #35
- [web.dev: Lazy-loading iframes](https://web.dev/iframe-lazy-loading/)

## Acceptance Criteria

- [ ] Desktop embed loads without unnecessary delay
- [ ] Mobile embed loading behavior reviewed separately (may want lazy there)

## Work Log

### 2026-03-12 - Code Review Discovery

**By:** Claude Code (ce-review)
