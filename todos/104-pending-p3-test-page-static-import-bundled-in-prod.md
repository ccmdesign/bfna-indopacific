---
status: resolved
priority: p3
issue_id: "104"
tags: [code-review, bundle-size, BF-90]
dependencies: ["103"]
---

# Test page static imports included in production bundle

## Problem Statement

The `pages/test/hormuz/index.vue` test page uses a runtime redirect (`navigateTo('/')`) to prevent users from accessing it in production, but all static imports (tweakpane, polygon data, Vue APIs) are still resolved and bundled during `nuxt generate` / `nuxt build`. The page itself is also generated as an HTML route in SSG mode. This is a minor bundle inefficiency rather than a functional bug.

## Findings

- **Agent:** performance-reviewer
- **Location:** `pages/test/hormuz/index.vue` lines 1-4
- **Evidence:** Static imports at top of file are unconditionally resolved by the bundler. The `import.meta.dev` check is a runtime guard, not a build-time exclusion.
- **Impact:** Minor -- the test page and its dependencies add a small amount to the production output. The polygon JSON alone is ~12K lines.

## Proposed Solutions

### Option 1: Use Nuxt route rules to exclude test pages from production build

**Approach:** Add route rules in `nuxt.config.ts` to exclude `/test/**` paths from SSG generation.

- **Pros:** Clean build-time exclusion; no code changes to test pages
- **Cons:** Does not prevent the page JS from being bundled, only prevents HTML generation
- **Effort:** Small
- **Risk:** Low

### Option 2: Move test pages to a separate directory excluded by Nuxt config

**Approach:** Use `pages` config or `.nuxtignore` to exclude test pages in production builds.

- **Pros:** Complete build-time exclusion
- **Cons:** Requires config change; may affect dev experience
- **Effort:** Medium
- **Risk:** Low

## Technical Details

- **Affected files:** `pages/test/hormuz/index.vue`, `nuxt.config.ts`

## Acceptance Criteria

- [ ] Test pages are not included in production SSG output
- [ ] Test pages still work in dev mode

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-09 | Created from PR #27 code review | Runtime dev guards don't prevent bundling |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/27
