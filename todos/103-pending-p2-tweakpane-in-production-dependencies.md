---
status: resolved
priority: p2
issue_id: "103"
tags: [code-review, performance, bundle-size, BF-90]
dependencies: []
---

# tweakpane added to production dependencies instead of devDependencies

## Problem Statement

The `tweakpane` package (^4.0.5) was added to `dependencies` in `package.json`, but it is only used in the dev-only test page (`pages/test/hormuz/index.vue`). Since it is imported via a static `import { Pane } from 'tweakpane'` at the top of the file, it will be included in the production bundle even though the page redirects away in production via `navigateTo('/')`. This unnecessarily inflates the production bundle size.

## Findings

- **Agent:** architecture-reviewer, performance-reviewer
- **Location:** `package.json` line 17, `pages/test/hormuz/index.vue` line 3
- **Evidence:** `tweakpane` appears under `"dependencies"` rather than `"devDependencies"`. The only usage is in a page gated by `if (!import.meta.dev) { navigateTo('/', { replace: true }) }`, which is a runtime redirect, not a build-time exclusion.
- **Impact:** Adds ~50KB+ (minified) to the production bundle for zero user-facing benefit. In SSG/SSR builds, the import will still be resolved and bundled.

## Proposed Solutions

### Option 1: Move to devDependencies (Recommended)

**Approach:** Move `tweakpane` from `dependencies` to `devDependencies` in `package.json`.

- **Pros:** Simple one-line change; removes tweakpane from production bundle in most build configurations
- **Cons:** May still be bundled if Nuxt resolves imports from test pages during build
- **Effort:** Small (5 minutes)
- **Risk:** Low

### Option 2: Dynamic import behind dev check

**Approach:** Replace the static `import { Pane } from 'tweakpane'` with a dynamic `const { Pane } = await import('tweakpane')` inside the `onMounted` hook, behind the `import.meta.dev` guard.

- **Pros:** Guarantees tweakpane is never loaded or bundled in production; works regardless of dependency location
- **Cons:** Slightly more complex code; async import changes initialization timing
- **Effort:** Small (15 minutes)
- **Risk:** Low

### Option 3: Both (Belt and suspenders)

**Approach:** Move to devDependencies AND use dynamic import.

- **Pros:** Maximum protection against bundle bloat
- **Cons:** Slightly over-engineered for a test page
- **Effort:** Small (20 minutes)
- **Risk:** Low

## Recommended Action

Option 2 (dynamic import) is the most robust since it guarantees tree-shaking regardless of the dependency location. Option 1 alone may not be sufficient because Nuxt's build process resolves all page imports.

## Technical Details

- **Affected files:** `package.json`, `pages/test/hormuz/index.vue`
- **Components:** Test page particle system debug UI

## Acceptance Criteria

- [ ] `tweakpane` is not present in the production bundle
- [ ] `pages/test/hormuz/index.vue` still works correctly in dev mode
- [ ] `npm run build` / `nuxt generate` completes without errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-09 | Created from PR #27 code review | Dev-only dependencies should use dynamic imports or devDependencies |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/27
- tweakpane docs: https://tweakpane.github.io/docs/
