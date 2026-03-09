---
status: resolved
priority: p2
issue_id: "093"
tags: [code-review, quality, production-readiness, BF-89]
dependencies: []
---

# Test Page /test/hormuz/ Ships in Production Build

## Problem Statement

`pages/test/hormuz/index.vue` is a debug/calibration page that renders polygon boundaries over a satellite image. It has no auth gate or route guard and will be publicly accessible at `/test/hormuz/` in production. This exposes internal development tooling to end users.

## Findings

- **Agent:** security-sentinel
- **Evidence:** `pages/test/hormuz/index.vue` — 160 lines, no route protection
- **Impact:** Leaks internal debug visualization; unprofessional if discovered by users

## Proposed Solutions

### Option 1: Move to dev-only route
Gate behind `import.meta.dev` or add a route rule that excludes `/test/**` from production builds.

- **Pros:** Clean separation
- **Cons:** Need Nuxt route rules config
- **Effort:** Small
- **Risk:** Low

### Option 2: Remove from PR
The test page belongs in a separate development branch or as a local-only file.

- **Pros:** Clean production build
- **Cons:** Loses the calibration tool
- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `pages/test/hormuz/index.vue`

## Acceptance Criteria

- [ ] `/test/hormuz/` is not accessible in production build
- [ ] Debug page still available during local development

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-09 | Created | Found during PR #26 code review |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/26
