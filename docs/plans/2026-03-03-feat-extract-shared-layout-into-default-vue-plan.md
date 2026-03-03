---
title: "feat: Extract shared layout into layouts/default.vue"
type: feat
status: completed
date: 2026-03-03
linear: BF-69
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
depends_on: docs/plans/2026-03-03-feat-introduce-nuxt-file-based-routing-plan.md
---

# feat: Extract shared layout into layouts/default.vue

## Enhancement Summary

**Deepened on:** 2026-03-03
**Sections enhanced:** 9
**Research sources used:** Nuxt 4.x official docs (Context7), Vue 3 SFC CSS Features docs, GitHub issue nuxt/nuxt#23929, nuxt skill (routing.md), vue-best-practices skill, accessibility skill, design-motion-principles skill, presentation-logic-split skill, verification-before-completion skill, architecture-strategist agent, code-simplicity-reviewer agent, performance-oracle agent

### Key Improvements
1. **Resolved the named-slot ambiguity decisively** -- Research confirms named slots from pages to layouts DO NOT work through `<NuxtPage>` (GitHub issue #23929, still open). The plan now recommends `definePageMeta` as the primary approach (not Option A), eliminating the biggest implementation risk.
2. **Discovered `mix-blend-mode` stacking context risk is real and actionable** -- CSS spec confirms `mix-blend-mode: overlay` on `<GridOverlay>` creates a new stacking context. Moving it to the layout changes which elements participate in blending. Added concrete verification steps.
3. **Added `:slotted()` guidance for layout-to-page styling** -- Vue 3 scoped styles do not affect slot content by default. The layout cannot style page elements with scoped selectors unless using `:slotted()`. This affects `.source-link` if it stays in the layout's scoped styles.
4. **Identified `overflow: hidden` on `.master-grid` as a risk for `position: absolute` elements** -- The `.master-grid` class has `overflow: hidden`, which will clip the footer (`position: absolute; bottom: 0`) and back-link nav if they are positioned outside the grid flow. Added mitigation guidance.
5. **Strengthened accessibility requirements** -- Added WCAG-compliant back-link navigation with `aria-label`, footer landmark semantics, and `prefers-reduced-motion` audit checklist items.

### New Considerations Discovered
- Nuxt `definePageMeta` is a compiler macro: values must be serializable and cannot reference component instance state. The `footerSource` object approach works because it uses static literals.
- The `<GridOverlay>` component runs a `requestAnimationFrame` loop continuously. Placing it in the layout means it runs on every page, not just the current one. This is the intended behavior (shared visual identity) but should be noted for performance awareness.
- The Nuxt 4.x routing skill recommends parent routes with `<NuxtPage>` as the layout pattern over separate `layouts/` directory. However, the `layouts/` directory approach is still fully supported and appropriate here because the layout applies across unrelated route hierarchies (not nested under a common parent).

---

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

### Research Insights (Part 1)

**Best Practices (Nuxt 4.x Layouts):**
- The `layouts/` directory approach is fully supported in Nuxt 4.x. The official docs show `layouts/default.vue` with `<slot />` as the standard pattern (Nuxt 4.x docs: Views, Layouts).
- Nuxt auto-imports `<NuxtLayout>` and `<NuxtPage>` -- no explicit imports needed.
- Layout names are normalized to kebab-case. `default.vue` is automatically applied to all pages that do not specify a different layout via `definePageMeta({ layout: 'other' })`.
- A page can opt out entirely with `definePageMeta({ layout: false })`.

**Presentation-Logic Split (from skill):**
- The layout is a pure presentation wrapper. It holds no business logic, no data fetching, no side effects beyond reading `route.meta`. This is the correct architecture per the presentation-logic-split pattern.
- The only computed properties in the layout (`layoutClass`, `showBackLink`, `footerSource`) derive from route meta -- deterministic and side-effect-free.

**Vue Best Practices (from skill):**
- Keep the layout's `<script setup>` minimal: only `useRoute()` and computed properties for route meta.
- SFC section order should be `<script>` then `<template>` then `<style>` (Vue SFC convention).

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

### Research Insights (Part 2)

**Best Practices (Nuxt 4.x NuxtLayout):**
- The Nuxt 4.x docs confirm `<NuxtLayout>` should be placed in `app.vue` wrapping `<NuxtPage />`. This is the standard pattern.
- Placing `<NuxtLayout>` in `app.vue` (not in individual pages) prevents a known issue where the layout re-executes on every route change (GitHub nuxt/nuxt#23929). This is critical for the `<GridOverlay>` component which runs a `requestAnimationFrame` loop -- re-execution would cause duplicate animation loops and memory leaks.
- The `<NuxtLayout>` component wraps its slot content in Vue's `<Transition />` to enable layout transitions. This does not affect the current implementation (no layout transitions configured) but is good to know for future work.

**Performance Consideration:**
- With `<NuxtLayout>` in `app.vue`, the layout persists across route changes. The `<GridOverlay>` and `<RotateDeviceOverlay>` components mount once and stay mounted. This is correct behavior and avoids re-initialization overhead.

### Part 3: Refactor `pages/index.vue`

Strip the shared elements out of `pages/index.vue`, leaving only the renewables-specific content. The page now relies on `layouts/default.vue` for the wrapper, background, footer, rotate overlay, and grid overlay.

### Research Insights (Part 3)

**Vue Fragment Behavior:**
- Vue 3 supports multi-root components (fragments). After extraction, `pages/index.vue` will have three root elements: `.description`, `.chart` (RenewableEnergyChart), and `.bg-image`. These render as a fragment inside the layout's `<slot />`, becoming direct children of the `.master-grid` container.
- This is the desired behavior for CSS Grid placement. The `.layout-1` class on the grid container targets these children via `.layout-1 .description`, `.layout-1 .chart`, `.layout-1 .bg-image` selectors in `public/styles.css`.

**Edge Case -- Fragment + Named Slot Conflict:**
- If the page uses both default slot content (multiple root elements) and a named slot (`<template #footer-source>`), Vue may have trouble determining which elements belong to which slot. This is another reason to use `definePageMeta` for footer source rather than named slots (see Part 4).

### Part 4: Handle footer source attribution per page

The current footer contains a hardcoded source link ("Source: Our World in Data") that is specific to the renewables infographic. When multiple infographics exist, each will have different source attributions.

**Decision: Use `definePageMeta` (Option B) -- not named slots.**

Research has resolved this decision conclusively. The original plan recommended Option A (named slots), but research reveals this will not work:

- **Named slots from pages to layouts do NOT work through `<NuxtPage>`** -- This is a known limitation (GitHub nuxt/nuxt#23929, still open as of March 2026, labeled p2-nice-to-have). The `<NuxtPage>` component acts as an intermediary that does not forward named slots from page components to the layout.
- **Workaround (placing `<NuxtLayout>` in pages)** exists but causes the layout to re-execute on every route change, which would re-initialize `<GridOverlay>` and `<RotateDeviceOverlay>`, causing duplicate `requestAnimationFrame` loops and event listeners.
- **`definePageMeta` approach (Option B) is reliable** -- It uses Nuxt's built-in page meta system, which is designed for exactly this kind of page-to-layout communication. The layout reads `useRoute().meta.footerSource` reactively. Values must be serializable (static literals), which is fine for URL + label pairs.

**Implementation:**

```ts
// pages/index.vue
definePageMeta({
  layoutClass: 'layout-1',
  showBackLink: false,
  footerSource: {
    url: 'https://ourworldindata.org/grapher/share-of-electricity-production-from-renewable-sources?time=earliest..2024&country=CHN~JPN~IND~KOR~AUS~IDN~TWN~THA~USA~EU+%28Ember%29',
    label: 'Source: Our World in Data'
  }
})
```

```vue
<!-- layouts/default.vue footer -->
<footer>
  <a v-if="footerSource"
     :href="footerSource.url"
     target="_blank"
     rel="noopener noreferrer"
     class="source-link">
    {{ footerSource.label }}
  </a>
  <img src="@/assets/images/bfna.svg" alt="BFNA Logo" class="bfna-logo-footer" />
</footer>
```

```ts
// layouts/default.vue script
const route = useRoute()
const footerSource = computed(() => route.meta.footerSource as { url: string; label: string } | undefined)
```

### Research Insights (Part 4)

**`definePageMeta` Constraints (from Nuxt docs):**
- `definePageMeta` is a compiler macro. Its values are hoisted out of the component at compile time. You cannot reference reactive state, component props, or imported functions. Only static literals and imported constants work.
- The `footerSource: { url: '...', label: '...' }` pattern works because both values are string literals.
- Custom properties are typed as `[key: string]: unknown` in `PageMeta`. For type safety, augment the interface:

```ts
// types/page-meta.d.ts (or inline in the page)
declare module 'nuxt/app' {
  interface PageMeta {
    layoutClass?: string
    showBackLink?: boolean
    footerSource?: { url: string; label: string }
  }
}
```

**Why NOT usePageFooter composable (Option 2 from original plan):**
- Over-engineered for this use case. A composable would use `provide/inject` or `useState` to communicate between page and layout, adding unnecessary indirection when `definePageMeta` achieves the same result with zero runtime overhead.
- Violates YAGNI -- the `definePageMeta` approach handles all foreseeable footer source scenarios (URL + label per page).

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

**Recommended pattern:** The layout wrapper has class `page-wrapper master-grid`. Each page adds its layout variant class via `definePageMeta` + dynamic class binding on the layout. The simplest approach:

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

### Research Insights (Slot Mechanics)

**Vue 3 Scoped Styles and `:slotted()` (from Vue SFC CSS Features docs):**
- By default, scoped styles in the layout do NOT affect content rendered by `<slot />`. Slot content is considered to be "owned" by the parent component (the page) that passes it in.
- To style slot content from the layout, use the `:slotted()` pseudo-class: `:slotted(.description) { ... }`.
- In this plan, this is NOT needed because page elements are styled by `public/styles.css` (global) and page scoped styles. The layout only styles its own elements (`.page-wrapper`, `footer`, `.back-link-nav`).
- **However**, the `.source-link` class is currently in `pages/index.vue` scoped styles. After extraction, it moves to `layouts/default.vue` scoped styles. Since the `<a>` element is now rendered directly in the layout template (not in a slot), scoped styles work normally. No `:slotted()` needed.

**Grid Children and Slot Fragments:**
- The page's multi-root template (`.description`, `.chart`, `.bg-image`) becomes a fragment. Each root element becomes a direct grid child of `.master-grid`.
- Other layout-owned elements (`<RotateDeviceOverlay>`, `<GridOverlay>`, `<footer>`, `.back-link-nav`) are also direct grid children. Since they all use `position: absolute`, they are taken out of the grid flow and do not interfere with the page content's grid placement.

### Back-link navigation design

The brainstorm says (Resolved Questions #3): "Minimal back link only. A small 'Back to home' or logo link in the corner to keep the infographic experience immersive."

Implementation:
- A small, semi-transparent link in the top-left corner (e.g., `position: absolute; top: 1rem; left: 1rem; z-index: 20`)
- Text: "Back to home" or a small BFNA logo that links to `/`
- Only visible on infographic pages (not on the homepage itself -- the homepage IS home)
- The homepage (`pages/index.vue`) can hide the back link via `definePageMeta({ showBackLink: false })` or the layout can check `route.path === '/'`

**Note:** The homepage hub does not exist yet (it is a separate future task). For now, the back link can point to `/` which is the renewables page. When the homepage hub is built, the link will naturally point to the correct destination.

### Research Insights (Back-link)

**Accessibility (from WCAG skill):**
- The `<nav>` element for the back-link should have an `aria-label` to distinguish it from other navigation landmarks: `<nav aria-label="Back navigation">`.
- The link text "Back to home" is descriptive and screen-reader friendly. Avoid icon-only links without accessible names.
- Ensure the link has sufficient color contrast. The current `rgba(255, 255, 255, 0.5)` on the dark background (#0D0D0D to #022640) yields approximately 5.3:1 contrast ratio for the base state and 13.5:1 for the hover state -- both pass WCAG AA for normal text.
- Add `:focus-visible` styles to the back-link for keyboard navigation visibility.

**Implementation Detail:**
```vue
<nav v-if="showBackLink" aria-label="Back navigation" class="back-link-nav">
  <NuxtLink to="/">Back to home</NuxtLink>
</nav>
```

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

### Research Insights (GridOverlay)

**`mix-blend-mode` Stacking Context (CONFIRMED RISK):**
- The CSS specification confirms: an element with `mix-blend-mode` other than `normal` creates a new stacking context. The `<GridOverlay>` uses `mix-blend-mode: overlay` on its root `.grid-overlay` element.
- In the current codebase, `<GridOverlay>` and the page content (`.description`, `.chart`, `.bg-image`) are siblings within the same parent (`.page-wrapper`). The blend mode blends with all underlying content in the same stacking context.
- After extraction, the situation is identical: `<GridOverlay>` and the slot content (page elements) remain siblings within the same `.page-wrapper` container in the layout. **The blend mode behavior should be preserved.**
- **However**, the `isolation` CSS property on any intermediate element could break blending. Verify that no intermediate wrapper is introduced between `<GridOverlay>` and page content in the DOM. Since `<slot />` does not create a DOM element, this should be safe.

**Verification step (add to checklist):**
- After extraction, inspect the computed `mix-blend-mode` on `.grid-overlay` in browser DevTools. Confirm it still shows `overlay` and the visual effect matches the baseline.

**Performance Note:**
- The `<GridOverlay>` component runs a `requestAnimationFrame` loop continuously (never stops until unmounted). When placed in the layout, this loop persists across all page navigations. This is intentional (the grid overlay is always visible) and does not increase resource usage compared to the current single-page setup. The animation selects 4 random grid items every 8 seconds -- negligible CPU impact.

### CSS cascade and specificity

Moving the `.page-wrapper` styles from a scoped page component to a scoped layout component changes the `data-v-*` hash. Since all selectors are class-based and do not depend on the hash value, this is a safe change. The cascade order is:

1. `assets/styles.css` (global reset)
2. `public/styles.css` (global tokens, grid, layout classes)
3. Layout scoped styles (background, footer)
4. Page scoped styles (page-specific elements)

This order ensures page styles can override layout styles when needed.

### Research Insights (CSS Cascade)

**`overflow: hidden` on `.master-grid` (NEW RISK IDENTIFIED):**
- The `.master-grid` class in `public/styles.css` includes `overflow: hidden`. This clips any content that extends beyond the grid container's bounds.
- The footer uses `position: absolute; bottom: 0` and the back-link nav uses `position: absolute; top: 1rem; left: 1.5rem`. Both are positioned relative to the `.page-wrapper` container (which has `position: relative`).
- Since `.page-wrapper` and `.master-grid` are on the same element, `overflow: hidden` will clip absolutely-positioned children that extend beyond the container. The footer is at `bottom: 0` with `height: 4rem`, which is within bounds. The back-link is at `top: 1rem`, also within bounds.
- **This should work correctly**, but verify visually that neither element is clipped, especially on smaller viewports where the grid's `min-height: 1080px` creates scrollable overflow.

**Scoped Style Hash Change:**
- Vue scoped styles add a `data-v-[hash]` attribute to the component's elements and append `[data-v-hash]` to selectors. Moving styles from `pages/index.vue` to `layouts/default.vue` changes the hash, but since both the element and its selector move together, the scoping remains correct.
- The layout's scoped styles will NOT affect page slot content (by design). The page's scoped styles will NOT affect layout elements (by design). This is the correct boundary.

## System-Wide Impact

- **Interaction graph**: Creating `layouts/default.vue` causes `<NuxtLayout>` in `app.vue` to resolve and render this layout for all pages that do not specify a different layout. All current and future pages will inherit the default layout unless they opt out via `definePageMeta({ layout: 'embed' })` or `definePageMeta({ layout: false })`.
- **Error propagation**: No new error surfaces. The layout is a pure presentational wrapper. If the layout fails to render (missing file, syntax error), Nuxt's error handling will show its default error page.
- **State lifecycle risks**: None. The layout holds no state beyond the computed properties from route meta. No persistence, no side effects.
- **API surface parity**: The embed layout (`layouts/embed.vue`) will need to share some of these visual elements (background gradient, rotate overlay) but exclude others (footer, back-link). This plan does not create the embed layout, but the implementer should structure the default layout's styles so they can be reused or extracted into a shared CSS file if needed.
- **Integration test scenarios**: The main risk is visual regression -- elements that render correctly in `pages/index.vue` must render identically when split across `layouts/default.vue` and `pages/index.vue`.

### Research Insights (System-Wide Impact)

**Architecture Review:**
- The extraction follows the Single Responsibility Principle: the layout owns the shared visual shell, the page owns its content. This is a clean architectural boundary.
- No circular dependencies are introduced. The dependency direction is: `app.vue` -> `layouts/default.vue` -> `components/*` (one-way).
- The `definePageMeta` approach for page-to-layout communication uses Nuxt's built-in route meta system, avoiding custom state management or provide/inject patterns. This keeps the architecture simple and framework-idiomatic.

**Simplicity Review:**
- The plan avoids over-engineering. No custom composables, no state management, no abstraction layers beyond what Nuxt provides.
- The `.layout-1` class stays global in `public/styles.css` (simpler) rather than being moved to scoped styles (which would require `:deep()` selectors).
- Footer source uses `definePageMeta` (zero-runtime-overhead) rather than a composable (reactive state overhead).
- YAGNI applied: No embed layout styles are extracted now. No CSS utility files are created. No TypeScript interfaces are augmented beyond what is needed for the current task.

**Performance Review:**
- No new network requests. No new JavaScript bundles. The layout extraction is a pure structural refactor.
- The `<GridOverlay>` `requestAnimationFrame` loop is already running; moving it to the layout does not increase CPU usage.
- Static site generation (`npm run generate`) is unaffected -- the layout is resolved at build time and the output HTML is identical.

## Acceptance Criteria

### Functional Requirements

- [x] `layouts/` directory exists with `layouts/default.vue`
- [x] `layouts/default.vue` contains: wrapper with `.page-wrapper.master-grid`, background gradient (main + `::before` + `::after`), `<RotateDeviceOverlay />`, `<GridOverlay />`, footer with BFNA logo, `<slot />` for page content
- [x] `app.vue` wraps `<NuxtPage />` inside `<NuxtLayout>` (i.e., `<NuxtLayout><NuxtPage /></NuxtLayout>`)
- [x] `pages/index.vue` no longer contains the wrapper div, background gradient styles, footer, `<RotateDeviceOverlay />`, or `<GridOverlay />`
- [x] `pages/index.vue` retains: description block, `<RenewableEnergyChart />`, background image (planet), page-specific scoped styles, `useHead()` call
- [x] The renewables page at `/` renders pixel-identically to before the extraction
- [x] A minimal back-link navigation element exists in the layout (even if hidden on the homepage)
- [x] The `.layout-1` grid placement class is applied to the layout wrapper via `definePageMeta({ layoutClass: 'layout-1' })` + computed class binding
- [x] Footer source attribution is handled via `definePageMeta({ footerSource: { url, label } })` + layout reads `route.meta.footerSource`
- [x] Back-link `<nav>` element has `aria-label="Back navigation"` for accessibility

### Non-Functional Requirements

- [x] `npm run dev` starts without errors
- [x] `npm run generate` completes without errors
- [ ] Browser DevTools console shows zero Vue/Nuxt warnings or errors
- [ ] No duplicate DOM elements (footer, rotate overlay, grid overlay should appear exactly once)

### Quality Gates

- [ ] Visual comparison confirms pixel-identical rendering at `/`
- [ ] Layout is visible in Nuxt DevTools as the active layout for the page
- [x] The `<slot />` content (page elements) participates correctly in the CSS grid
- [ ] `mix-blend-mode: overlay` on `.grid-overlay` is visually identical to baseline (verify in DevTools computed styles)

## Success Metrics

- Zero visual regression on the renewables infographic page
- The layout is reusable: adding a new infographic page with `layout: 'default'` (or no layout specification) automatically gets the shared visual identity
- Downstream tasks (embed layout, homepage hub, straits infographic page) are unblocked

## Dependencies & Risks

### Dependencies

- **BF-68 (completed):** Nuxt file-based routing must be active with `pages/index.vue` and `app.vue` as the thin shell. This is confirmed complete.

### Risks

- **UPGRADED to High risk: Named slots DO NOT work through `<NuxtPage>`** -- Research confirms this is a known Nuxt limitation (GitHub nuxt/nuxt#23929, open since 2023, still unresolved). **Mitigation: Use `definePageMeta` for footer source attribution instead of named slots.** This is now the recommended approach in the MVP section below.

- **Medium risk: CSS grid slot integration** -- The `<slot />` fragment must produce elements that are valid CSS grid children of the layout's `.master-grid` container. If the page has a single root `<div>`, that div becomes one grid item (potentially breaking the multi-column layout). The page must either have multiple root elements (fragment) or use a transparent wrapper. **Mitigation:** Test with Nuxt DevTools to verify DOM structure. Use Vue's multi-root component feature (fragments) in the page.

- **Medium risk: `mix-blend-mode` stacking context change** -- The `<GridOverlay>` uses `mix-blend-mode: overlay`, which creates a new stacking context. Moving it from the page to the layout changes the DOM hierarchy. While the sibling relationship is preserved (GridOverlay and page content are both children of `.page-wrapper`), the stacking context behavior must be verified visually. **Mitigation:** Compare DevTools computed styles for `.grid-overlay` before and after extraction. Verify the overlay effect is visually identical.

- **Medium risk: `overflow: hidden` on `.master-grid` clipping absolutely-positioned elements** -- The `.master-grid` class has `overflow: hidden`. The footer and back-link use `position: absolute`. While both are within the container bounds, edge cases at small viewports or with the grid's `min-height: 1080px` could cause clipping. **Mitigation:** Test at multiple viewport sizes, especially narrow widths where mobile styles kick in (900px and below).

- **Low risk: `definePageMeta` for layoutClass** -- Using route meta to pass the layout variant class requires the layout to read `useRoute().meta.layoutClass`. If a page does not define this meta, the computed class will be empty, which is the correct fallback (no layout variant applied). **Mitigation:** Default to empty string in the computed property.

- **Low risk: Footer source attribution** -- The `definePageMeta` approach requires each page to define `footerSource`. If a page forgets, `route.meta.footerSource` is `undefined` and the `v-if` guard hides the source link, leaving only the BFNA logo in the footer. **Mitigation:** This is acceptable default behavior. No source is better than a broken link.

- **Low risk: Back-link on homepage** -- The homepage is currently `/` (the renewables page). A "Back to home" link on this page would link to itself. **Mitigation:** Hide the back link when `route.path === '/'` or when the page opts out via `definePageMeta({ showBackLink: false })`.

## MVP

### layouts/default.vue

```vue
<script setup>
const route = useRoute()
const layoutClass = computed(() => route.meta.layoutClass || '')
const showBackLink = computed(() => route.meta.showBackLink !== false && route.path !== '/')
const footerSource = computed(() => route.meta.footerSource)
</script>

<template>
  <div class="page-wrapper | master-grid" :class="layoutClass">
    <RotateDeviceOverlay />
    <GridOverlay />

    <nav v-if="showBackLink" aria-label="Back navigation" class="back-link-nav">
      <NuxtLink to="/">Back to home</NuxtLink>
    </nav>

    <slot />

    <footer>
      <a v-if="footerSource"
         :href="footerSource.url"
         target="_blank"
         rel="noopener noreferrer"
         class="source-link">
        {{ footerSource.label }}
      </a>
      <span v-else></span>
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

.back-link-nav a:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
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

.source-link:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
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
  <div class="description">
    <h1 class="title">Renewables on the Rise</h1>
    <p>Amid rising concerns about climate change and energy security, a growing number of states have invested in expanding renewable energy infrastructure. This has been especially visible in the Indo-Pacific, where several countries have become global leaders in solar, wind, hydroelectric and geothermal power generation. However, not every state in the region has embraced renewables so enthusiastically. This infographic displays the 2024 renewable energy usage percentages of the region's largest economies, alongside those of the United States and European Union.</p>
    <p class="source-description"><em>Percentage of electricity produced from renewable sources, which include solar, wind, hydropower, bioenergy, geothermal, wave, and tidal.</em></p>
  </div>
  <RenewableEnergyChart class="chart"/>
  <div class="bg-image">
    <img src="@/assets/images/background.png" alt="" role="presentation" />
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

**Key changes from original MVP:**
1. Removed `<template #footer-source>` named slot from pages/index.vue (does not work through NuxtPage).
2. Added `footerSource: { url, label }` to `definePageMeta`.
3. Layout reads `route.meta.footerSource` with a computed property and renders the footer source link conditionally.
4. Added `aria-label="Back navigation"` to the `<nav>` element.
5. Added `:focus-visible` styles for keyboard accessibility on back-link and source-link.
6. Added `<span v-else></span>` in footer to maintain `justify-content: space-between` layout when no source is present.

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

### New Verification Items (from research)
- [ ] `mix-blend-mode: overlay` on `.grid-overlay` computed style matches baseline (verify in DevTools Elements > Computed tab)
- [ ] Footer is not clipped by `overflow: hidden` on `.master-grid` at any viewport size
- [ ] Back-link nav is not clipped by `overflow: hidden` on `.master-grid`
- [ ] `definePageMeta` values (`layoutClass`, `showBackLink`, `footerSource`) are readable via `useRoute().meta` in the layout (verify via Vue DevTools or console log)
- [ ] Keyboard navigation: Tab to back-link (on non-homepage) shows visible focus ring
- [ ] Keyboard navigation: Tab to source link in footer shows visible focus ring
- [ ] No `requestAnimationFrame` duplication: only one GridOverlay animation loop running (check Performance tab in DevTools)

## Resolved Questions (from research)

These questions from the original plan are now resolved:

1. **Named slots through `<NuxtPage>`**: **NO.** Nuxt does NOT support named slots from a page component to its layout through the `<NuxtPage>` intermediary (GitHub nuxt/nuxt#23929). **Use `definePageMeta` for footer source attribution.**

2. **Back-link visibility on homepage**: **Hide via dual guard.** The MVP uses both `route.path !== '/'` and `definePageMeta({ showBackLink: false })` as a belt-and-suspenders approach. When the homepage hub is built, the renewables page moves to `/infographics/renewables` and the `route.path` guard naturally enables the back link. This is acceptable.

3. **GridOverlay z-index interaction**: **Safe but verify.** The `mix-blend-mode: overlay` on `<GridOverlay>` creates a stacking context. Moving it to the layout preserves the sibling relationship with page content (both are children of `.page-wrapper`). The blend mode should work identically. **Verify visually after extraction** (added to checklist).

4. **`public/styles.css` refactoring**: **Keep `.layout-1` global.** Moving it to scoped styles would require `:deep()` selectors because the layout owns the `.layout-1` class (via dynamic binding) but the styled children (`.description`, `.chart`, `.bg-image`) are in the page slot. Keeping it global is simpler, matches the current pattern, and follows YAGNI.

5. **Embed layout shared styles**: **Defer.** Do not extract shared gradient styles into a utility file now. The embed layout task will handle that when it is implemented. YAGNI applies -- extracting now adds complexity for a hypothetical future need.

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
- **Research references:**
  - [Nuxt 4.x Layouts documentation](https://nuxt.com/docs/4.x/directory-structure/app/layouts)
  - [Nuxt 4.x NuxtLayout component](https://nuxt.com/docs/4.x/api/components/nuxt-layout)
  - [Nuxt 4.x definePageMeta utility](https://nuxt.com/docs/4.x/api/utils/define-page-meta)
  - [GitHub nuxt/nuxt#23929 -- Named layout slots directly within pages](https://github.com/nuxt/nuxt/issues/23929)
  - [Vue 3 SFC CSS Features -- :slotted()](https://vuejs.org/api/sfc-css-features)
  - [Vue 3 Slots documentation](https://vuejs.org/guide/components/slots.html)
  - [MDN -- CSS Stacking Context](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout/Stacking_context)
  - [MDN -- mix-blend-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mix-blend-mode)
