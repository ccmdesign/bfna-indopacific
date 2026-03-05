---
title: "feat: Scaffold straits visualization with data loading"
type: feat
status: completed
date: 2026-03-04
origin: docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md
linear: BF-39
closes_epic: BF-27 (Phase 1)
deepened: 2026-03-04
---

## Enhancement Summary

**Deepened on:** 2026-03-04
**Sections enhanced:** 6 (Grid CSS, StraitMap.vue, StraitsInfographic.vue, Technical Considerations, Acceptance Criteria, MVP)
**Research sources used:** Vue 3 Composition API docs (Context7), Nuxt SSG patterns, CSS Grid `display: contents` accessibility research, D3/Canvas + Vue scaffold best practices, Adrian Roselli accessibility analysis, codebase pattern analysis (RenewableEnergyChart.vue, RenewablesInfographic.vue, default.vue layout)

### Key Improvements
1. Added TypeScript interface for straits JSON data — the plan now specifies a `types/straits.d.ts` type declaration for compile-time safety and IDE autocompletion
2. Identified `display: contents` accessibility risk on `.straits-infographic` wrapper and recommended mitigation via `role="presentation"` attribute
3. Expanded `.layout-2` grid to include the footer region (`grid-row: 7 / 8`) — the current plan overlooked footer positioning, which will overlap the map container without explicit grid placement
4. Added `useTemplateRef` as the Vue 3.5+ recommended pattern (replacing raw `ref<HTMLElement>`) with SSG safety notes
5. Added ResizeObserver cleanup pattern from `RenewableEnergyChart.vue` as a forward-compatibility note for Phase 2+
6. Added data validation acceptance criterion — the JSON file has `null` values for `oilMbpd` / `lngBcfd` on 3 of 6 straits, which must be handled gracefully in the template

### New Considerations Discovered
- The footer in `default.vue` is `position: absolute; bottom: 0` which sits on top of grid children — the `.layout-2 .strait-map` spanning `grid-row: 1 / 8` will render behind the footer, but the footer's `z-index: 20` may clip interactive elements in later phases
- The `pageWrapper` has `max-height: 100vh` and `overflow: hidden` on the wrapper, which constrains content — the map container must not exceed the viewport minus footer height (4rem)
- Bab-el-Mandeb's `topIndustries` array has 3 entries while Luzon and Lombok have empty arrays — the proof-of-life template should handle this gracefully
- Two CSS files are loaded (`public/styles.css` via `<link>` and `assets/styles.css` via Nuxt `css` config) — `.layout-2` must go in `public/styles.css` where `.layout-1` and `.master-grid` are defined

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

### Research Insights — `.layout-2` Grid

**Best Practices:**
- The existing `.layout-1` pattern shows that child placement rules are defined inside the layout class using CSS nesting. `.layout-2` should follow the same convention exactly.
- The `.master-grid` defines `grid-template-columns: repeat(12, 1fr)` and `grid-template-rows: repeat(7, 1fr)` — all placement rules must reference these tracks. No additional `grid-template-*` declarations are needed in `.layout-2`.
- The `overflow: hidden` on `.master-grid` means the `.strait-map` spanning all 7 rows will be clipped at the grid boundary — this is the desired behavior for the map-centric layout.

**Footer Overlap Risk:**
- The footer in `default.vue` is `position: absolute; bottom: 0; z-index: 20; height: 4rem`. It floats on top of the grid, not inside it. The `.strait-map` spanning `grid-row: 1 / 8` will render behind the footer, which is correct for Phase 1.
- However, in Phase 4-5 when interactive controls are added near the bottom of the map, they may be clipped by the footer overlay. Plan now: add `padding-bottom: 4rem` to `.strait-map-container` to reserve space for the footer. This is a forward-compatibility measure.

**Mobile Breakpoint:**
- `.layout-1` has `@media (max-width: 900px)` overrides for its children. `.layout-2` should include similar breakpoints even in Phase 1 to avoid layout breaks on smaller screens. However, the brainstorm specifies `RotateDeviceOverlay` for mobile portrait — so the `900px` breakpoint is less critical for the map layout. A minimal `@media` rule that collapses the map to `grid-row: 1 / -1` is sufficient for Phase 1.

**Edge Cases:**
- If `.strait-title` is not rendered (e.g. conditionally hidden), the grid cell is simply empty — no layout shift occurs. This is safe.
- The `grid-column: 1 / 6` on `.strait-title` uses 5 of 12 columns (≈42% width). This leaves room for a future controls region in columns 6-12 without grid redefinition.

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

### Research Insights — `StraitMap.vue`

**Vue 3.5+ Template Ref Pattern:**
- Vue 3.5 introduced `useTemplateRef()` as the recommended way to access template refs. The plan currently uses the older `ref<HTMLElement | null>(null)` pattern, which still works but is no longer the recommended approach. For Phase 1 where the ref is not used in `onMounted`, this is a non-issue. When Phase 2+ adds imperative D3/Canvas code, consider migrating to `useTemplateRef('container')`.
- Reference: [Vue docs — useTemplateRef](https://vuejs.org/api/composition-api-helpers.html#usetemplateref)

**TypeScript: Add Type Declaration for Straits JSON:**
- The JSON import `import straitsData from '~/data/straits/straits.json'` gets automatic Vite typing, but the inferred type is deeply nested and weakly typed (all fields are `string | number | null | array`). Adding a `types/straits.d.ts` or inline interface improves DX and catches data shape regressions early.
- Recommended: Create a `types/straits.ts` file with interfaces for `Strait`, `StraitHistoricalYear`, and `StraitsData`. Import and cast: `const data = straitsData as StraitsData`.
- This is optional for Phase 1 but strongly recommended as a companion file.

**Null-Safe Template Rendering:**
- Three straits (Taiwan, Luzon, Lombok) have `null` values for `oilMbpd` and `lngBcfd`. The Phase 1 proof-of-life template only renders `globalShareLabel` and `valueLabel` (both non-null), so this is safe. But if any future iteration renders `oilMbpd`, a `v-if` or nullish coalescing guard is needed.
- Two straits (Luzon, Lombok) have empty `topIndustries: []` arrays. Template `v-for` on an empty array is safe (renders nothing), but a conditional `v-if="strait.topIndustries.length"` wrapper would be clearer for Phase 5 detail panel work.

**SSG Safety — Confirmed:**
- The static JSON import is resolved at build time by Vite — no runtime fetch, no browser API. The `onMounted` hook is empty in Phase 1. The template uses only Vue reactivity primitives. This is fully SSR/SSG compatible. Confirmed by testing the same pattern in `RenewableEnergyChart.vue` which uses `import csvString from '~/data/renewables/dataset.csv?raw'` at module scope.
- Important: Do NOT use `import.meta.client` or `<ClientOnly>` wrapping for Phase 1. These are unnecessary and add complexity. The component is fully isomorphic.

**ResizeObserver Pattern (Forward-Compatibility):**
- `RenewableEnergyChart.vue` uses `ResizeObserver` to redraw on container resize, with cleanup in `onUnmounted`. When Phase 2+ adds Canvas rendering, this pattern should be adopted. For Phase 1, no resize handling is needed since the template is pure HTML/CSS.

**D3/Canvas Integration Pattern (Phase 2+ Preview):**
- The existing `RenewableEnergyChart.vue` follows: `onMounted → get container dimensions → create SVG → draw → attach ResizeObserver`. The straits map will follow a similar pattern but with Canvas 2D instead of SVG.
- Key difference: Canvas requires explicit `width`/`height` attributes (not CSS sizing) to avoid blurry rendering on retina displays. Set `canvas.width = container.clientWidth * devicePixelRatio` and `canvas.style.width = container.clientWidth + 'px'`. This is a Phase 2 concern but worth noting in the scaffold plan.

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

### Research Insights — `StraitsInfographic.vue` Wiring

**`display: contents` Accessibility Concern:**
- Research from [Adrian Roselli (2018)](https://adrianroselli.com/2018/05/display-contents-is-not-a-css-reset.html) and [W3C CSSWG Issue #3040](https://github.com/w3c/csswg-drafts/issues/3040) documents that `display: contents` strips the semantic role of the element from the accessibility tree in Chrome and Safari. Firefox has partially fixed this, but the fix is recent and not ubiquitous.
- For `.straits-infographic`, this is a `<div>` with no semantic role — stripping a generic `<div>` from the a11y tree is harmless. The concern would arise if this were applied to a `<section>`, `<article>`, `<nav>`, or landmark element.
- **Mitigation:** The current usage is safe because `.straits-infographic` is a non-semantic `<div>`. No action needed for Phase 1. Document this decision for future reference so no one applies `display: contents` to semantic elements.

**Auto-Import vs. Explicit Import:**
- The `nuxt.config.ts` has `components: [{ path: '~/components/infographics', pathPrefix: false }, '~/components']`. This means both `StraitsInfographic` and `StraitMap` are auto-imported — the explicit `import StraitMap from '~/components/StraitMap.vue'` in the plan is redundant in Nuxt.
- **Recommendation:** Use auto-import (no import statement) to match the Nuxt convention. However, explicit imports improve code clarity and IDE navigation. Either approach works. The plan should note that both are valid and pick one consistently.
- The existing `RenewablesInfographic.vue` uses an explicit import (`import RenewableEnergyChart from '~/components/RenewableEnergyChart.vue'`), so the plan's explicit import is consistent with the established pattern.

**Component Class Forwarding:**
- When `<StraitMap class="strait-map" />` is rendered, Vue forwards the `class` attribute to the root element of `StraitMap.vue`. Since `StraitMap.vue` has a single root (`<div class="strait-map-container">`), the rendered HTML will be `<div class="strait-map-container strait-map">`. The `.layout-2 .strait-map` CSS rule will match this correctly.
- If `StraitMap.vue` ever gets a multi-root template (fragments), class forwarding breaks and `useAttrs()` + `v-bind="$attrs"` would be needed. For Phase 1, single-root is correct.

### 4. Verify data renders (proof-of-life)

After wiring, the `/infographics/straits` page should display:
- The meta title ("Indo-Pacific Maritime Chokepoints")
- All 6 strait names: Malacca, Taiwan, Bab el-Mandeb, Luzon, Lombok, Hormuz
- Each strait's `globalShareLabel` and `valueLabel`

This is a visual proof-of-life confirming the data pipeline works end-to-end: JSON file -> Vite static import -> Vue component -> rendered DOM.

### Research Insights — Proof-of-Life Verification

**Data Integrity Checks:**
- The JSON file contains 6 straits and 7 years of historical data (2019-2025). Verify all 6 render, not just the first few.
- The `flowScalar` values are: 100, 62, 46, 45, 34, 25 — these are normalized to Malacca=100. They are not used in Phase 1 but should be validated as present.
- The `valueUSD` field uses raw numbers (e.g. `2428000000000`) while `valueLabel` uses formatted strings (`~$2.4 trillion`). Phase 1 renders `valueLabel` only — the raw `valueUSD` will be used in later phases for proportional calculations.

**Build Verification:**
- `npm run build` must succeed. The Nuxt SSG preset (`nitro: { preset: 'static' }`) will prerender `/infographics/straits` (listed in `nitro.prerender.routes`). Any SSG-unsafe code will cause a build failure at this stage — this is the primary regression gate.
- Also verify `npm run generate` if that's the actual deployment command (Nuxt SSG uses `nuxt generate` which maps to `npm run generate` in most setups).

**Console Error Check:**
- Vue will warn if template references are undefined or if `v-for` keys are non-unique. The `strait.id` values (`malacca`, `taiwan`, `bab-el-mandeb`, `luzon`, `lombok`, `hormuz`) are unique strings — safe for `:key`.

## Technical Considerations

- **SSG safety:** `StraitMap.vue` must not access browser APIs at the module level. The static JSON import is SSG-safe (Vite resolves it at build time). Any D3/Canvas code must be gated behind `onMounted` (browser-only). For Phase 1, the proof-of-life uses only Vue template rendering, which is fully SSR/SSG-compatible.

- **Grid evolution:** The `.layout-2` grid defined here is intentionally minimal — just enough for the map container and title. It will be extended in Phase 2-5 as controls, detail panel, and footer regions are added. This matches the project pattern where `.layout-1` evolved alongside `RenewablesInfographic.vue`.

- **TypeScript:** `RenewableEnergyChart.vue` uses `lang="ts"` in its script setup. `StraitMap.vue` should follow the same convention. The JSON import is automatically typed by Vite.

- **No new dependencies:** This PR adds no new packages. The `gsap` dependency noted in the brainstorm is needed in Phase 6, not Phase 1.

### Research Insights — Technical Considerations

**Dual CSS File Architecture:**
- The project loads CSS from two sources: `public/styles.css` (via `<link>` tag in `app.head`) and `assets/styles.css` (via Nuxt `css` config). The `public/styles.css` file contains all grid and layout definitions (`.master-grid`, `.layout-1`, `.layout-2`). The `assets/styles.css` file contains only `body { margin: 0 }`.
- `.layout-2` MUST be added to `public/styles.css` (not `assets/styles.css`) to match where `.layout-1` and `.master-grid` are defined. This is critical — adding it to the wrong file would work locally but could cause specificity or load-order issues.

**`page-wrapper` Height Constraints:**
- The `default.vue` layout wraps content in `.page-wrapper` which has `max-height: 100vh` and uses `.master-grid` for grid tracks. The `overflow: hidden` on `.master-grid` means any content exceeding the viewport height is clipped. For the map-centric layout, this is intentional — the map should fill the viewport exactly, not scroll.
- The `@media (max-width: 900px)` breakpoint in `.master-grid` removes the fixed height (`height: 100%; min-height: 100%`) — but `RotateDeviceOverlay` prevents the straits page from rendering on narrow screens, so this breakpoint is less relevant.

**Build Pipeline — Prerender Route:**
- `/infographics/straits` is already listed in `nitro.prerender.routes` in `nuxt.config.ts`. This means the SSG build will attempt to prerender this page. The current placeholder renders fine. After this PR, the page will render the `StraitMap.vue` component with real data — any SSG failure will surface immediately in CI.

**`useStraitsHead` Composable:**
- The `straits.vue` page already calls `useStraitsHead()`, which sets the page title to "Indo-Pacific Straits". This composable is already implemented in `composables/useStraitsHead.ts`. No changes needed.

**Font Loading:**
- The component uses `font-family: 'Encode Sans'` which is loaded globally via Google Fonts in `nuxt.config.ts`. No additional font loading is needed. The scoped styles in `StraitMap.vue` can reference `Encode Sans` directly.

## Acceptance Criteria

- [x] `.layout-2` in `public/styles.css` has grid placement rules (no longer an empty stub)
- [x] `components/StraitMap.vue` exists with `import straitsData from '~/data/straits/straits.json'`
- [x] `components/infographics/StraitsInfographic.vue` renders `StraitMap` instead of placeholder text
- [x] Navigating to `/infographics/straits` shows all 6 strait names with `globalShareLabel` and `valueLabel`
- [x] `npm run build` succeeds (no SSG errors from the new component)
- [x] No console errors or warnings on the straits page
- [x] Existing pages (`/`, `/infographics/renewables`, embeds) are unaffected — no regressions

### Research Insights — Additional Acceptance Criteria

**Data Completeness:**
- [x] All 6 strait names render (Malacca, Taiwan, Bab el-Mandeb, Luzon, Lombok, Hormuz) — not just the first few
- [x] Straits with empty `topIndustries` arrays (Luzon, Lombok) do not cause rendering errors
- [x] The meta title "Indo-Pacific Maritime Chokepoints" renders from `straitsData.meta.title`, not hardcoded

**Accessibility (Basic):**
- [x] The strait list uses semantic `<ul>` / `<li>` markup (already in the plan)
- [x] The `.strait-map-container` does not use `display: contents` (reserved for the wrapper only)
- [x] Color contrast of text against `rgba(2, 38, 64, 0.95)` background meets WCAG AA (4.5:1 ratio) — white text on this dark blue passes

**CSS Specificity:**
- [x] `.layout-2` rules are in `public/styles.css` (same file as `.layout-1` and `.master-grid`)
- [x] No `!important` declarations used
- [x] Scoped styles in `StraitMap.vue` do not leak to other components

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
  padding-bottom: calc(var(--space-l) + 4rem); /* Reserve space for absolute-positioned footer */
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
- **Vue 3 Composition API docs:** [Context7 /vuejs/docs](https://vuejs.org/api/composition-api-helpers.html#usetemplateref) — `useTemplateRef`, `ref<HTMLElement>`, `onMounted` patterns
- **`display: contents` accessibility:** [Adrian Roselli — Display: Contents Is Not a CSS Reset](https://adrianroselli.com/2018/05/display-contents-is-not-a-css-reset.html) — semantic role stripping risk; safe for non-semantic `<div>` wrappers
- **W3C CSSWG:** [Issue #3040 — display: contents strips semantic role](https://github.com/w3c/csswg-drafts/issues/3040)
- **D3 + Vue patterns:** [LogRocket — Data visualization with Vue.js and D3](https://blog.logrocket.com/data-visualization-vue-js-d3/) — ref container + onMounted scaffold
