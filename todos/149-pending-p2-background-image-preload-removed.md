---
status: resolved
priority: p2
issue_id: "BF-112"
tags: [code-review, performance]
dependencies: []
---

# Background image preload hints removed without replacement

## Problem Statement

The PR removed the `useHead` preload links for strait background images from `StraitMap.vue`. These `<link rel="preload" as="image">` tags ensured that background images (e.g., `/assets/images/straits/malacca.jpg`) were cached in the browser before a user clicked a strait circle. Without preloading, the first click on a strait may show a visible delay or flash as the background image loads on demand.

This matters because the background image fades in behind the particle animation when a strait is selected. If the image hasn't been fetched yet, the fade-in transition will either show nothing or pop in abruptly.

## Findings

- `StraitMap.vue` previously had a `useHead` block that generated `<link rel="preload">` tags for all unique `backgroundImage` values from `marineTrafficConfigs`.
- The PR removed this block (lines 4-11 of the original file) as part of removing the `marineTrafficConfigs` import.
- `StraitCircle.vue` still uses `marineTrafficConfigs[straitId].backgroundImage` to render an `<img>` tag that fades in when `selected` is true.
- On a cold cache, the image won't be available when the user first clicks a strait, causing a potential flash.

## Proposed Solutions

### Option 1: Re-add preload hints using marineTrafficConfigs import

**Approach:** Re-import `marineTrafficConfigs` in `StraitMap.vue` and restore the `useHead` preload block.

**Pros:**
- Restores the original behavior exactly
- Simple, minimal change

**Cons:**
- Re-introduces the `marineTrafficConfigs` import that was intentionally removed

**Effort:** 15 minutes

**Risk:** Low

---

### Option 2: Add preload hints in nuxt.config.ts or a layout

**Approach:** Add static `<link rel="preload">` tags for the 6 strait images in the Nuxt config `app.head.link` array or the layout component.

**Pros:**
- Keeps `StraitMap.vue` clean of config imports
- Images preload site-wide (or layout-wide)

**Cons:**
- Preloads images even on pages that don't use the straits infographic
- Requires manual sync if images change

**Effort:** 20 minutes

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `components/StraitMap.vue` - preload block was removed
- `components/straits/StraitCircle.vue:42-50` - `<img>` that depends on cached images
- `data/straits/marinetraffic-config.ts` - source of background image paths

## Resources

- **PR:** #36
- **Related:** BF-112

## Acceptance Criteria

- [ ] Background images load without visible flash on first strait click (cold cache)
- [ ] No additional network waterfall when selecting a strait

## Work Log

### 2026-03-16 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified that preload hints were removed as part of the marineTrafficConfigs import cleanup
- Verified StraitCircle still depends on these images for the selected-state fade-in

**Learnings:**
- The preload was a performance optimization, not functionally required
- Impact depends on network speed; on fast connections this may not be noticeable
