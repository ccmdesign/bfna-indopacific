---
status: resolved
priority: p2
issue_id: "002"
tags: [code-review, performance, analytics, architecture]
dependencies: []
---

# Potential gtag Double-Tracking Amplified by Routing Activation

## Problem Statement

The project has two overlapping analytics mechanisms that may double-track page views:
1. The `nuxt-gtag` module (declared in `nuxt.config.ts` with `modules: ['nuxt-gtag']`)
2. A custom `plugins/gtag.client.ts` plugin that manually calls `useTrackEvent('page_view', ...)`

With file-based routing now activated by this PR, the `router.afterEach()` hook in the custom plugin will fire on actual route navigations (not just the initial load). This could amplify any existing double-tracking issue as more pages are added.

**Why it matters:** Double-tracked page views inflate analytics metrics, making data unreliable for business decisions. The `nuxt-gtag` module already handles route-change tracking automatically, so the custom plugin is redundant.

## Findings

- **Location:** `plugins/gtag.client.ts` (entire file) and `nuxt.config.ts` line 12 (`modules: ['nuxt-gtag']`)
- **Evidence:** The custom plugin uses `router.afterEach()` and `router.isReady()` to fire `page_view` events. The `nuxt-gtag` module also auto-tracks page views on route changes. Both are active simultaneously.
- **Agent:** performance-oracle, julik-frontend-races-reviewer
- **Impact:** Medium -- analytics data may be inflated by 2x for page views. This becomes more impactful as additional pages are added to the routing system.

## Proposed Solutions

### Option 1: Remove the custom `plugins/gtag.client.ts` entirely
- **Pros:** Eliminates duplication, relies on well-maintained `nuxt-gtag` module
- **Cons:** Must verify that `nuxt-gtag` provides equivalent tracking features
- **Effort:** Small (delete one file)
- **Risk:** Low -- `nuxt-gtag` is specifically designed for this purpose

### Option 2: Disable auto-tracking in `nuxt-gtag` and keep the custom plugin
- **Pros:** Preserves custom tracking logic
- **Cons:** Reinvents what the module already provides
- **Effort:** Small
- **Risk:** Low

### Option 3: Defer investigation to a separate analytics cleanup task
- **Pros:** Does not block this PR
- **Cons:** Double-tracking continues in the meantime
- **Effort:** N/A (deferral)
- **Risk:** Low -- pre-existing issue, not introduced by this PR

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `plugins/gtag.client.ts`, `nuxt.config.ts`
- **Components:** Analytics tracking, Nuxt plugin system
- **Database changes:** None

## Acceptance Criteria

- [ ] Only one mechanism tracks page views (either `nuxt-gtag` module or custom plugin, not both)
- [ ] Browser DevTools Network tab shows exactly one `page_view` event per navigation
- [ ] GA4 real-time reports confirm expected page view counts

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #4 code review | Pre-existing overlap, amplified by routing activation |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/4
- `plugins/gtag.client.ts` (custom plugin)
- `nuxt.config.ts` line 12 (nuxt-gtag module declaration)
- [nuxt-gtag documentation](https://github.com/johannschopplich/nuxt-gtag)
