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

## Enhancement Summary

**Deepened on:** 2026-03-03
**Sections enhanced:** 7
**Research sources used:** Nuxt official docs (Context7), Vue best practices skill, Nuxt skill, accessibility skill, design-motion-principles skill, presentation-logic-split skill, CSS Grid/Subgrid MDN docs, web research

### Key Improvements
1. Resolved the grid layout / wrapper div risk definitively: codebase analysis of `public/styles.css` confirms `.layout-1` uses class-based grid placement (`.description`, `.chart`, `.bg-image`), meaning `display: contents` on the wrapper div is the correct and required solution
2. Upgraded the Nuxt auto-import recommendation from "implementer decides" to a concrete recommendation: use `pathPrefix: false` scoped only to `components/infographics/` to keep `<RenewablesInfographic />` clean while preserving default behavior elsewhere
3. Added concrete guidance on the `useHead` duplication issue: the Inter font `<link>` tag appears in both page files and should use a `key` attribute to prevent duplicate stylesheet injection during client-side navigation
4. Added accessibility research insights: `display: contents` had historical a11y bugs stripping semantic roles, but these are fixed in all current browsers (Chrome 89+, Firefox 62+, Safari 16+) -- the wrapper div uses a non-semantic `<div>` so impact is negligible
5. Added new risk: `nuxt generate` must explicitly discover the `/embed/renewables` route since no `<NuxtLink>` points to it -- requires `nitro.prerender.routes` configuration or a crawl hint

### New Considerations Discovered
- The floating animation uses `svh` units which need verification in the embed iframe context (viewport units inside iframes can behave unexpectedly)
- CSS Subgrid (97% browser support) is a future alternative to `display: contents` if more complex nested grid alignment is needed
- The embed page should consider adding `<meta name="robots" content="noindex">` to prevent search engines from indexing the stripped-down embed version

## Overview

Move the renewables infographic content from `pages/index.vue` into a new self-contained component at `components/infographics/RenewablesInfographic.vue`. Both the infographic page route (`pages/infographics/renewables.vue`) and the embed page route (`pages/embed/renewables.vue`) will render this single component, establishing a single source of truth for the renewables infographic.

This is a prerequisite for the multi-infographic hub architecture defined in the brainstorm (see brainstorm: `docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md`, Key Decisions > Routing & Layouts).

## Problem Statement / Motivation

The current renewables infographic content lives directly in `pages/index.vue` (the page component). This creates two problems:

1. **Duplication risk.** When the embed route (`pages/embed/renewables.vue`) needs to render the same infographic, the content would need to be duplicated in a second page file -- violating single source of truth and creating drift risk.

2. **Coupling.** The infographic markup, styles, and page metadata (title, layout class, footer source) are interleaved in one file. Extracting the infographic into its own component cleanly separates the *content* (what the infographic shows) from the *context* (how the page frames it -- layout, metadata, head tags).

The brainstorm explicitly calls for this pattern: "Each infographic is a self-contained Vue component living in `components/infographics/`" and "Both route patterns render the same infographic component, ensuring a single source of truth per infographic" (see brainstorm: Architecture section).

### Research Insights

**Presentation / Logic Split Pattern (Vue best practices):**
- This refactor correctly applies the presentation/logic split: the `RenewablesInfographic` component is a pure presentation component (no API calls, no composables, no browser APIs beyond what D3 uses internally via `RenewableEnergyChart`). The page files act as thin integration layers wiring metadata to the presentation.
- No further splitting is needed -- the component is already "self-contained static data" which is the correct pattern for infographic content that does not fetch data at runtime.

**Architecture Pattern Validation:**
- The "thin page wrapper + reusable content component" pattern is a well-established Nuxt convention. Page files own routing concerns (`definePageMeta`, `useHead`), while components own visual/interactive content. This aligns with Nuxt's intended separation of concerns.

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
.renewables-infographic {
  display: contents;
}

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

### Research Insights: The `display: contents` Solution

**Codebase analysis confirms the grid layout risk and its solution:**

The layout grid in `public/styles.css` defines `.layout-1` with class-based grid placement rules:
```css
.layout-1 .description { grid-row: 1 / 3; grid-column: 4 / 12; }
.layout-1 .chart { grid-row: 3 / 8; grid-column: 4 / 11; }
.layout-1 .bg-image { grid-row: 1 / 8; grid-column: 1 / 7; }
```

Currently, `pages/index.vue` has **no wrapper div** -- its template children (`.description`, `.chart`, `.bg-image`) are direct children of the layout's `<slot />`, making them direct children of `.master-grid`. After extraction, these elements become grandchildren of the grid (wrapped inside `<div class="renewables-infographic">`).

**The fix:** Apply `display: contents` on the component's root `<div class="renewables-infographic">`. This CSS property makes the element's box disappear from the layout, causing its children to participate in the parent grid as if they were direct children. The grid placement rules in `.layout-1` target classes (`.description`, `.chart`, `.bg-image`), not child indices, so they will match correctly once the wrapper is transparent.

**Browser support:** `display: contents` has broad support (Chrome 65+, Firefox 37+, Safari 11.1+, Edge 79+). Historical accessibility bugs that stripped semantic roles from elements with `display: contents` have been fixed in all current browsers (Chrome 89+, Firefox 62+, Safari 16+). Since the wrapper is a non-semantic `<div>`, accessibility impact is negligible regardless.

**Why not CSS Subgrid?** CSS Subgrid (97% browser support as of 2026) is a more powerful alternative for nested grid alignment but is overkill here. `display: contents` is the simpler, correct tool when the goal is to make a wrapper transparent to the parent grid. Subgrid would be appropriate if the component needed its own grid tracks that aligned with the parent's tracks.

**Design decision -- wrapper `<div>` element:** The component wraps its content in a single root `<div class="renewables-infographic">`. This is important because:
- Nuxt auto-imports components and they need a single root for transitions
- The page files using this component may need to apply classes or styles to it
- It provides a clean selector boundary for scoped styles
- With `display: contents`, it remains structurally present in the DOM but visually transparent to the grid

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
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap', key: 'inter-font' }
  ]
})
</script>

<template>
  <RenewablesInfographic />
</template>
```

**Note:** `pages/index.vue` is being used as a temporary location for the renewables infographic. A follow-up task will move this to `pages/infographics/renewables.vue` and replace `pages/index.vue` with the homepage hub. This plan intentionally does NOT restructure routes -- it only extracts the component.

### Research Insights: useHead Deduplication

**Best Practice:** Both `pages/index.vue` and `pages/embed/renewables.vue` inject the same Inter font stylesheet via `useHead`. Nuxt's head management (powered by Unhead) supports a `key` attribute on link tags to prevent duplicate injection during client-side navigation. Adding `key: 'inter-font'` to the link object ensures that if a user navigates between pages that both declare this stylesheet, only one `<link>` tag is present in the document head at any time.

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
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap', key: 'inter-font' }
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

### Research Insights: Embed Route Considerations

**Static generation route discovery:** The `nuxt generate` command discovers routes by crawling `<NuxtLink>` references starting from `/`. Since no page links to `/embed/renewables`, this route will NOT be discovered by the crawler and will NOT be pre-rendered unless explicitly configured. Add the route to `nitro.prerender.routes` in `nuxt.config.ts`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  // ... existing config ...
  nitro: {
    preset: 'static',
    prerender: {
      routes: ['/embed/renewables']
    }
  }
})
```

**SEO for embed routes:** Embed pages are designed to be loaded inside `<iframe>` elements on third-party sites and should not appear in search engine results. Consider adding `noindex` to the embed page's head:

```ts
useHead({
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
```

This prevents the stripped-down embed version from competing with or cannibalizing the full infographic page in search results.

**Viewport units inside iframes:** The floating background image uses `svh` (small viewport height) units for its `--size` custom property and `@keyframes float` animation. Inside an iframe, viewport units resolve to the iframe's dimensions, not the parent page's viewport. This is generally correct behavior for embeds (the animation scales to the iframe size), but should be tested with typical embed dimensions (e.g., `800x600`, `1200x800`) to ensure the image sizing and animation amplitude look appropriate at those sizes.

### Step 4: Verify the grid class propagation

The existing `pages/index.vue` renders its template content as direct children of the `<slot />` in `layouts/default.vue`. After this refactor, the content is wrapped in `<div class="renewables-infographic">`. Verify that the CSS grid layout (`layout-1` class on `.master-grid`) still positions elements correctly with the extra wrapper div.

**Risk:** The current `layout-1` grid likely uses direct child selectors or grid placement on immediate children. Adding a wrapper `<div>` introduces an intermediate element that may break grid placement.

**Mitigation:** If grid placement breaks, the component's root element should receive the grid classes or use `display: contents` to make it transparent to the grid. The specific approach depends on how `.layout-1` defines its grid (check `public/styles.css` or `assets/styles.css` for the grid definition). This should be tested during implementation.

### Research Insights: Grid Propagation -- Definitive Analysis

**Codebase analysis confirms the risk is real and the mitigation is straightforward.**

Examining `public/styles.css`, the `.master-grid` defines a 12-column, 7-row CSS grid:

```css
.master-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(7, 1fr);
  overflow: hidden;
}
```

And `.layout-1` places children by class name:

```css
.layout-1 .description { grid-row: 1 / 3; grid-column: 4 / 12; ... }
.layout-1 .chart { grid-row: 3 / 8; grid-column: 4 / 11; ... }
.layout-1 .bg-image { grid-row: 1 / 8; grid-column: 1 / 7; ... }
```

**Before refactor:** The layout slot renders `.description`, `RenewableEnergyChart.chart`, and `.bg-image` as direct children of `.master-grid.layout-1`. The grid placement rules match because CSS descendant selectors (`.layout-1 .description`) match any descendant, not just direct children.

**After refactor (without `display: contents`):** The wrapper `<div class="renewables-infographic">` becomes the only direct grid child. It would receive automatic grid placement (filling one cell), and its children would NOT participate in the parent grid. The `.layout-1 .description` selector would still match (descendant selector), but the `grid-row`/`grid-column` properties only take effect on grid items -- and `.description` would no longer be a grid item. The layout would break.

**After refactor (with `display: contents`):** The wrapper's box is removed from the layout. Its children (`.description`, `.chart`, `.bg-image`) become direct grid items of `.master-grid`. The `.layout-1 .description` descendant selectors match, and the grid placement rules take effect correctly. The layout is preserved.

**Verification step during implementation:** After adding `display: contents`, visually compare the rendered page at `/` with a screenshot from before the refactor. The layout should be pixel-identical. Also verify at `/embed/renewables` where the same grid applies via `layouts/embed.vue`.

## Technical Considerations

### Nuxt Auto-Import

Nuxt auto-imports components from `components/`. Since the new component lives at `components/infographics/RenewablesInfographic.vue`, Nuxt will auto-register it as `<InfographicsRenewablesInfographic />` by default (path-prefixed). To use it as `<RenewablesInfographic />` instead, there are two options:

1. **Recommended: Use the path-prefixed name.** Accept `<InfographicsRenewablesInfographic />` in the page files. This is explicit and avoids configuration.

2. **Alternative: Configure `pathPrefix: false`** in `nuxt.config.ts` for the `components/infographics/` directory. This lets you use `<RenewablesInfographic />` but affects all subdirectory components.

3. **Alternative: Flatten to `components/RenewablesInfographic.vue`** -- skips the subdirectory entirely. Simpler auto-import but loses the organizational grouping for future infographics.

The implementer should decide based on preference. The brainstorm specifies `components/infographics/` as the directory, so option 1 or 2 are aligned with the brainstorm.

### Research Insights: Auto-Import Recommendation

**Nuxt official docs confirm** the `pathPrefix` configuration (via Context7, Nuxt docs):

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  components: [
    { path: '~/components/infographics', pathPrefix: false },
    '~/components'
  ]
})
```

**Refined recommendation:** Use option 2 (`pathPrefix: false`) but **scoped only to the `infographics/` subdirectory**. This keeps `<RenewablesInfographic />` as the component name (matching the plan and brainstorm), while preserving default path-prefixed behavior for all other component subdirectories. The configuration must list the subdirectory entry **before** the default `~/components` entry, since Nuxt processes them in order.

**Important caveat:** When using the extended components configuration, you must explicitly include the default `'~/components'` entry (listed last) to maintain auto-import for all existing components (`RenewableEnergyChart`, `GridCounter`, `GridOverlay`, `RotateDeviceOverlay`). Without it, only the explicitly listed directories are scanned.

### Asset Paths

The component uses `@/assets/images/background.png` via the `<img>` tag. This Vite alias (`@` = project root) works identically whether the component lives in `components/` or `pages/` -- no path changes needed.

The `RenewableEnergyChart` component imports `~/data/renewables/dataset.csv?raw` -- this also uses a Vite alias and is unaffected by the move.

### Scoped Styles

The `.bg-image`, `@keyframes float`, and `.source-description` styles are currently scoped to `pages/index.vue`. Moving them into the component's `<style scoped>` block maintains identical scoping behavior. No global style conflicts expected.

### Research Insights: Scoped Style Interaction with `display: contents`

**Edge case to verify:** When using `<style scoped>` and `display: contents` together, Vue's scoped style mechanism adds a `data-v-xxxx` attribute to the component's root element. Since `display: contents` removes the root element's box but keeps it in the DOM, the scoped attribute is still present and scoped selectors still work correctly. The `.renewables-infographic` selector in the scoped block targets this root element, and the `display: contents` rule applies as expected.

**The `.bg-image` scoped styles use `position: absolute`:** This works because `.bg-image` has an explicit `grid-row` / `grid-column` placement in `public/styles.css` via `.layout-1 .bg-image`, making it a grid item. Its `position: absolute` is relative to the grid area, which is correct. With `display: contents`, the grid placement still applies because `.bg-image` becomes a direct grid item.

### SSR / Static Generation

The `RenewableEnergyChart` component uses D3 in `onMounted()` (client-side only). This pattern is already SSR-safe and unaffected by the extraction. The component will behave identically whether rendered from a page file or from a component within a page file.

### Research Insights: Static Generation for Embed Routes

**Pre-rendering the embed route:** Since the project uses `nitro: { preset: 'static' }` in `nuxt.config.ts`, all routes must be pre-rendered at build time. The `nuxt generate` command discovers routes via link crawling starting from `/`. The `/embed/renewables` route has no inbound `<NuxtLink>`, so it will NOT be automatically discovered.

**Solution:** Add the route to `nitro.prerender.routes`:

```ts
// nuxt.config.ts
nitro: {
  preset: 'static',
  prerender: {
    routes: ['/embed/renewables']
  }
}
```

**Verification:** After running `nuxt generate`, confirm that `.output/public/embed/renewables/index.html` exists in the build output. If the route is missing, the embed will return a 404 on the static host.

### Pages Directory Structure

After this refactor, the `pages/` directory will contain:

```
pages/
  index.vue              (existing -- now thin wrapper)
  embed/
    renewables.vue       (new -- embed route)
```

This aligns with the brainstorm's routing structure for embed routes. The `pages/infographics/renewables.vue` route and the homepage hub are separate follow-up tasks.

### Research Insights: Motion Design Review

**Float animation assessment (design-motion-principles skill):**
- The `@keyframes float` animation uses `6s ease-in-out infinite` with a subtle `1svh` vertical translation. This is well-calibrated for a background decorative element: long duration, small amplitude, and ease-in-out timing create a gentle ambient motion that does not distract from the chart content.
- The `prefers-reduced-motion: reduce` media query correctly disables the animation for users with motion sensitivity. This is a required accessibility pattern.
- **No changes recommended** to the animation parameters during extraction. The motion design is appropriate for both the full-page and embed contexts.

**Embed context consideration:** In a small embed iframe (e.g., 400px height), `1svh` translates to only 4px of movement, which remains perceptible but subtle. In very small embeds (< 300px), the background image may be hidden entirely by the mobile media query (`@media (max-width: 900px) { display: none; }`), so the animation becomes irrelevant. This is acceptable behavior.

## Acceptance Criteria

- [ ] `components/infographics/RenewablesInfographic.vue` exists and contains all visual/interactive content from the current `pages/index.vue` template
- [ ] The component's root element uses `display: contents` to remain transparent to the parent CSS grid
- [ ] `pages/index.vue` is a thin wrapper: `<script setup>` with `definePageMeta()` and `useHead()`, `<template>` rendering only the infographic component
- [ ] `pages/embed/renewables.vue` exists and renders the same `RenewablesInfographic` component with `layout: 'embed'`
- [ ] The renewables infographic at `/` renders identically to before the refactor (visual regression check)
- [ ] The renewables infographic at `/embed/renewables` renders correctly inside the embed layout (no footer, no back-link, background gradient present)
- [ ] `nuxt generate` (static build) completes without errors and produces output for both `/` and `/embed/renewables`
- [ ] The `/embed/renewables` route is listed in `nitro.prerender.routes` in `nuxt.config.ts`
- [ ] The `RenewableEnergyChart` D3 chart renders correctly in both routes (hover interactions, tooltips, resize behavior all functional)
- [ ] The floating background image animation plays in both routes (and respects `prefers-reduced-motion`)
- [ ] No duplicate content exists -- `pages/index.vue` and `pages/embed/renewables.vue` both reference the component, neither contains inline infographic markup
- [ ] The `useHead` link tags use a `key` attribute to prevent duplicate stylesheet injection

## Dependencies & Risks

### Dependencies

- **BF-69 (completed):** `layouts/default.vue` must exist with the shared visual identity (background gradient, footer, back-link). Already done.
- **BF-70 (completed):** `layouts/embed.vue` must exist with the stripped-down embed layout. Already done.
- **Nuxt file-based routing:** The `pages/` directory must be active (Nuxt auto-detects it). Already active since prior work introduced `pages/index.vue`.

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Grid layout breaks with wrapper div | **Confirmed -- will break without `display: contents`** | High | Apply `display: contents` on root `.renewables-infographic` div; verified via codebase analysis of `public/styles.css` grid rules |
| Nuxt auto-import naming confusion | Low | Low | Use `pathPrefix: false` scoped to `components/infographics/` in `nuxt.config.ts`; list before default `~/components` entry |
| Scoped style specificity changes | Low | Low | Visual comparison before/after; styles are self-contained; `display: contents` does not affect scoped attribute mechanism |
| Embed route not pre-rendered by `nuxt generate` | **High -- will be missed without config** | High | Add `/embed/renewables` to `nitro.prerender.routes` in `nuxt.config.ts` |
| `svh` viewport units behave differently inside iframe | Low | Low | Test with common embed dimensions (800x600, 1200x800); mobile media query already hides background image at small sizes |
| Duplicate Inter font `<link>` tags during navigation | Low | Low | Add `key: 'inter-font'` to the `useHead` link objects in both page files |
| Embed page indexed by search engines | Low | Medium | Add `<meta name="robots" content="noindex, nofollow">` to embed page `useHead` to prevent SEO cannibalization |

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
- Grid layout definitions: `public/styles.css` (`.master-grid`, `.layout-1` grid placement rules)

### Related Plans

- Embed layout plan (BF-70, completed): `docs/plans/2026-03-03-feat-create-embed-layout-plan.md`
- Default layout extraction plan (BF-69, completed): `docs/plans/2026-03-03-feat-extract-shared-layout-into-default-vue-plan.md`
- Nuxt routing plan: `docs/plans/2026-03-03-feat-introduce-nuxt-file-based-routing-plan.md`
- Data consolidation plan: `docs/plans/2026-03-03-refactor-consolidate-datasets-into-data-folder-plan.md`

### Research References

- [Nuxt Components Directory - pathPrefix configuration](https://nuxt.com/docs/3.x/directory-structure/components)
- [CSS display: contents - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/display)
- [display: contents accessibility bug tracker - W3C CSSWG](https://github.com/w3c/csswg-drafts/issues/3040)
- [CSS Subgrid browser support - Can I Use](https://caniuse.com/css-subgrid)
- [Nuxt Prerendering - Static Generation](https://nuxt.com/docs/3.x/getting-started/prerendering)
- [Nuxt SEO and Meta - useHead deduplication](https://nuxt.com/docs/4.x/getting-started/seo-meta)
- [Fix misbehaving grid children with display: contents](https://mary.codes/blog/programming/display_contents_css/)
