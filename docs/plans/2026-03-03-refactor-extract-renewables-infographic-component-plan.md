---
title: "refactor: Extract renewables infographic into reusable component"
type: refactor
status: active
date: 2026-03-03
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
depends_on:
  - docs/plans/2026-03-03-feat-create-embed-layout-plan.md
  - docs/plans/2026-03-03-feat-extract-shared-layout-into-default-vue-plan.md
---

# refactor: Extract renewables infographic into reusable component

## Overview

Move the renewables infographic content from `pages/index.vue` into a new self-contained component at `components/infographics/RenewablesInfographic.vue`. Both the infographic page route (`pages/infographics/renewables.vue`) and the embed page route (`pages/embed/renewables.vue`) will render this single component, establishing a single source of truth for the renewables infographic.

This is a prerequisite for the multi-infographic hub architecture defined in the brainstorm (see brainstorm: `docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md`, Key Decisions > Routing & Layouts).

## Problem Statement / Motivation

The current renewables infographic content lives directly in `pages/index.vue` (the page component). This creates two problems:

1. **Duplication risk.** When the embed route (`pages/embed/renewables.vue`) needs to render the same infographic, the content would need to be duplicated in a second page file -- violating single source of truth and creating drift risk.

2. **Coupling.** The infographic markup, styles, and page metadata (title, layout class, footer source) are interleaved in one file. Extracting the infographic into its own component cleanly separates the *content* (what the infographic shows) from the *context* (how the page frames it -- layout, metadata, head tags).

The brainstorm explicitly calls for this pattern: "Each infographic is a self-contained Vue component living in `components/infographics/`" and "Both route patterns render the same infographic component, ensuring a single source of truth per infographic" (see brainstorm: Architecture section).

## Proposed Solution

### Step 1: Create `components/infographics/RenewablesInfographic.vue`

Create a new directory `components/infographics/` and a component file that contains all the visual and interactive content currently in `pages/index.vue`.

**What moves into the component:**
- The `<template>` content: `.description` block (title, paragraphs, source description), `<RenewableEnergyChart />` usage, and `.bg-image` block
- The `<style scoped>` block: `.bg-image`, `@keyframes float`, `@media (prefers-reduced-motion)`, `.source-description` styles

**What stays in the page file (does NOT move):**
- `definePageMeta()` call (layout class, footer source, showBackLink) -- this is page-level routing metadata
- `useHead()` call (title, font stylesheet link) -- this is page-level head management
- The `<script setup>` imports for `useHead` from `#app`

**Component file: `components/infographics/RenewablesInfographic.vue`**

```vue
<template>
  <div class="renewables-infographic">
    <div class="description">
      <h1 class="title">Renewables on the Rise</h1>
      <p>Amid rising concerns about climate change and energy security, a growing number of states have invested in expanding renewable energy infrastructure. This has been especially visible in the Indo-Pacific, where several countries have become global leaders in solar, wind, hydroelectric and geothermal power generation. However, not every state in the region has embraced renewables so enthusiastically. This infographic displays the 2024 renewable energy usage percentages of the region's largest economies, alongside those of the United States and European Union.</p>
      <p class="source-description"><em>Percentage of electricity produced from renewable sources, which include solar, wind, hydropower, bioenergy, geothermal, wave, and tidal.</em></p>
    </div>
    <RenewableEnergyChart class="chart" />
    <div class="bg-image">
      <img src="@/assets/images/background.png" alt="" role="presentation" />
    </div>
  </div>
</template>

<style scoped>
.bg-image {
  --size: 75svh;
  max-width: var(--size);
  aspect-ratio: 1 / 1;
  position: absolute;
  top: calc(var(--size) / 6);
  left: calc(var(--size) / -2);
  z-index: 0;
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0svh);
  }
  50% {
    transform: translateY(-1svh);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bg-image {
    animation: none;
  }
}

.source-description {
  font-size: 0.875rem;
  opacity: 0.6;
}
</style>
```

**Design decision -- wrapper `<div>` element:** The component wraps its content in a single root `<div class="renewables-infographic">`. This is important because:
- Nuxt auto-imports components and they need a single root for transitions
- The page files using this component may need to apply classes or styles to it
- It provides a clean selector boundary for scoped styles

**Design decision -- no props:** The renewables infographic is a self-contained, static-data component. It imports its own data (`RenewableEnergyChart` already imports `~/data/renewables/dataset.csv?raw` internally). No props are needed. This matches the brainstorm's vision of "self-contained Vue components."

### Step 2: Update `pages/index.vue` to use the new component

Replace the inline template content with the extracted component. The page file becomes a thin wrapper that sets metadata and renders the component.

**File: `pages/index.vue` (after refactor)**

```vue
<script setup>
import { useHead } from '#app'

definePageMeta({
  layoutClass: 'layout-1',
  showBackLink: false,
  footerSource: {
    url: 'https://ourworldindata.org/grapher/share-of-electricity-production-from-renewable-sources?time=earliest..2024&country=CHN~JPN~IND~KOR~AUS~IDN~TWN~THA~USA~EU+%28Ember%29',
    label: 'Source: Our World in Data'
  }
})

useHead({
  title: 'Renewables on the Rise',
  link: [
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap' }
  ]
})
</script>

<template>
  <RenewablesInfographic />
</template>
```

**Note:** `pages/index.vue` is being used as a temporary location for the renewables infographic. A follow-up task will move this to `pages/infographics/renewables.vue` and replace `pages/index.vue` with the homepage hub. This plan intentionally does NOT restructure routes -- it only extracts the component.

### Step 3: Create `pages/embed/renewables.vue`

Create the embed page route that renders the same component but with the embed layout.

**File: `pages/embed/renewables.vue`**

```vue
<script setup>
import { useHead } from '#app'

definePageMeta({
  layout: 'embed',
  layoutClass: 'layout-1'
})

useHead({
  title: 'Renewables on the Rise',
  link: [
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap' }
  ]
})
</script>

<template>
  <RenewablesInfographic />
</template>
```

**Key differences from the infographic page:**
- `layout: 'embed'` -- uses the embed layout (no footer, no back-link)
- No `showBackLink` or `footerSource` metadata -- these are irrelevant in the embed layout
- Same `layoutClass: 'layout-1'` -- the CSS grid layout class is needed for both contexts

### Step 4: Verify the grid class propagation

The existing `pages/index.vue` renders its template content as direct children of the `<slot />` in `layouts/default.vue`. After this refactor, the content is wrapped in `<div class="renewables-infographic">`. Verify that the CSS grid layout (`layout-1` class on `.master-grid`) still positions elements correctly with the extra wrapper div.

**Risk:** The current `layout-1` grid likely uses direct child selectors or grid placement on immediate children. Adding a wrapper `<div>` introduces an intermediate element that may break grid placement.

**Mitigation:** If grid placement breaks, the component's root element should receive the grid classes or use `display: contents` to make it transparent to the grid. The specific approach depends on how `.layout-1` defines its grid (check `public/styles.css` or `assets/styles.css` for the grid definition). This should be tested during implementation.

## Technical Considerations

### Nuxt Auto-Import

Nuxt auto-imports components from `components/`. Since the new component lives at `components/infographics/RenewablesInfographic.vue`, Nuxt will auto-register it as `<InfographicsRenewablesInfographic />` by default (path-prefixed). To use it as `<RenewablesInfographic />` instead, there are two options:

1. **Recommended: Use the path-prefixed name.** Accept `<InfographicsRenewablesInfographic />` in the page files. This is explicit and avoids configuration.

2. **Alternative: Configure `pathPrefix: false`** in `nuxt.config.ts` for the `components/infographics/` directory. This lets you use `<RenewablesInfographic />` but affects all subdirectory components.

3. **Alternative: Flatten to `components/RenewablesInfographic.vue`** -- skips the subdirectory entirely. Simpler auto-import but loses the organizational grouping for future infographics.

The implementer should decide based on preference. The brainstorm specifies `components/infographics/` as the directory, so option 1 or 2 are aligned with the brainstorm.

### Asset Paths

The component uses `@/assets/images/background.png` via the `<img>` tag. This Vite alias (`@` = project root) works identically whether the component lives in `components/` or `pages/` -- no path changes needed.

The `RenewableEnergyChart` component imports `~/data/renewables/dataset.csv?raw` -- this also uses a Vite alias and is unaffected by the move.

### Scoped Styles

The `.bg-image`, `@keyframes float`, and `.source-description` styles are currently scoped to `pages/index.vue`. Moving them into the component's `<style scoped>` block maintains identical scoping behavior. No global style conflicts expected.

### SSR / Static Generation

The `RenewableEnergyChart` component uses D3 in `onMounted()` (client-side only). This pattern is already SSR-safe and unaffected by the extraction. The component will behave identically whether rendered from a page file or from a component within a page file.

### Pages Directory Structure

After this refactor, the `pages/` directory will contain:

```
pages/
  index.vue              (existing -- now thin wrapper)
  embed/
    renewables.vue       (new -- embed route)
```

This aligns with the brainstorm's routing structure for embed routes. The `pages/infographics/renewables.vue` route and the homepage hub are separate follow-up tasks.

## Acceptance Criteria

- [ ] `components/infographics/RenewablesInfographic.vue` exists and contains all visual/interactive content from the current `pages/index.vue` template
- [ ] `pages/index.vue` is a thin wrapper: `<script setup>` with `definePageMeta()` and `useHead()`, `<template>` rendering only the infographic component
- [ ] `pages/embed/renewables.vue` exists and renders the same `RenewablesInfographic` component with `layout: 'embed'`
- [ ] The renewables infographic at `/` renders identically to before the refactor (visual regression check)
- [ ] The renewables infographic at `/embed/renewables` renders correctly inside the embed layout (no footer, no back-link, background gradient present)
- [ ] `nuxt generate` (static build) completes without errors
- [ ] The `RenewableEnergyChart` D3 chart renders correctly in both routes (hover interactions, tooltips, resize behavior all functional)
- [ ] The floating background image animation plays in both routes (and respects `prefers-reduced-motion`)
- [ ] No duplicate content exists -- `pages/index.vue` and `pages/embed/renewables.vue` both reference the component, neither contains inline infographic markup

## Dependencies & Risks

### Dependencies

- **BF-69 (completed):** `layouts/default.vue` must exist with the shared visual identity (background gradient, footer, back-link). Already done.
- **BF-70 (completed):** `layouts/embed.vue` must exist with the stripped-down embed layout. Already done.
- **Nuxt file-based routing:** The `pages/` directory must be active (Nuxt auto-detects it). Already active since prior work introduced `pages/index.vue`.

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Grid layout breaks with wrapper div | Medium | Medium | Test immediately; use `display: contents` or pass grid classes if needed |
| Nuxt auto-import naming confusion | Low | Low | Decide naming convention upfront; document in component file comment |
| Scoped style specificity changes | Low | Low | Visual comparison before/after; styles are self-contained |

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md](docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md) -- Key decisions carried forward: (1) self-contained infographic components in `components/infographics/`, (2) both page and embed routes render the same component, (3) `layouts/embed.vue` strips site chrome.

### Internal References

- Current infographic page: `pages/index.vue` (source of content to extract)
- Chart component: `components/RenewableEnergyChart.vue` (already a component, used by the infographic)
- Default layout: `layouts/default.vue` (provides page chrome for infographic route)
- Embed layout: `layouts/embed.vue` (provides embed chrome for embed route)
- Dataset: `data/renewables/dataset.csv` (imported by `RenewableEnergyChart`)
- Background image: `assets/images/background.png` (used in infographic template)

### Related Plans

- Embed layout plan (BF-70, completed): `docs/plans/2026-03-03-feat-create-embed-layout-plan.md`
- Default layout extraction plan (BF-69, completed): `docs/plans/2026-03-03-feat-extract-shared-layout-into-default-vue-plan.md`
- Nuxt routing plan: `docs/plans/2026-03-03-feat-introduce-nuxt-file-based-routing-plan.md`
- Data consolidation plan: `docs/plans/2026-03-03-refactor-consolidate-datasets-into-data-folder-plan.md`
