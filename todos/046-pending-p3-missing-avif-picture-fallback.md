---
status: resolved
priority: p3
issue_id: "046"
tags: [code-review, performance, asset]
dependencies: ["039"]
---

# Plan Specifies AVIF Fallback via `<picture>` but Only Single `<img>` Used

## Problem Statement

The deepened plan specifies an AVIF fallback with `<picture>` element for modern browser optimization. The implementation uses a `<picture>` wrapper (line 86) but contains only a single `<img>` child with the WebP source — no `<source>` elements for AVIF or other formats. The `<picture>` element is effectively a no-op wrapper.

## Findings

- **File:** `components/StraitMap.vue` lines 86-96 — `<picture>` with single `<img>`
- Plan Enhancement Summary #4 mentions "AVIF fallback with `<picture>`"
- No AVIF asset exists in `public/assets/`

## Proposed Solutions

### Option A: Remove the `<picture>` wrapper, use plain `<img>`
- **Pros:** Cleaner; no misleading markup; AVIF can be added later
- **Cons:** Minor; need to add `<picture>` back when AVIF is available
- **Effort:** Small
- **Risk:** Low

### Option B: Add AVIF `<source>` when the real image asset is provided
- **Pros:** Complete implementation per plan
- **Cons:** Blocked by todo 039 (0-byte image)
- **Effort:** Small (once image exists)
- **Risk:** Low

## Technical Details

- **Affected files:** `components/StraitMap.vue` lines 86-96

## Acceptance Criteria

- [ ] Either `<picture>` has multiple `<source>` elements or is replaced with `<img>`

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-05 | Created during PR #14 code review | picture element without source elements is a no-op |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/14
