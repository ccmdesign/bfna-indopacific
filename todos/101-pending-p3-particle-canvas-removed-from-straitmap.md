---
status: pending
priority: p3
issue_id: "101"
tags: [code-review, architecture, BF-89, BF-78]
dependencies: ["098"]
---

# StraitParticleCanvas Removed from StraitMap but Architecture Change Not Documented

## Problem Statement

The PR moves `StraitParticleCanvas` from being rendered as a sibling inside `StraitMap.vue`'s `.map-inner` div to being nested inside `StraitCircle.vue`. This is a significant architectural change to the particle rendering pipeline — the canvas coordinate space changed from map-relative (requiring zoom/pan transforms) to circle-relative (1080x1080 world space). The `particleClipRadius` computed property was also removed from `StraitMap.vue`.

This change is part of BF-78 (particle system rewrite) but is bundled into the BF-89 (mobile routing) PR without clear separation.

## Findings

- **Agent:** architecture-strategist
- **Evidence:** `components/StraitMap.vue` diff — `StraitParticleCanvas` and `particleClipRadius` removed; `components/straits/StraitCircle.vue` — `StraitParticleCanvas` added inside circle

## Proposed Solutions

### Option 1: Accept as-is with documentation
The architectural change is sound (simpler coordinate space), but should be noted in the PR description.

- **Effort:** Small
- **Risk:** Low

### Option 2: Split into separate PR
Extract particle system changes into a BF-78 PR.

- **Effort:** Medium
- **Risk:** Low

## Technical Details

- **Affected files:** `components/StraitMap.vue`, `components/straits/StraitCircle.vue`, `components/straits/StraitData.vue`, `composables/useParticleSystem.ts`

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-09 | Created | Found during PR #26 code review |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/26
