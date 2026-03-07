---
status: wont_fix
priority: p2
issue_id: "066"
tags: [code-review, performance, webgl]
dependencies: []
---

# Six Simultaneous WebGL Contexts May Exhaust GPU Resources

## Problem Statement

Each `StraitCircle` with an `imageUrl` creates its own WebGL context via `useFisheyeCanvas`. With 6 straits all having `imageUrl` values, this means 6 simultaneous WebGL contexts on a single page. Browsers typically limit WebGL contexts to 8-16 total across all tabs; exceeding the limit causes the oldest contexts to be silently lost. On mobile devices or low-end hardware, this limit can be even lower.

While the composable does handle `webglcontextlost`, it does not attempt recovery until the browser fires `webglcontextrestored`, which may never happen if the limit is permanently saturated.

## Findings

- **Source:** `composables/useFisheyeCanvas.ts` - each call creates a new WebGL context (line 215-219)
- **Source:** `components/straits/StraitCircle.vue` - composable is invoked per-circle instance (line 31)
- **Source:** `data/straits/straits.json` - all 6 straits have `imageUrl` set
- **Evidence:** Chrome limits to ~16 WebGL contexts across all tabs; Firefox to ~8; Safari to ~8. Six contexts from one page is a significant portion of this budget.

## Proposed Solutions

### Option A: Shared single WebGL context with multi-viewport rendering
- **Pros:** One context, maximum compatibility, best GPU memory usage
- **Cons:** Large refactor; requires render-to-texture or atlas approach
- **Effort:** Large
- **Risk:** Medium

### Option B: Render on demand (only active/hovered strait gets WebGL)
- **Pros:** At most 1-2 contexts at a time; minimal refactor
- **Cons:** Slight delay on first hover; need to manage context lifecycle
- **Effort:** Medium
- **Risk:** Low

### Option C: Accept current approach with monitoring
- **Pros:** No code changes; context loss is handled gracefully
- **Cons:** May degrade on mobile; uses disproportionate share of browser context budget
- **Effort:** Small
- **Risk:** Medium

## Recommended Action

_To be filled during triage._

## Technical Details

- **Affected files:** `composables/useFisheyeCanvas.ts`, `components/straits/StraitCircle.vue`
- **Components:** StraitCircle, useFisheyeCanvas
- **Database changes:** None

## Acceptance Criteria

- [ ] Page works reliably on mobile Safari and Firefox with all 6 straits visible
- [ ] No WebGL context loss warnings in console under normal browsing
- [ ] GPU memory usage is reasonable (check via browser dev tools)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Identified during PR #20 code review | 6 simultaneous contexts is within limits but risky |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/20
- [WebGL context limits](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#dont_create_more_webgl_contexts_than_necessary)
