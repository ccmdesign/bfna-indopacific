---
title: "feat: Create embed layout (layouts/embed.vue)"
type: feat
status: active
date: 2026-03-03
linear: BF-70
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
depends_on: docs/plans/2026-03-03-feat-extract-shared-layout-into-default-vue-plan.md
---

# feat: Create embed layout (layouts/embed.vue)

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

A path-specific override is needed:

```toml
[[headers]]
  for = "/embed/*"
  [headers.values]
    X-Frame-Options = ""
```

**Note:** Netlify processes header rules in order, with more specific paths taking precedence. The `/embed/*` rule should be placed **before** the `/*` catch-all rule.

**Decision: This header change can be included in this task or handled as a separate task.** It is infrastructure config, not Vue code, but it is tightly coupled to the embed layout's purpose. The implementer should decide based on scope preference.

## Technical Considerations

### Scoped styles and slot content

Same considerations as BF-69 (extract-shared-layout):
- Scoped styles in the embed layout do NOT affect slot content (page elements). This is correct -- page elements are styled by `public/styles.css` (global grid placements) and their own scoped styles.
- The embed layout only styles its own elements (`.page-wrapper` wrapper, pseudo-elements).

### GridOverlay inclusion rationale

The brainstorm explicitly mentions "keeps background gradient and rotate overlay" for the embed layout. It does not explicitly mention `GridOverlay`. However, `GridOverlay` is part of the shared visual identity (the dark glassmorphism aesthetic) and is included in `default.vue`. Excluding it from the embed layout would create a visually inconsistent experience between `/infographics/renewables` and `/embed/renewables`.

**Recommendation: Include `GridOverlay` in the embed layout.** It is lightweight (selects 4 random grid items every 8 seconds), uses `pointer-events: none`, and contributes to the immersive visual identity that should be consistent across all infographic rendering contexts.

### No footer means no padding-bottom

The `default.vue` layout uses `padding-bottom: 4rem` on `.page-wrapper` to prevent content from being hidden behind the absolutely-positioned footer. Since the embed layout has no footer, this padding should be removed (set to `0` or omitted entirely). This gives the infographic the full viewport height in the iframe.

### Embed viewport considerations

The brainstorm recommends `1280 x 800` px as the iframe dimensions. The embed layout should work well at this size. The `.master-grid` currently has `min-height: 1080px`, which is larger than the recommended 800px iframe height. This means the embed content will scroll vertically inside the iframe.

**Decision: Keep `min-height: 1080px` in the embed layout for now.** The infographics are designed for this minimum height. Changing it would affect layout and is outside the scope of creating the embed layout. If embed-specific viewport adjustments are needed, they can be addressed in a follow-up task.

### mix-blend-mode stacking context

Same consideration as BF-69: `GridOverlay` uses `mix-blend-mode: overlay`, which creates a stacking context. Since the embed layout has the same DOM structure (minus footer and nav), the blending behavior is preserved. The `<slot />` does not create an intermediate DOM element, so page content and `GridOverlay` remain siblings in the same stacking context.

## Acceptance Criteria

- [ ] `layouts/embed.vue` exists and renders correctly
- [ ] The embed layout includes: background gradient (same as `default.vue`), `::before` and `::after` pseudo-element overlays, `RotateDeviceOverlay`, `GridOverlay`, `<slot />`
- [ ] The embed layout does NOT include: back-link `<nav>`, `<footer>`, `padding-bottom` for footer
- [ ] The embed layout reads `layoutClass` from `route.meta` and applies it as a dynamic class on the wrapper (same pattern as `default.vue`)
- [ ] A page can opt into the embed layout via `definePageMeta({ layout: 'embed' })`
- [ ] The embed layout visually matches `default.vue` minus the nav and footer when viewed side-by-side
- [ ] No regressions to `default.vue` or existing pages
- [ ] The `netlify.toml` header configuration for `/embed/*` is either included or documented as a co-requisite task

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

### netlify.toml (header addition)

```toml
# Place BEFORE the existing /* catch-all rule
[[headers]]
  for = "/embed/*"
  [headers.values]
    X-Frame-Options = ""
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

## Open Questions

1. **GridOverlay in embed layout?** The brainstorm mentions "background gradient and rotate overlay" but not GridOverlay. This plan recommends including it for visual consistency. The implementer should confirm this matches design intent.

2. **CSS duplication vs. extraction:** The plan recommends duplicating the ~40 lines of background styles for simplicity. If the implementer prefers DRY, they can extract shared styles into `assets/layout-base.css`.

3. **Netlify headers scope:** Should the `netlify.toml` change be part of this task or a separate infrastructure task? The plan documents both options.

4. **`min-height: 1080px` in embeds:** The master grid's minimum height exceeds the recommended 800px iframe height. Should the embed layout override this? The plan defers this to a follow-up if needed.

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md](docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md) -- Key decisions carried forward: dual-layout architecture (default vs. embed), embed strips back-link and footer, embed security headers for `/embed/*`
- **Depends on:** [docs/plans/2026-03-03-feat-extract-shared-layout-into-default-vue-plan.md](docs/plans/2026-03-03-feat-extract-shared-layout-into-default-vue-plan.md) (BF-69, completed) -- established the `default.vue` layout pattern, `definePageMeta` approach, and scoped style conventions
- **Existing layout:** `layouts/default.vue` -- the source of truth for shared visual identity elements
- **Netlify headers:** `netlify.toml` -- current global `X-Frame-Options: DENY` configuration
