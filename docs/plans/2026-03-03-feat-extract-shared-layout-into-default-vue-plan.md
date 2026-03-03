---
title: "feat: Extract shared layout into layouts/default.vue"
type: feat
status: active
date: 2026-03-03
linear: BF-69
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
depends_on: docs/plans/2026-03-03-feat-introduce-nuxt-file-based-routing-plan.md
---

# feat: Extract shared layout into layouts/default.vue

## Overview

Move shared visual identity elements from the current `pages/index.vue` into a new `layouts/default.vue` so that all `/infographics/*` pages inherit a consistent look without duplicating markup or styles. This is the second step in the multi-infographic migration path defined in the brainstorm (see brainstorm: `docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md`, Migration Path step 3).

After this task, `layouts/default.vue` owns:
- The dark background gradient and overlay pseudo-elements
- The site footer (source attribution + BFNA logo)
- The `<RotateDeviceOverlay />` component
- A minimal back-link navigation element ("Back to home" link)
- The `.master-grid` CSS class on the wrapper element

Each infographic page (starting with `pages/index.vue` for renewables) supplies only its own content into the layout's `<slot />`, using a page-specific layout class (e.g., `.layout-1`) for grid placement.

### Relationship to Prior Work

BF-68 (completed) introduced Nuxt file-based routing. It explicitly deferred layout extraction to this task:
> "No `layouts/` directory is created in this task." (BF-68 plan, Acceptance Criteria)
> "Use `<NuxtPage />` alone in `app.vue` (without `<NuxtLayout>` wrapping) until `layouts/default.vue` is created in a follow-up task." (BF-68 plan, Part 2 Research Insights)

This task fulfills that deferral.

## Problem Statement / Motivation

The current `pages/index.vue` contains both the renewables infographic content **and** all shared visual identity elements (background, footer, rotate overlay, grid base). When the straits infographic is added as `pages/infographics/straits.vue`, it would need to duplicate all of these elements. This violates DRY and makes visual consistency fragile across pages.

The brainstorm decided on two layouts (see brainstorm: Key Decisions > Routing & Layouts):
- `layouts/default.vue` -- shared nav, footer, background for `/infographics/*` pages
- `layouts/embed.vue` -- strips back-link and footer; keeps background gradient and rotate overlay for `/embed/*` pages

This task creates the first layout. The embed layout is a separate task.

## Proposed Solution

### Part 1: Create `layouts/default.vue`

Create the `layouts/` directory and a `default.vue` layout containing the shared visual identity elements currently in `pages/index.vue`.

**File: `layouts/default.vue`**

The layout receives these elements extracted from the current `pages/index.vue`:

1. **Wrapper div** with `.master-grid` class -- provides the 12x7 CSS grid base
2. **Background gradient** -- the `linear-gradient(to bottom, #0D0D0D 5%, #022640 105%)` background on `.page-wrapper`, plus the `::before` (radial blue overlay) and `::after` (dark gradient overlay) pseudo-elements
3. **`<RotateDeviceOverlay />`** -- the mobile portrait-mode rotate prompt
4. **`<GridOverlay />`** -- the decorative animated grid overlay (shared across all infographics as part of the visual identity)
5. **Footer** -- the `<footer>` element with source link and BFNA logo
6. **Back-link navigation** -- a new minimal "Back to home" link (see brainstorm: Resolved Questions #3: "A small Back to home or logo link in the corner to keep the infographic experience immersive")
7. **`<slot />`** -- where the page-specific content is injected

**What stays in the page (`pages/index.vue`):**
- The `.layout-1` class (added to the slot wrapper or page root for grid placement)
- The description block (h1 title, paragraph, source description)
- The `<RenewableEnergyChart />` component
- The decorative background image (planet) -- this is renewables-specific, not shared
- Page-specific scoped styles (`.description`, `.bg-image` animation, `.source-link`, `.source-description`)
- The `useHead()` call for page title and Inter font

### Part 2: Update `app.vue` to use `<NuxtLayout>`

With `layouts/default.vue` now existing, `app.vue` must wrap `<NuxtPage>` in `<NuxtLayout>` so Nuxt applies the layout:

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

BF-68 deferred this wrapping specifically because no `layouts/` directory existed. Now that we are creating one, the wrapping is safe and required (see brainstorm: Migration Path step 2, and BF-68 plan Part 2 Research Insights).

### Part 3: Refactor `pages/index.vue`

Strip the shared elements out of `pages/index.vue`, leaving only the renewables-specific content. The page now relies on `layouts/default.vue` for the wrapper, background, footer, rotate overlay, and grid overlay.

### Part 4: Handle footer source attribution per page

The current footer contains a hardcoded source link ("Source: Our World in Data") that is specific to the renewables infographic. When multiple infographics exist, each will have different source attributions.

**Decision needed:** How to handle per-page footer content. Options:

- **Option A (recommended): Named slot** -- The layout provides a `<slot name="footer-source" />` inside the footer, and each page passes its source link via the named slot. The BFNA logo remains in the layout.
- **Option B: Props via `definePageMeta`** -- Each page defines `sourceUrl` and `sourceLabel` in its page meta, and the layout reads them via `useRoute().meta`.
- **Option C: Keep source in page, move only logo to layout** -- Split the footer: the BFNA logo bar lives in the layout, but the source attribution stays in the page. Simpler but loses the unified footer pattern.

This plan recommends **Option A** for flexibility without over-engineering.

## Technical Considerations

### Layout slot mechanics in Nuxt

In Nuxt layouts, the page content is rendered inside the layout's default `<slot />`. The page component returned by `<NuxtPage />` becomes the slot content. This means:

- The layout wraps the page -- the layout's DOM is the outer container
- The page has no awareness of the layout's wrapper class -- if the page needs to participate in the layout's CSS grid (e.g., placing items in specific grid rows/columns), the page's root element must be a grid item within the layout's grid

**Grid integration approach:** The layout applies `.master-grid` to its wrapper. The page's content is rendered inside `<slot />`, which means the page's root elements become direct children of the grid container. Each page can use its own layout class (`.layout-1`, `.layout-2`, etc.) to define grid placement for its children.

However, there is a subtlety: `<slot />` in Vue renders a fragment (multiple root nodes), not a single wrapper element. This means the page's root elements are directly injected as grid children. If the page has multiple root elements (description, chart, bg-image), they each become individual grid items -- which is actually the desired behavior for CSS Grid placement.

**Important:** The `<slot />` itself does not create a DOM element. The page's root-level elements become direct children of the layout's grid container. This means:
- `.layout-1 .description` selectors in `public/styles.css` will still work if `.layout-1` is on the layout wrapper
- But `.layout-1` is currently page-specific (renewables layout). It should stay on the page, not the layout.

**Recommended pattern:** The layout wrapper has class `page-wrapper master-grid`. Each page adds its layout variant class via a wrapper `<div>` or via `definePageMeta` + dynamic class binding on the layout. The simplest approach:

```vue
<!-- layouts/default.vue -->
<template>
  <div class="page-wrapper | master-grid" :class="layoutClass">
    <RotateDeviceOverlay />
    <GridOverlay />
    <slot />
    <footer>...</footer>
  </div>
</template>

<script setup>
const route = useRoute()
const layoutClass = computed(() => route.meta.layoutClass || '')
</script>
```

```vue
<!-- pages/index.vue -->
<script setup>
definePageMeta({
  layoutClass: 'layout-1'
})
</script>
```

This way, `.layout-1 .description`, `.layout-1 .chart`, and `.layout-1 .bg-image` selectors in `public/styles.css` continue to work without modification.

### Back-link navigation design

The brainstorm says (Resolved Questions #3): "Minimal back link only. A small 'Back to home' or logo link in the corner to keep the infographic experience immersive."

Implementation:
- A small, semi-transparent link in the top-left corner (e.g., `position: absolute; top: 1rem; left: 1rem; z-index: 20`)
- Text: "Back to home" or a small BFNA logo that links to `/`
- Only visible on infographic pages (not on the homepage itself -- the homepage IS home)
- The homepage (`pages/index.vue`) can hide the back link via `definePageMeta({ showBackLink: false })` or the layout can check `route.path === '/'`

**Note:** The homepage hub does not exist yet (it is a separate future task). For now, the back link can point to `/` which is the renewables page. When the homepage hub is built, the link will naturally point to the correct destination.

### Scoped vs unscoped styles

The layout's styles should be **scoped** to prevent leaking into page content. The shared visual identity styles (background gradient, footer) are layout concerns and belong in the layout's `<style scoped>`.

However, the `.master-grid` and `.layout-1` classes are in `public/styles.css` (global). These must remain global since they define the grid system used by both the layout and page content.

**Style ownership after extraction:**

| Style | Current location | After extraction |
|---|---|---|
| `.page-wrapper` background/gradient | `pages/index.vue` scoped | `layouts/default.vue` scoped |
| `.page-wrapper::before`, `::after` | `pages/index.vue` scoped | `layouts/default.vue` scoped |
| `footer` styles | `pages/index.vue` scoped | `layouts/default.vue` scoped |
| `.master-grid` | `public/styles.css` global | `public/styles.css` global (unchanged) |
| `.layout-1` grid placements | `public/styles.css` global | `public/styles.css` global (unchanged) |
| `.bg-image` (planet animation) | `pages/index.vue` scoped | `pages/index.vue` scoped (unchanged -- page-specific) |
| `.source-link` | `pages/index.vue` scoped | `layouts/default.vue` scoped (footer element) |
| `.description`, `.chart` | `public/styles.css` global | `public/styles.css` global (unchanged) |
| `.source-description` | `pages/index.vue` scoped | `pages/index.vue` scoped (unchanged -- page-specific) |

### GridOverlay -- shared or page-specific?

The `<GridOverlay />` component is a decorative animated grid that overlays the entire viewport. It is part of the shared visual identity (dark glassmorphism aesthetic), not specific to any infographic. It should live in the layout.

The `<GridOverlay>` uses `.master-grid` class on its own root element (it positions itself absolutely within the grid). It will continue to work correctly when rendered inside the layout's grid container.

### CSS cascade and specificity

Moving the `.page-wrapper` styles from a scoped page component to a scoped layout component changes the `data-v-*` hash. Since all selectors are class-based and do not depend on the hash value, this is a safe change. The cascade order is:

1. `assets/styles.css` (global reset)
2. `public/styles.css` (global tokens, grid, layout classes)
3. Layout scoped styles (background, footer)
4. Page scoped styles (page-specific elements)

This order ensures page styles can override layout styles when needed.

## System-Wide Impact

- **Interaction graph**: Creating `layouts/default.vue` causes `<NuxtLayout>` in `app.vue` to resolve and render this layout for all pages that do not specify a different layout. All current and future pages will inherit the default layout unless they opt out via `definePageMeta({ layout: 'embed' })` or `definePageMeta({ layout: false })`.
- **Error propagation**: No new error surfaces. The layout is a pure presentational wrapper. If the layout fails to render (missing file, syntax error), Nuxt's error handling will show its default error page.
- **State lifecycle risks**: None. The layout holds no state beyond the computed `layoutClass` from route meta. No persistence, no side effects.
- **API surface parity**: The embed layout (`layouts/embed.vue`) will need to share some of these visual elements (background gradient, rotate overlay) but exclude others (footer, back-link). This plan does not create the embed layout, but the implementer should structure the default layout's styles so they can be reused or extracted into a shared CSS file if needed.
- **Integration test scenarios**: The main risk is visual regression -- elements that render correctly in `pages/index.vue` must render identically when split across `layouts/default.vue` and `pages/index.vue`.

## Acceptance Criteria

### Functional Requirements

- [ ] `layouts/` directory exists with `layouts/default.vue`
- [ ] `layouts/default.vue` contains: wrapper with `.page-wrapper.master-grid`, background gradient (main + `::before` + `::after`), `<RotateDeviceOverlay />`, `<GridOverlay />`, footer with BFNA logo, `<slot />` for page content
- [ ] `app.vue` wraps `<NuxtPage />` inside `<NuxtLayout>` (i.e., `<NuxtLayout><NuxtPage /></NuxtLayout>`)
- [ ] `pages/index.vue` no longer contains the wrapper div, background gradient styles, footer, `<RotateDeviceOverlay />`, or `<GridOverlay />`
- [ ] `pages/index.vue` retains: description block, `<RenewableEnergyChart />`, background image (planet), page-specific scoped styles, `useHead()` call
- [ ] The renewables page at `/` renders pixel-identically to before the extraction
- [ ] A minimal back-link navigation element exists in the layout (even if hidden on the homepage)
- [ ] The `.layout-1` grid placement class is applied to the layout wrapper via `definePageMeta` or equivalent mechanism
- [ ] Footer source attribution is handled via named slot or equivalent per-page mechanism

### Non-Functional Requirements

- [ ] `npm run dev` starts without errors
- [ ] `npm run generate` completes without errors
- [ ] Browser DevTools console shows zero Vue/Nuxt warnings or errors
- [ ] No duplicate DOM elements (footer, rotate overlay, grid overlay should appear exactly once)

### Quality Gates

- [ ] Visual comparison confirms pixel-identical rendering at `/`
- [ ] Layout is visible in Nuxt DevTools as the active layout for the page
- [ ] The `<slot />` content (page elements) participates correctly in the CSS grid

## Success Metrics

- Zero visual regression on the renewables infographic page
- The layout is reusable: adding a new infographic page with `layout: 'default'` (or no layout specification) automatically gets the shared visual identity
- Downstream tasks (embed layout, homepage hub, straits infographic page) are unblocked

## Dependencies & Risks

### Dependencies

- **BF-68 (completed):** Nuxt file-based routing must be active with `pages/index.vue` and `app.vue` as the thin shell. This is confirmed complete.

### Risks

- **Medium risk: CSS grid slot integration** -- The `<slot />` fragment must produce elements that are valid CSS grid children of the layout's `.master-grid` container. If the page has a single root `<div>`, that div becomes one grid item (potentially breaking the multi-column layout). The page must either have multiple root elements (fragment) or use a transparent wrapper. **Mitigation:** Test with Nuxt DevTools to verify DOM structure. Use Vue's multi-root component feature (fragments) in the page.

- **Low risk: `definePageMeta` for layoutClass** -- Using route meta to pass the layout variant class requires the layout to read `useRoute().meta.layoutClass`. If a page does not define this meta, the computed class will be empty, which is the correct fallback (no layout variant applied). **Mitigation:** Default to empty string in the computed property.

- **Low risk: Footer source attribution** -- The named slot approach requires each page to provide its source link. If a page forgets, the footer will have an empty source area. **Mitigation:** Provide a default slot fallback in the layout (e.g., empty or generic text).

- **Low risk: Back-link on homepage** -- The homepage is currently `/` (the renewables page). A "Back to home" link on this page would link to itself. **Mitigation:** Hide the back link when `route.path === '/'` or when the page opts out via `definePageMeta`.

## MVP

### layouts/default.vue

```vue
<script setup>
const route = useRoute()
const layoutClass = computed(() => route.meta.layoutClass || '')
const showBackLink = computed(() => route.meta.showBackLink !== false && route.path !== '/')
</script>

<template>
  <div class="page-wrapper | master-grid" :class="layoutClass">
    <RotateDeviceOverlay />
    <GridOverlay />

    <nav v-if="showBackLink" class="back-link-nav">
      <NuxtLink to="/">Back to home</NuxtLink>
    </nav>

    <slot />

    <footer>
      <slot name="footer-source">
        <!-- Default: empty source area; pages provide their own -->
      </slot>
      <img src="@/assets/images/bfna.svg" alt="BFNA Logo" class="bfna-logo-footer" />
    </footer>
  </div>
</template>

<style scoped>
.page-wrapper {
  max-width: 100vw;
  max-height: 100vh;
  background: linear-gradient(to bottom, #0D0D0D 5%, #022640 105%);
  position: relative;

  @media (max-width: 900px) {
    max-height: 100%;
    height: 100%;
  }
}

.page-wrapper:before {
  content: '';
  position: absolute;
  pointer-events: none;
  mix-blend-mode: color;
  z-index: 10;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 50% 0%, rgba(0, 0, 200, 0.2) 0%, rgba(0, 0, 200, 0) 100%);
}

.page-wrapper:after {
  content: '';
  position: absolute;
  pointer-events: none;
  z-index: 0;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0) 100%);
}

footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.2);
  height: 4rem;
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 20;
}

footer img {
  max-width: 100px;
}

.back-link-nav {
  position: absolute;
  top: 1rem;
  left: 1.5rem;
  z-index: 20;
}

.back-link-nav a {
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s ease;
}

.back-link-nav a:hover {
  color: rgba(255, 255, 255, 0.9);
}

.source-link {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: color 0.2s ease;
  flex-shrink: 0;
}

.source-link:hover {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: underline;
}
</style>
```

### app.vue (updated)

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

### pages/index.vue (after extraction)

```vue
<script setup>
import { useHead } from '#app'

definePageMeta({
  layoutClass: 'layout-1',
  showBackLink: false
})

useHead({
  title: 'Renewables on the Rise',
  link: [
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap' }
  ]
})
</script>

<template>
  <div class="description">
    <h1 class="title">Renewables on the Rise</h1>
    <p>Amid rising concerns about climate change and energy security, a growing number of states have invested in expanding renewable energy infrastructure. This has been especially visible in the Indo-Pacific, where several countries have become global leaders in solar, wind, hydroelectric and geothermal power generation. However, not every state in the region has embraced renewables so enthusiastically. This infographic displays the 2024 renewable energy usage percentages of the region's largest economies, alongside those of the United States and European Union.</p>
    <p class="source-description"><em>Percentage of electricity produced from renewable sources, which include solar, wind, hydropower, bioenergy, geothermal, wave, and tidal.</em></p>
  </div>
  <RenewableEnergyChart class="chart"/>
  <div class="bg-image">
    <img src="@/assets/images/background.png" alt="" role="presentation" />
  </div>

  <template #footer-source>
    <a href="https://ourworldindata.org/grapher/share-of-electricity-production-from-renewable-sources?time=earliest..2024&country=CHN~JPN~IND~KOR~AUS~IDN~TWN~THA~USA~EU+%28Ember%29" target="_blank" rel="noopener noreferrer" class="source-link">Source: Our World in Data</a>
  </template>
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

**Important implementation note on named slots with `<NuxtPage>`:** The `<template #footer-source>` named slot syntax shown above requires the page to be a direct child of the layout's `<slot>`. In Nuxt, the page is rendered via `<NuxtPage>` inside `<NuxtLayout>`, which means named slots from the page to the layout may not work directly through the `<NuxtPage>` intermediary.

**Alternative approaches if named slots do not work through NuxtPage:**

1. **Use `definePageMeta` + layout reads route meta:**
   ```ts
   // pages/index.vue
   definePageMeta({
     footerSource: {
       url: 'https://ourworldindata.org/...',
       label: 'Source: Our World in Data'
     }
   })
   ```
   ```vue
   <!-- layouts/default.vue -->
   <footer>
     <a v-if="route.meta.footerSource"
        :href="route.meta.footerSource.url"
        target="_blank"
        rel="noopener noreferrer"
        class="source-link">
       {{ route.meta.footerSource.label }}
     </a>
     <img src="@/assets/images/bfna.svg" alt="BFNA Logo" class="bfna-logo-footer" />
   </footer>
   ```

2. **Use `usePageFooter` composable** -- A custom composable that pages call to register their footer source. The layout reads it reactively. More flexible but more complex.

The implementer should verify which approach works in Nuxt 4 and choose the simplest one. The `definePageMeta` approach (option 1 above) is likely the most reliable since it uses Nuxt's built-in page meta system.

## Verification Checklist

Before claiming this task is complete, the implementer MUST execute and verify:

### Pre-Extraction Baseline
- [ ] Take a screenshot of the current page at `http://localhost:3000/`
- [ ] Confirm `npm run dev` works and the page renders correctly (baseline)

### Post-Extraction Verification
- [ ] `layouts/default.vue` exists and contains the shared elements
- [ ] `app.vue` contains `<NuxtLayout><NuxtPage /></NuxtLayout>`
- [ ] `pages/index.vue` contains only renewables-specific content
- [ ] `npm run dev` starts without errors
- [ ] Page at `http://localhost:3000/` renders identically to the baseline screenshot
- [ ] Browser DevTools console shows zero errors and zero warnings
- [ ] Nuxt DevTools shows `layouts/default.vue` as the active layout
- [ ] DOM inspection confirms: footer, rotate overlay, and grid overlay appear exactly once
- [ ] Background gradient renders correctly (dark to blue, with radial and linear overlays)
- [ ] Footer is positioned at bottom with BFNA logo
- [ ] Source link in footer is clickable and correct
- [ ] Floating planet animation plays smoothly
- [ ] `RotateDeviceOverlay` appears on mobile portrait (test via DevTools device emulation)
- [ ] `GridOverlay` decorative grid animates correctly
- [ ] `npm run generate` completes with exit code 0
- [ ] `.output/public/index.html` contains complete markup

### Grid Integration Verification
- [ ] DOM inspection: page content elements (`.description`, `.chart`, `.bg-image`) are direct children of the `.master-grid` container
- [ ] Grid placement: elements appear in correct grid rows/columns as defined by `.layout-1` in `public/styles.css`
- [ ] Responsive: layout works at mobile widths (900px and below)

## Open Questions for Implementer

1. **Named slots through `<NuxtPage>`**: Does Nuxt 4 support named slots from a page component to its layout through the `<NuxtPage>` intermediary? If not, use the `definePageMeta` approach for footer source attribution. The implementer must test this.

2. **Back-link visibility on homepage**: The current homepage IS the renewables infographic (at `/`). A "Back to home" link on this page is circular. The MVP hides it via `route.path === '/'`. When the homepage hub is built later, the renewables page will move to `/infographics/renewables` and the back link will naturally become useful. Is this acceptable, or should the back-link be omitted entirely until the homepage hub exists?

3. **GridOverlay z-index interaction**: The `<GridOverlay>` uses `position: absolute; z-index: 10` and `mix-blend-mode: overlay`. When moved from the page to the layout, verify that the blend mode still works correctly with the page content rendered in the `<slot />`. Blend modes can behave differently depending on stacking context boundaries.

4. **`public/styles.css` refactoring**: The `.layout-1` class in `public/styles.css` defines grid placement for renewables-specific elements (`.description`, `.chart`, `.bg-image`). Should `.layout-1` be moved to the renewables page's scoped styles, or kept global for now? Keeping it global is simpler and matches the current pattern. Moving it to scoped styles is cleaner but requires `:deep()` selectors since the grid children are in the page, not the layout.

5. **Embed layout shared styles**: The brainstorm says `layouts/embed.vue` retains the background gradient and rotate overlay but strips the footer and back-link. Should the shared gradient styles be extracted into a CSS utility or mixin now to avoid duplication between default and embed layouts, or defer that extraction until the embed layout is built?

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md](docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md) -- Key decisions carried forward: `layouts/default.vue` with shared nav/footer/background (Key Decisions > Routing & Layouts), shared visual identity elements (Key Decisions > Shared Visual Identity), minimal back-link navigation (Resolved Questions #3), Migration Path steps 3-4
- **Predecessor plan:** [docs/plans/2026-03-03-feat-introduce-nuxt-file-based-routing-plan.md](docs/plans/2026-03-03-feat-introduce-nuxt-file-based-routing-plan.md) -- BF-68 deferred layout extraction to this task. Contains research on NuxtLayout behavior, CSS cascade, and scoped style hash changes.
- **Existing codebase files:**
  - `app.vue` -- current thin shell (`<NuxtPage />`)
  - `pages/index.vue` -- renewables infographic with all shared elements (source of extraction)
  - `components/RotateDeviceOverlay.vue` -- rotate overlay component
  - `components/GridOverlay.vue` -- decorative grid overlay component
  - `public/styles.css` -- `.master-grid`, `.layout-1`, fluid tokens, global typography
  - `assets/styles.css` -- body reset
  - `assets/images/bfna.svg` -- BFNA logo used in footer
  - `nuxt.config.ts` -- global config (unchanged by this task)
  - `netlify.toml` -- deployment config (unchanged by this task)
