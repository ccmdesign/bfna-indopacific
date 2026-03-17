---
status: pending
priority: p2
issue_id: "BF-112"
tags: [code-review, architecture, quality]
dependencies: []
---

# marinetraffic-config.ts name is misleading after embed removal

## Problem Statement

After removing the MarineTraffic iframe embed, the file `data/straits/marinetraffic-config.ts` and its exported type `MarineTrafficConfig` no longer configure anything related to MarineTraffic. The file now holds generic strait metadata: background image paths, latitude/longitude, and zoom level. The name creates confusion for future developers who will wonder what MarineTraffic integration exists.

The `marineTrafficConfigs` export is consumed by:
- `StraitCircle.vue` (for `backgroundImage`)
- `StraitQuantPanel.vue` (for `latitude`, `longitude`, `zoom` to build an external MT link)

## Findings

- `data/straits/marinetraffic-config.ts` exports `MarineTrafficConfig` interface and `marineTrafficConfigs` record
- The `embedUrl` field and helper function were correctly removed in this PR
- The remaining fields (`backgroundImage`, `latitude`, `longitude`, `zoom`) are generic strait metadata
- Two consumers import `marineTrafficConfigs` by name

## Proposed Solutions

### Option 1: Rename file and exports to strait-config

**Approach:** Rename file to `data/straits/strait-config.ts`, type to `StraitConfig`, export to `straitConfigs`. Update 2 consumers.

**Pros:**
- Accurate naming
- Small, low-risk refactor

**Cons:**
- Separate PR/commit needed

**Effort:** 15 minutes

**Risk:** Low

---

### Option 2: Leave as-is with a comment

**Approach:** Add a comment explaining the naming is historical.

**Pros:**
- Zero risk

**Cons:**
- Name remains misleading

**Effort:** 5 minutes

**Risk:** None

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `data/straits/marinetraffic-config.ts`
- `components/straits/StraitCircle.vue` (import)
- `components/straits/StraitQuantPanel.vue` (import)

## Resources

- **PR:** #36
- **Related:** BF-112

## Acceptance Criteria

- [ ] File and type names accurately describe their purpose
- [ ] All consumers updated to use new names
- [ ] `npm run generate` passes

## Work Log

### 2026-03-17 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified naming mismatch after MT embed removal
- Verified the remaining fields are still consumed by 2 components

**Learnings:**
- The config was originally created for MT embed coordinates; after the embed was removed, only background images and external-link coordinates remain
