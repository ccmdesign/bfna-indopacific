---
status: resolved
priority: p3
issue_id: "065"
tags: [code-review, quality, typescript, dependencies]
dependencies: []
---

# Missing @types/three Dev Dependency

## Problem Statement

The PR adds `three` as a dependency and uses TypeScript imports from it (`Texture`, `Vector2`, `TextureLoader`, `ClampToEdgeWrapping`). However, `@types/three` is not listed in `devDependencies`. Three.js v0.183 bundles its own types, so this may work currently, but the explicit dev dependency ensures type stability across Three.js version updates.

## Findings

- **Agent:** quality-reviewer
- **Location:** `package.json`
- **Evidence:** `three: ^0.183.2` in dependencies, no `@types/three` in devDependencies
- **Impact:** Low -- Three.js bundles types, but explicit `@types/three` is conventional

## Proposed Solutions

### Option A: Add @types/three

```bash
npm install -D @types/three
```

- **Effort:** Small
- **Risk:** None

### Option B: Accept (Three.js Bundles Types)

Since Three.js v0.150+, types are bundled. No action needed.

- **Effort:** None
- **Risk:** None

## Technical Details

- **Affected files:** `package.json`

## Acceptance Criteria

- [ ] TypeScript compiles without errors for Three.js imports

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #18 review | |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/18
