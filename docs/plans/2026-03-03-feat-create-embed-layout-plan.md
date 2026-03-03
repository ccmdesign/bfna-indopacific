---
title: "feat: Create embed layout (layouts/embed.vue)"
type: feat
status: active
date: 2026-03-03
linear: BF-70
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
depends_on: docs/plans/2026-03-03-feat-extract-shared-layout-into-default-vue-plan.md
deepened: 2026-03-03
---

# feat: Create embed layout (layouts/embed.vue)

## Enhancement Summary

**Deepened on:** 2026-03-03
**Sections enhanced:** 6 (Netlify headers, security, layout architecture, CSS strategy, viewport, accessibility)
**Research sources:** Nuxt 4 layout docs, Netlify headers docs, OWASP clickjacking cheat sheet, MDN CSP frame-ancestors, Netlify Support Forums, Vue/Nuxt skill references

### Key Improvements
1. **Critical fix: Netlify header strategy** -- Setting `X-Frame-Options: ""` does NOT reliably unset the header on Netlify. Replaced with `Content-Security-Policy: frame-ancestors *` as the modern, working approach.
2. **Nuxt layout single-root-element constraint** -- Nuxt requires layouts to have a single root element (not a `<slot />`) to support layout transitions. The MVP template already satisfies this but it is now documented explicitly as a constraint.
3. **Embed-specific accessibility** -- Added `RotateDeviceOverlay` iframe-awareness edge case: the component uses `window.innerHeight`/`window.innerWidth` which reflect the iframe viewport, not the parent page. This is correct behavior for embeds.
4. **`overflow: hidden` interaction with 1080px min-height** -- Documented that `.master-grid` sets `overflow: hidden`, which means the 1080px content will be clipped (not scrolled) inside an 800px iframe. This changes the risk profile of the min-height decision.
5. **Security hardening** -- Added `Referrer-Policy` and `Permissions-Policy` headers for embed routes, and documented why `X-Frame-Options` should be kept as a legacy fallback alongside `frame-ancestors`.

### New Considerations Discovered
- Netlify cannot reliably unset inherited headers; CSP `frame-ancestors` is the correct override mechanism
- The `overflow: hidden` on `.master-grid` means embed content at 1080px min-height will be clipped, not scrollable, in 800px iframes -- this may need a follow-up adjustment
- `GridOverlay` renders 100 DOM elements with a `requestAnimationFrame` loop; in embedded contexts with multiple iframes on a single page, this creates a performance multiplier worth monitoring
- The `RotateDeviceOverlay` uses `position: fixed` with `z-index: 9999`, which behaves correctly inside iframes (fixed positioning is relative to the iframe viewport)

## Overview

Create a minimal Nuxt layout for `/embed/*` routes that strips the back-link navigation and footer but retains the background gradient, pseudo-element overlays, `RotateDeviceOverlay`, and `GridOverlay`. This is the second layout in the dual-layout architecture defined in the brainstorm (see brainstorm: `docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md`, Key Decisions > Routing & Layouts).

The embed layout enables infographics to be rendered inside iframes on third-party websites. It delivers the full infographic visual experience (gradient, grid overlay, rotate prompt) without site chrome (navigation, footer attribution, BFNA logo footer bar) that would be redundant or confusing in an embedded context.

### Relationship to Prior Work

- **BF-69 (completed):** Created `layouts/default.vue` with shared visual identity elements (background gradient, footer, back-link nav, `RotateDeviceOverlay`, `GridOverlay`). The embed layout reuses the same visual foundation but omits the site chrome elements.
- **Brainstorm decision:** "layouts/embed.vue -- strips back-link and footer; keeps background gradient and rotate overlay (part of the infographic experience)" (see brainstorm: Key Decisions > Routing & Layouts).

## Problem Statement / Motivation

When infographics are embedded via iframe on third-party sites, the default layout's back-link ("Back to home") and footer (source attribution + BFNA logo bar) are inappropriate:

- The back-link navigates to the homepage of the BFNA site, which is meaningless inside an iframe on someone else's site.
- The footer takes up 4rem of vertical space that should go to infographic content in the constrained iframe viewport (recommended 1280x800).
- The footer's source attribution is a site-level concern, not an embed-level concern.

The embed layout solves this by providing the same immersive background experience without the site chrome.

## Proposed Solution

### Part 1: Create `layouts/embed.vue`

Create a new layout file at `layouts/embed.vue` that mirrors the visual foundation of `default.vue` but omits the back-link `<nav>` and `<footer>` elements.

**File: `layouts/embed.vue`**

The layout includes:

1. **Wrapper div** with `.page-wrapper` and `.master-grid` classes, plus dynamic `:class="layoutClass"` binding (same pattern as `default.vue`)
2. **Background gradient** -- the same `linear-gradient(to bottom, #0D0D0D 5%, #022640 105%)` background, `::before` radial blue overlay, and `::after` dark gradient overlay
3. **`<RotateDeviceOverlay />`** -- the mobile portrait-mode rotate prompt (part of the infographic experience per brainstorm)
4. **`<GridOverlay />`** -- the decorative animated grid overlay (part of the shared visual identity)
5. **`<slot />`** -- where the page-specific infographic content is injected

The layout **omits**:

- The `<nav>` back-link element
- The `<footer>` element (source attribution + BFNA logo)
- The `padding-bottom: 4rem` that `default.vue` uses to accommodate the footer

**What stays the same as `default.vue`:**

- The `<script setup>` reads `route.meta.layoutClass` via `useRoute()` and applies it as a dynamic class, so embed pages can use the same grid placement classes (`.layout-1`, `.layout-2`, etc.)
- Auto-imported components (`RotateDeviceOverlay`, `GridOverlay`) -- no explicit imports needed in Nuxt

**What the embed layout does NOT need from `definePageMeta`:**

- `showBackLink` -- irrelevant, no back-link element exists
- `footerSource` -- irrelevant, no footer element exists
- `backLinkTarget` -- irrelevant, no back-link element exists

The embed layout only reads `layoutClass` from page meta.

#### Research Insights: Nuxt Layout Architecture

**Best Practices (from Nuxt 4 docs):**
- Layouts MUST have a single root element to allow Nuxt to apply transitions between layout changes. The root element cannot be a `<slot />`. The MVP template correctly uses a wrapper `<div>` as root.
- Nuxt auto-discovers layouts in the `layouts/` directory. File names are auto-kebab-cased (`embedFull.vue` would become `embed-full`). Since our file is `embed.vue`, it maps to `layout: 'embed'` -- no casing issues.
- The `<NuxtLayout>` wrapper in `app.vue` already handles layout switching. No changes to `app.vue` are needed.

**Alternative layout assignment (not needed, but documented):**
- Nuxt 4 supports `routeRules` in `nuxt.config.ts` for centralized layout assignment: `routeRules: { '/embed/**': { appLayout: 'embed' } }`. This could replace per-page `definePageMeta` calls. However, since embed pages are a separate task and each may need different `layoutClass` values, per-page `definePageMeta` remains the better approach.

**Edge Cases:**
- If a page does not call `definePageMeta({ layout: 'embed' })`, it falls back to `layouts/default.vue`. This is correct -- only explicit embed pages should use the embed layout.
- Layout transitions: if the app later adds animated transitions between layouts, the single-root-element constraint is already satisfied.

### Part 2: Handle CSS duplication between default.vue and embed.vue

The background gradient styles (`.page-wrapper`, `::before`, `::after`) are currently scoped inside `layouts/default.vue`. The embed layout needs the same styles. There are two approaches:

**Recommended approach: Duplicate the scoped styles.**

Rationale:
- The two layouts share ~40 lines of CSS (`.page-wrapper` background, `::before`, `::after`, responsive media query). This is a small, stable surface -- the gradient is a design constant unlikely to change frequently.
- Extracting shared styles into a separate file (e.g., `assets/layout-base.css`) adds indirection for marginal DRY benefit. The BF-69 plan (extract-shared-layout) already established that layout styles are scoped and self-contained.
- The two layouts will diverge: `default.vue` keeps `padding-bottom: 4rem` for the footer; `embed.vue` does not. The embed layout may also need embed-specific tweaks (e.g., removing `min-height: 1080px` constraint if embeds should be more flexible).

**Alternative (if implementer prefers DRY):**

Extract the shared `.page-wrapper` base styles into `assets/layout-base.css` and import via `@import` in each layout's `<style scoped>` block. Vue SFC `@import` in scoped styles is supported -- the imported styles receive the same scoping hash.

**Decision: Left to implementer.** Both approaches are valid. The plan recommends duplication for simplicity but either works.

#### Research Insights: CSS Strategy

**Best Practices (from Vue/Nuxt skills):**
- Vue SFC scoped `@import` does apply the scoping hash to imported styles. This means `assets/layout-base.css` would be properly scoped in both layouts -- no risk of style leakage.
- However, scoped styles generate a unique `data-v-xxxxx` attribute per component. If both layouts import the same CSS file, the imported rules will get different scoping hashes. This means the browser loads two slightly different copies of the same rules. For ~40 lines this is negligible, but it confirms that duplication is functionally equivalent to extraction for this use case.

**Recommendation stands: Duplicate for simplicity.** The ~40 lines of CSS produce ~1KB uncompressed. The cognitive overhead of an extracted file outweighs the byte savings, especially since the two layouts are expected to diverge.

### Part 3: Embed pages use `definePageMeta({ layout: 'embed' })`

Embed route pages (e.g., `pages/embed/renewables.vue`, `pages/embed/straits.vue`) will opt into the embed layout via:

```ts
definePageMeta({
  layout: 'embed',
  layoutClass: 'layout-1' // or 'layout-2' for straits
})
```

This is the standard Nuxt pattern for selecting a non-default layout (see Nuxt docs: Views > Layouts). No changes to `app.vue` or `nuxt.config.ts` are needed -- Nuxt auto-discovers layouts in the `layouts/` directory.

**Note:** The embed page files themselves are NOT part of this task. This task only creates the layout. The embed pages are a separate task that depends on this one.

#### Research Insights: definePageMeta

**Best Practices (from Nuxt 4 docs):**
- `definePageMeta` is a compiler macro -- it is hoisted out of the component at build time. This means you cannot reference component-local variables inside `definePageMeta`. Only literals and imported constants are allowed.
- The `layout` property accepts `false` (to disable layout entirely), a string, or a `ref`/`computed` for reactive layout switching. For embed pages, a static string `'embed'` is correct.
- `layoutClass` is a custom meta property (not a Nuxt built-in). It was established in BF-69 via the `PageMeta` interface augmentation in `default.vue`. The embed layout reads it the same way -- no interface changes needed since the augmentation in `default.vue` already extends `PageMeta` globally.

### Part 4: Netlify headers for iframe embedding (co-requisite)

The brainstorm specifies (see brainstorm: Key Decisions > Embed Security):
- `/embed/*` routes must have `X-Frame-Options` removed (currently `DENY` globally)
- All other routes keep `X-Frame-Options: DENY`

The current `netlify.toml` has:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
```

#### Research Insights: Critical Fix -- Netlify Header Override Strategy

**The original plan's approach (`X-Frame-Options = ""`) will NOT work reliably.** Research from Netlify Support Forums confirms:

1. **Netlify cannot reliably unset inherited headers.** Setting a header to an empty string does not remove it -- it either produces a syntax error or the header inherits from the parent `/*` rule. Netlify Support has confirmed this is a known limitation with an open internal feature request (no timeline).

2. **The modern, working alternative is `Content-Security-Policy: frame-ancestors`.** This is the CSP Level 2 directive that supersedes `X-Frame-Options` for controlling iframe embedding. It is supported in all modern browsers (Chrome 40+, Firefox 33+, Safari 10+, Edge 15+).

3. **`frame-ancestors` takes precedence over `X-Frame-Options`** when both are present. Per the OWASP Clickjacking Defense Cheat Sheet and MDN, if `Content-Security-Policy: frame-ancestors` is set, browsers ignore `X-Frame-Options`. This means we do NOT need to unset `X-Frame-Options` -- we just need to add `frame-ancestors` on embed routes.

**Revised approach:**

```toml
# Embed routes: allow iframe embedding from any origin
[[headers]]
  for = "/embed/*"
  [headers.values]
    Content-Security-Policy = "frame-ancestors *"
    X-Frame-Options = "SAMEORIGIN"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

# All other routes: deny iframe embedding
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

**Key changes from original plan:**
- **Added `Content-Security-Policy: frame-ancestors *`** -- This is the actual mechanism that allows iframe embedding. The `*` wildcard permits embedding from any origin, which is correct for public infographics intended for third-party embedding.
- **Changed `X-Frame-Options` from `""` to `"SAMEORIGIN"`** -- Since we cannot unset the header, we set it to `SAMEORIGIN` as a fallback for the rare legacy browser that does not support CSP. `SAMEORIGIN` allows embedding within the same origin and is the least restrictive valid value besides the non-standard (and deprecated) `ALLOW-FROM`. Modern browsers will ignore this in favor of `frame-ancestors *`.
- **Added `Referrer-Policy`** -- Prevents the embed from leaking the full URL of the embedding page back to the BFNA site via `Referer` headers on sub-resource requests. `strict-origin-when-cross-origin` is the recommended default.
- **Kept `X-XSS-Protection` and `X-Content-Type-Options`** -- These are security headers that should apply to all routes including embeds.

**Important: `frame-ancestors` cannot be set via `<meta>` tag.** It MUST be an HTTP response header. This is why the `netlify.toml` configuration is the correct place (not in the Vue app).

**Important: Rule ordering in `netlify.toml`.** The `/embed/*` rule MUST appear before the `/*` catch-all rule. Netlify processes rules in order; the first matching rule with a given header name wins for that header.

**Security consideration: `frame-ancestors *` vs. allowlisting specific domains.**
- `frame-ancestors *` allows embedding from ANY origin. This is appropriate for public infographics intended for broad distribution (news sites, partner organizations, etc.).
- If the use case evolves to require restricting which domains can embed, change `*` to a space-separated list: `frame-ancestors 'self' https://partner1.com https://partner2.com`.
- The plan recommends starting with `*` for simplicity and narrowing later if needed.

**Decision: This header change should be included in this task.** The embed layout without the header change is non-functional -- iframes will be blocked. Shipping a layout without the headers creates a broken experience that could confuse testing. Include both in the same PR.

### Part 5: Embed route `_headers` file alternative (contingency)

If `netlify.toml` header ordering does not work as expected in testing, Netlify also supports a `_headers` file placed in the publish directory (`.output/public/_headers` for this project). The `_headers` file uses a simpler syntax:

```
/embed/*
  Content-Security-Policy: frame-ancestors *
  X-Frame-Options: SAMEORIGIN
  X-XSS-Protection: 1; mode=block
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/*
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  X-Content-Type-Options: nosniff
```

This file can be placed at `public/_headers` and Nuxt's static generation will copy it to `.output/public/_headers`. This is documented as a contingency only -- `netlify.toml` is the preferred approach for this project.

## Technical Considerations

### Scoped styles and slot content

Same considerations as BF-69 (extract-shared-layout):
- Scoped styles in the embed layout do NOT affect slot content (page elements). This is correct -- page elements are styled by `public/styles.css` (global grid placements) and their own scoped styles.
- The embed layout only styles its own elements (`.page-wrapper` wrapper, pseudo-elements).

### GridOverlay inclusion rationale

The brainstorm explicitly mentions "keeps background gradient and rotate overlay" for the embed layout. It does not explicitly mention `GridOverlay`. However, `GridOverlay` is part of the shared visual identity (the dark glassmorphism aesthetic) and is included in `default.vue`. Excluding it from the embed layout would create a visually inconsistent experience between `/infographics/renewables` and `/embed/renewables`.

**Recommendation: Include `GridOverlay` in the embed layout.** It is lightweight (selects 4 random grid items every 8 seconds), uses `pointer-events: none`, and contributes to the immersive visual identity that should be consistent across all infographic rendering contexts.

#### Research Insights: GridOverlay Performance in Embed Context

**Performance consideration:** `GridOverlay` renders 100 `<div>` elements and runs a `requestAnimationFrame` loop continuously. In isolation this is negligible. However, if a third-party page embeds multiple infographic iframes (e.g., a dashboard with 4 embeds), each iframe has its own `GridOverlay` instance -- that is 400 DOM elements and 4 independent `requestAnimationFrame` loops.

**Mitigation (not needed now, but documented for future):**
- The `GridOverlay` already uses `onUnmounted` to cancel the animation frame. If iframes are removed from the DOM, cleanup happens automatically.
- If performance issues arise with multiple embeds, consider: (a) adding an `IntersectionObserver` to pause the animation when the iframe is not visible, or (b) accepting a `disableGridOverlay` query parameter for embed URLs.
- For now, the performance impact is negligible. Monitor if multi-embed usage grows.

### No footer means no padding-bottom

The `default.vue` layout uses `padding-bottom: 4rem` on `.page-wrapper` to prevent content from being hidden behind the absolutely-positioned footer. Since the embed layout has no footer, this padding should be removed (set to `0` or omitted entirely). This gives the infographic the full viewport height in the iframe.

### Embed viewport considerations

The brainstorm recommends `1280 x 800` px as the iframe dimensions. The embed layout should work well at this size. The `.master-grid` currently has `min-height: 1080px`, which is larger than the recommended 800px iframe height.

#### Research Insights: overflow: hidden interaction

**Critical finding:** The `.master-grid` class in `public/styles.css` sets `overflow: hidden`. This means the embed content will NOT scroll inside the iframe -- it will be **clipped** at 800px if the iframe is that height while the content is 1080px tall. The bottom ~280px of infographic content would be invisible.

This is different from the original plan's statement that "the embed content will scroll vertically inside the iframe." With `overflow: hidden`, there is no scrolling -- content is simply cut off.

**Impact assessment:**
- If the iframe is set to the recommended 1280x800 dimensions, the bottom portion of the infographic (including parts of charts that may extend into the lower grid rows) could be clipped.
- The `default.vue` layout has the same constraint but is viewed at full viewport height (typically 900px+ on desktop), so the clipping is less severe.

**Decision: Keep `min-height: 1080px` in the embed layout for now.** The infographics are designed for this minimum height and the `overflow: hidden` behavior is a pre-existing design choice. However, this should be flagged as a **known issue to test during embed page development**. If clipping is unacceptable, the follow-up task should either:
1. Override `min-height` in the embed layout to match the iframe height
2. Add `overflow-y: auto` to the embed layout's `.page-wrapper` to enable scrolling
3. Adjust the recommended iframe dimensions to 1280x1080

### mix-blend-mode stacking context

Same consideration as BF-69: `GridOverlay` uses `mix-blend-mode: overlay`, which creates a stacking context. Since the embed layout has the same DOM structure (minus footer and nav), the blending behavior is preserved. The `<slot />` does not create an intermediate DOM element, so page content and `GridOverlay` remain siblings in the same stacking context.

### RotateDeviceOverlay in iframe context

#### Research Insights: Fixed positioning inside iframes

The `RotateDeviceOverlay` component uses `position: fixed` with `z-index: 9999`. Inside an iframe, `position: fixed` is relative to the iframe viewport, not the parent page's viewport. This is correct behavior -- the overlay will cover the iframe content completely when triggered.

The component's orientation detection (`window.innerHeight > window.innerWidth`) also reads the iframe's dimensions, not the parent page's. This means:
- If the iframe itself is in portrait orientation (e.g., a narrow sidebar embed), the rotate prompt will appear.
- If the iframe is landscape but the parent page is portrait, the rotate prompt will NOT appear. This is the desired behavior -- the infographic cares about its own rendering context.

**No changes needed.** The component works correctly in iframe contexts by default.

### Accessibility in embed context

#### Research Insights

**Keyboard focus management:** When a user tabs into an iframe, focus is trapped within the iframe's DOM. Since the embed layout has no navigation elements (no back-link, no footer links), the only focusable elements will be those in the page content (e.g., chart interactive elements, if any). This is acceptable -- embed users should interact with the infographic content, not navigate away.

**Screen reader considerations:** The embed layout has no `<nav>` landmark and no `<footer>` landmark. This simplifies the landmark structure. However, the `<slot />` content should include a `<main>` landmark (or the page content should be wrapped in one) to give screen readers an entry point. This is a concern for the embed page implementation (not this layout task), but it should be noted as a requirement for the embed page task.

**Color contrast:** The background gradient and overlay pseudo-elements are decorative. The actual content contrast is determined by the page content rendered in the `<slot />`. No layout-level contrast concerns.

## Acceptance Criteria

- [ ] `layouts/embed.vue` exists and renders correctly
- [ ] The embed layout includes: background gradient (same as `default.vue`), `::before` and `::after` pseudo-element overlays, `RotateDeviceOverlay`, `GridOverlay`, `<slot />`
- [ ] The embed layout does NOT include: back-link `<nav>`, `<footer>`, `padding-bottom` for footer
- [ ] The embed layout reads `layoutClass` from `route.meta` and applies it as a dynamic class on the wrapper (same pattern as `default.vue`)
- [ ] A page can opt into the embed layout via `definePageMeta({ layout: 'embed' })`
- [ ] The embed layout visually matches `default.vue` minus the nav and footer when viewed side-by-side
- [ ] No regressions to `default.vue` or existing pages
- [ ] The `netlify.toml` includes `Content-Security-Policy: frame-ancestors *` for `/embed/*` routes
- [ ] The `netlify.toml` `/embed/*` rule appears BEFORE the `/*` catch-all rule
- [ ] The `X-Frame-Options` on `/embed/*` is set to `SAMEORIGIN` (not empty string) as legacy fallback
- [ ] Security headers (`X-XSS-Protection`, `X-Content-Type-Options`, `Referrer-Policy`) are present on `/embed/*` routes

## MVP

### layouts/embed.vue

```vue
<script setup lang="ts">
const route = useRoute()
const layoutClass = computed(() => (route.meta.layoutClass as string) || '')
</script>

<template>
  <div class="page-wrapper | master-grid" :class="layoutClass">
    <RotateDeviceOverlay />
    <GridOverlay />

    <slot />
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
</style>
```

### netlify.toml (revised header configuration)

```toml
# Embed routes: allow iframe embedding from any origin via CSP frame-ancestors
# MUST appear BEFORE the /* catch-all rule
[[headers]]
  for = "/embed/*"
  [headers.values]
    Content-Security-Policy = "frame-ancestors *"
    X-Frame-Options = "SAMEORIGIN"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

# All other routes: deny iframe embedding
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

## Open Questions

1. **GridOverlay in embed layout?** The brainstorm mentions "background gradient and rotate overlay" but not GridOverlay. This plan recommends including it for visual consistency. The implementer should confirm this matches design intent.

2. **CSS duplication vs. extraction:** The plan recommends duplicating the ~40 lines of background styles for simplicity. If the implementer prefers DRY, they can extract shared styles into `assets/layout-base.css`.

3. ~~**Netlify headers scope:** Should the `netlify.toml` change be part of this task or a separate infrastructure task?~~ **Resolved: Include in this task.** The embed layout is non-functional without the headers. Ship both together.

4. **`min-height: 1080px` and `overflow: hidden` in embeds:** The master grid's minimum height (1080px) exceeds the recommended 800px iframe height, and `overflow: hidden` means content will be clipped (not scrolled). This should be tested during embed page development and addressed in a follow-up if clipping is unacceptable. Three remediation options are documented in the Technical Considerations section.

5. **`frame-ancestors *` vs. domain allowlist:** The plan uses `frame-ancestors *` to allow embedding from any origin. If the use case requires restricting embedding to specific partner domains, this can be narrowed later. Starting permissive is appropriate for public infographics.

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md](docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md) -- Key decisions carried forward: dual-layout architecture (default vs. embed), embed strips back-link and footer, embed security headers for `/embed/*`
- **Depends on:** [docs/plans/2026-03-03-feat-extract-shared-layout-into-default-vue-plan.md](docs/plans/2026-03-03-feat-extract-shared-layout-into-default-vue-plan.md) (BF-69, completed) -- established the `default.vue` layout pattern, `definePageMeta` approach, and scoped style conventions
- **Existing layout:** `layouts/default.vue` -- the source of truth for shared visual identity elements
- **Netlify headers:** `netlify.toml` -- current global `X-Frame-Options: DENY` configuration

### Research References

- [Nuxt 4 Layouts Documentation](https://nuxt.com/docs/4.x/directory-structure/app/layouts) -- Single root element constraint, layout auto-discovery, `definePageMeta` layout property
- [Nuxt 4 definePageMeta](https://nuxt.com/docs/4.x/api/utils/define-page-meta) -- Compiler macro behavior, supported property types
- [MDN: CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors) -- Syntax, browser support, interaction with X-Frame-Options
- [OWASP Clickjacking Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html) -- frame-ancestors as recommended defense, X-Frame-Options deprecation
- [Netlify Custom Headers Docs](https://docs.netlify.com/manage/routing/headers/) -- Path-specific header rules, netlify.toml syntax
- [Netlify Forum: Remove Inherited Header](https://answers.netlify.com/t/remove-inherited-header-applied-by-splat-path-in-headers/26263) -- Confirmation that unsetting headers via empty string does not work
- [Netlify Forum: X-Frame-Options Override](https://answers.netlify.com/t/change-the-header-x-frame-options-to-one-of-my-environments/27974) -- CSP frame-ancestors as the working solution
- [Netlify Forum: X-Frame-Options Breaking Change](https://answers.netlify.com/t/breaking-change-x-frame-options-set-to-deny/102220) -- Context on Netlify's default DENY behavior
- [CSP frame-ancestors vs X-Frame-Options](https://centralcsp.com/articles/frame-ancestor-frame-options) -- Comparison and migration guidance
- [Iframe Security Best Practices 2025](https://www.feroot.com/blog/how-to-secure-iframe-compliance-2025/) -- Sandbox attributes, postMessage security, CSP configuration
