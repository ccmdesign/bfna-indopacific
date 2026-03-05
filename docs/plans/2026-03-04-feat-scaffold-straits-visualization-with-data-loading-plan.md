---
title: "feat: Scaffold straits visualization with data loading"
type: feat
status: active
date: 2026-03-04
origin: docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md
linear: BF-39
closes_epic: BF-27 (Phase 1)
---

# feat: Scaffold straits visualization with data loading

## Overview

Complete Phase 1 scaffolding for the straits infographic by filling in the `.layout-2` CSS grid stub, creating the `StraitMap.vue` component with static data loading, wiring it into the existing `StraitsInfographic.vue` placeholder, and proving data renders correctly. This bundles the remainder of BF-38 (`.layout-2` grid) with BF-39 (component scaffolding) into a single PR.

## Problem Statement / Motivation

The straits infographic page (`/infographics/straits`) currently renders a placeholder with "Coming soon" text. The routing, layout system, and data file (`data/straits/straits.json`) are already in place, but:

1. The `.layout-2` CSS grid in `public/styles.css` is an empty stub (lines 67-70) — it has no grid track definitions, so children of the straits page have no positioning rules.
2. No `StraitMap.vue` component exists yet — the brainstorm specifies this as the primary visualization component that loads and renders strait data.
3. `StraitsInfographic.vue` is a placeholder with hardcoded text instead of wiring up real data.

All downstream work (particle system, GSAP intro, detail panel) is blocked until this scaffolding exists. (see brainstorm: `docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md`, Phase 1 tasks 6-9)

## Proposed Solution

A single PR with four changes:

### 1. Define `.layout-2` CSS grid in `public/styles.css`

Replace the empty `.layout-2` stub with a grid definition tailored for the map-centric straits layout. The brainstorm specifies it uses the same `.master-grid` base (`100svw x 100svh`, `min-height: 1080px`) but with a different column/row definition.

**Target file:** `public/styles.css` (lines 66-70)

**Grid design:** The straits infographic is map-dominant — the map fills most of the viewport. The grid should provide:
- A full-bleed area for the map/canvas container
- A region for the title overlay (top-left)
- A region for the controls strip (bottom or side)
- A region for the detail panel (right overlay, later phases)

Proposed grid (can be refined as Phase 2-5 components land):

```css
.layout-2 {
  .strait-map {
    grid-row: 1 / 8;
    grid-column: 1 / -1;
  }

  .strait-title {
    grid-row: 1 / 2;
    grid-column: 1 / 6;
    z-index: 1;
    align-self: end;
    padding: 0 var(--space-l);
  }
}
```

**Note:** The grid tracks (12 columns x 7 rows) are inherited from `.master-grid`. `.layout-2` only needs to define placement rules for named children — matching the pattern of `.layout-1`.

### 2. Create `components/StraitMap.vue`

**Target file:** `components/StraitMap.vue` (new file)

Follow the same `<div ref="container">` + imperative-in-`onMounted` pattern as `RenewableEnergyChart.vue` (see brainstorm: Phase 1 task #9).

```vue
<script setup lang="ts">
import straitsData from '~/data/straits/straits.json'
import { onMounted, ref } from 'vue'

const container = ref<HTMLElement | null>(null)

// Proof-of-life: expose data for template rendering
const straits = straitsData.straits
const meta = straitsData.meta
</script>

<template>
  <div ref="container" class="strait-map-container">
    <!-- Phase 1: proof-of-life rendering -->
    <h2 class="map-title">{{ meta.title }}</h2>
    <ul class="strait-list">
      <li v-for="strait in straits" :key="strait.id" class="strait-item">
        <strong>{{ strait.name }}</strong>
        <span class="strait-meta">{{ strait.globalShareLabel }}</span>
        <span class="strait-value">{{ strait.valueLabel }}</span>
      </li>
    </ul>
  </div>
</template>
```

**Key decisions from brainstorm carried forward:**
- Static import `import straitsData from '~/data/straits/straits.json'` — bundled at build time via Vite, no async fetch (see brainstorm: "Data source" decision)
- Data lives at `data/straits/straits.json` (already exists at that path, confirmed in repo)
- Component follows `<div ref="container">` pattern for later D3/Canvas imperative code in `onMounted`

### 3. Wire `StraitMap.vue` into `StraitsInfographic.vue`

**Target file:** `components/infographics/StraitsInfographic.vue`

Replace the placeholder content with the real component:

```vue
<script setup>
import StraitMap from '~/components/StraitMap.vue'
</script>

<template>
  <div class="straits-infographic">
    <StraitMap class="strait-map" />
  </div>
</template>
```

The `class="strait-map"` maps to the `.layout-2 .strait-map` grid placement rule. The `display: contents` pattern on `.straits-infographic` is preserved so children participate in the parent grid (matching `RenewablesInfographic.vue` pattern).

### 4. Verify data renders (proof-of-life)

After wiring, the `/infographics/straits` page should display:
- The meta title ("Indo-Pacific Maritime Chokepoints")
- All 6 strait names: Malacca, Taiwan, Bab el-Mandeb, Luzon, Lombok, Hormuz
- Each strait's `globalShareLabel` and `valueLabel`

This is a visual proof-of-life confirming the data pipeline works end-to-end: JSON file -> Vite static import -> Vue component -> rendered DOM.

## Technical Considerations

- **SSG safety:** `StraitMap.vue` must not access browser APIs at the module level. The static JSON import is SSG-safe (Vite resolves it at build time). Any D3/Canvas code must be gated behind `onMounted` (browser-only). For Phase 1, the proof-of-life uses only Vue template rendering, which is fully SSR/SSG-compatible.

- **Grid evolution:** The `.layout-2` grid defined here is intentionally minimal — just enough for the map container and title. It will be extended in Phase 2-5 as controls, detail panel, and footer regions are added. This matches the project pattern where `.layout-1` evolved alongside `RenewablesInfographic.vue`.

- **TypeScript:** `RenewableEnergyChart.vue` uses `lang="ts"` in its script setup. `StraitMap.vue` should follow the same convention. The JSON import is automatically typed by Vite.

- **No new dependencies:** This PR adds no new packages. The `gsap` dependency noted in the brainstorm is needed in Phase 6, not Phase 1.

## Acceptance Criteria

- [ ] `.layout-2` in `public/styles.css` has grid placement rules (no longer an empty stub)
- [ ] `components/StraitMap.vue` exists with `import straitsData from '~/data/straits/straits.json'`
- [ ] `components/infographics/StraitsInfographic.vue` renders `StraitMap` instead of placeholder text
- [ ] Navigating to `/infographics/straits` shows all 6 strait names with `globalShareLabel` and `valueLabel`
- [ ] `npm run build` succeeds (no SSG errors from the new component)
- [ ] No console errors or warnings on the straits page
- [ ] Existing pages (`/`, `/infographics/renewables`, embeds) are unaffected — no regressions

## MVP

### File 1: `public/styles.css` — replace `.layout-2` stub

```css
/* layout-2: straits infographic grid — map-centric layout */
.layout-2 {
  .strait-map {
    grid-row: 1 / 8;
    grid-column: 1 / -1;
  }

  .strait-title {
    grid-row: 1 / 2;
    grid-column: 1 / 6;
    z-index: 1;
    align-self: end;
    padding: 0 var(--space-l);
  }
}
```

### File 2: `components/StraitMap.vue` (new)

```vue
<script setup lang="ts">
import straitsData from '~/data/straits/straits.json'
import { ref } from 'vue'

const container = ref<HTMLElement | null>(null)

const straits = straitsData.straits
const meta = straitsData.meta
</script>

<template>
  <div ref="container" class="strait-map-container">
    <h2 class="map-title">{{ meta.title }}</h2>
    <ul class="strait-list">
      <li v-for="strait in straits" :key="strait.id" class="strait-item">
        <strong>{{ strait.name }}</strong>
        <span class="strait-meta">{{ strait.globalShareLabel }}</span>
        <span class="strait-value">{{ strait.valueLabel }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.strait-map-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-l);
  color: rgba(255, 255, 255, 0.9);
}

.map-title {
  font-family: 'Encode Sans', sans-serif;
  font-size: var(--size-3);
  font-weight: 600;
  margin-bottom: var(--space-m);
}

.strait-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-m);
  width: 100%;
  max-width: 1200px;
}

.strait-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  padding: var(--space-m);
  background: rgba(2, 38, 64, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.strait-item strong {
  font-size: var(--size-1);
}

.strait-meta {
  font-size: var(--size-0);
  color: rgba(255, 255, 255, 0.6);
}

.strait-value {
  font-size: var(--size-0);
  color: hsl(218, 60%, 58%);
  font-weight: 600;
}
</style>
```

### File 3: `components/infographics/StraitsInfographic.vue` (replace)

```vue
<script setup>
import StraitMap from '~/components/StraitMap.vue'
</script>

<template>
  <div class="straits-infographic">
    <StraitMap class="strait-map" />
  </div>
</template>

<style scoped>
.straits-infographic {
  display: contents;
}
</style>
```

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md](docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md) — Key decisions carried forward: static Vite JSON import from `data/straits/`, `StraitMap.vue` follows `<div ref="container">` + imperative pattern, `.layout-2` uses `.master-grid` base with map-centric grid tracks
- **Phase 1 epic:** [docs/epics/BF-3-phase-1-scaffolding.md](docs/epics/BF-3-phase-1-scaffolding.md)
- **Layout-2 TODO:** [todos/017-pending-p2-missing-layout-2-css-grid.md](todos/017-pending-p2-missing-layout-2-css-grid.md) — resolves this tracked issue
- **Existing pattern reference:** `components/RenewableEnergyChart.vue` (D3 imperative + `ref` container)
- **Existing pattern reference:** `components/infographics/RenewablesInfographic.vue` (`display: contents` wrapper)
- **Data file:** `data/straits/straits.json` (6 straits, 7 years of historical data)
- **Page route:** `pages/infographics/straits.vue` (already sets `layoutClass: 'layout-2'`)
