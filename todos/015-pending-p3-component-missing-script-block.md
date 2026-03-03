---
status: pending
priority: p3
issue_id: "015"
tags: [code-review, quality, vue, portability, BF-71]
dependencies: []
---

# RenewablesInfographic.vue Has No Script Block

## Problem Statement

`components/infographics/RenewablesInfographic.vue` is a template-only + style component with no `<script>` section. It relies entirely on Nuxt's auto-import system to resolve `<RenewableEnergyChart />`. While this is valid and conventional in Nuxt, it makes the component non-portable -- it cannot be used outside a Nuxt project without modification, and the dependency on `RenewableEnergyChart` is implicit rather than explicit.

**Why it matters:** For a component designated as "self-contained" in the architecture vision, having an implicit dependency on auto-imports reduces self-documentation. A developer reading only this file cannot tell what `RenewableEnergyChart` is or where it comes from.

## Findings

- **Location:** `components/infographics/RenewablesInfographic.vue` -- entire file (no `<script>` block)
- **Evidence:** The template references `<RenewableEnergyChart class="chart" />` on line 8, but there is no import statement. Nuxt auto-import resolves this at build time.
- **Agent:** code-simplicity-reviewer, agent-native-reviewer
- **Impact:** Low -- works correctly with Nuxt auto-imports; this is a readability/portability concern only.

## Proposed Solutions

### Option 1: Add an explicit script block with the import
```vue
<script setup>
import RenewableEnergyChart from '~/components/RenewableEnergyChart.vue'
</script>
```
- **Pros:** Self-documenting; portable; IDE support works without Nuxt plugin
- **Cons:** Slightly more verbose; goes against Nuxt auto-import conventions
- **Effort:** Trivial
- **Risk:** None

### Option 2: Keep as-is (Nuxt convention)
- **Pros:** Follows Nuxt conventions; less code
- **Cons:** Implicit dependency; less portable
- **Effort:** None
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `components/infographics/RenewablesInfographic.vue`
- **Components:** RenewablesInfographic, RenewableEnergyChart
- **Database changes:** None

## Acceptance Criteria

- [ ] The component's dependencies are either explicitly imported or documented
- [ ] The component renders correctly on both `/` and `/embed/renewables`

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #8 code review | Template-only SFCs are valid in Nuxt but reduce self-documentation |

## Resources

- **PR:** https://github.com/ccmdesign/bfna-indopacific/pull/8
- **Files:** `components/infographics/RenewablesInfographic.vue`
