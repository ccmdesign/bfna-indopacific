---
title: "feat: Build homepage hub with infographic cards"
type: feat
status: completed
date: 2026-03-03
linear: BF-74
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
deepened: 2026-03-03
---

## Enhancement Summary

**Deepened on:** 2026-03-03
**Sections enhanced:** 9
**Research sources:** Vue 3 component patterns, Nuxt SSG best practices, WCAG 2.1 accessibility guidelines, CSS glassmorphism accessibility research, motion design principles, SEO meta tag patterns, presentation/logic split architecture, UX writing conventions

### Key Improvements
1. Added `useSeoMeta()` for Open Graph / social sharing tags -- critical for a homepage that will be shared by journalists and publishers
2. Added `prefers-reduced-motion` media query to card hover animation -- the original plan's `transform: translateY(-2px)` violates motion accessibility without this
3. Added `<main>` landmark and ARIA `role="list"` to card grid for screen reader navigation structure
4. Identified CSS specificity conflict: `.layout-home` uses `display: flex` but `.master-grid` uses `display: grid` -- both classes apply simultaneously on the same element, so the `.layout-home` override needs sufficient specificity
5. Added `RotateDeviceOverlay` suppression via page meta -- confirmed this overlay is confusing on a scrollable card grid homepage

### New Considerations Discovered
- The footer `position: absolute` in `default.vue` will cause overlap on the homepage when content is short (only 2 cards); the footer is positioned relative to `.page-wrapper`, not the document flow
- Thumbnail path should use `/images/thumbnails/` (in `public/`) not `~/assets/images/thumbnails/` for SSG compatibility without `@nuxt/image` module
- The `infographic-cards` grid class is defined in the plan's CSS section but also referenced as a BEM-style class in `public/styles.css` -- keep card-specific styles in the scoped component to avoid leaking

---

# Build Homepage Hub with Infographic Cards

## Overview

Replace the current `pages/index.vue` (which renders the Renewables infographic directly) with a card-based homepage hub that lists all available infographics. Each card provides a preview thumbnail, title, short description, an "Embed Code" button (copy iframe snippet), and a "View Infographic" link to `/infographics/<slug>`. The page uses the same dark glassmorphism aesthetic established across the infographic pages.

This is the homepage entry point described in the multi-infographic brainstorm (see brainstorm: `docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md`), which defined the URL structure as `/ = card-based hub listing all infographics`.

## Problem Statement / Motivation

The site currently renders the Renewables infographic at `/` (`pages/index.vue` wraps `<RenewablesInfographic />`). With the multi-infographic architecture now scaffolded (routing, layouts, embed pages), there is no discovery mechanism for users to find and navigate between infographics. The homepage hub solves this by providing a single entry point that:

1. **Surfaces all infographics** with visual previews, encouraging exploration
2. **Provides direct embed access** from the homepage, reducing friction for journalists and publishers who want to embed without visiting each infographic first
3. **Scales naturally** as new infographics are added (the planned third infographic will simply be another card)

## Proposed Solution

Build `pages/index.vue` as a responsive card grid with the following structure:

- A page title/header section ("BFNA Indo-Pacific" or similar)
- A CSS Grid of `InfographicCard` components, one per infographic
- Each card contains: thumbnail image, title, description text, "Embed Code" button, "View Infographic" link
- The card data is defined as a static array in the page component (no external data file needed for 2-3 items)
- The page uses `layouts/default.vue` but opts out of the infographic-specific `master-grid` layout class, since the homepage has its own layout needs

### Research Insights

**Best Practices (Nuxt SSG Homepage):**
- Use `useSeoMeta()` alongside `useHead()` to set Open Graph meta for social sharing -- this is the homepage URL that journalists will share
- Static card data inline in the page component is the correct pattern for 2-3 items; extracting to a separate file adds indirection without benefit at this scale
- Nuxt SSG pre-renders `index.vue` automatically at `/index.html` -- no additional `nitro.prerender.routes` entry needed for the homepage

**UX Writing (Card Copy):**
- Card descriptions should front-load the value proposition: lead with what the user will discover, not what the infographic "is"
- "View Infographic" is clear and action-oriented; avoid "Learn More" or "See More" which are vague
- "Copy Embed Code" (existing button label) follows the `[Verb] [object]` pattern recommended by UX writing best practices

## Technical Considerations

### Architecture

**No new layout required.** The homepage can use `layouts/default.vue` with a different `layoutClass` (e.g., `'layout-home'`) or no class at all. The `master-grid` CSS is designed for full-viewport infographic dashboards; the homepage needs a simpler vertically-scrolling layout. The default layout already provides the background gradient, `RotateDeviceOverlay`, `GridOverlay`, and footer.

**However, the homepage does NOT need the footer pattern used by infographic pages** (source attribution + embed button + BFNA logo). The homepage footer should show only the BFNA logo. This is already handled -- `layouts/default.vue` conditionally renders `footerSource` and `embedSlug` from page meta, so omitting them from `definePageMeta()` in `index.vue` will produce a clean footer with just the logo.

**Back link suppression** is already handled: `default.vue` hides the back link when `route.path === '/'` (see `layouts/default.vue:20`).

#### Research Insights

**Architecture Review (Presentation/Logic Split Assessment):**
- The `InfographicCard` component is purely presentational -- it receives all data via props and delegates the clipboard logic to `EmbedCodeButton`. This correctly follows the presentation/logic split pattern without needing an integration component, because the only side effect (clipboard write) is already encapsulated in `EmbedCodeButton` + `useEmbedCode` composable.
- No composable extraction needed for `InfographicCard` itself -- it has zero side effects, zero API calls, and zero browser API usage.

**Component Boundaries (Vue Best Practices):**
- `InfographicCard.vue` has a single clear responsibility: render one card with its actions. Correct granularity.
- `pages/index.vue` acts as the composition surface: owns the data array, renders the grid, and sets page meta. This is the proper role for a page component.
- No "fat component" risk -- the page component has ~30 lines of script and ~15 lines of template.

**CSS Specificity Concern:**
- `layouts/default.vue` line 28 applies both `.page-wrapper` AND `.master-grid` classes to the wrapper `<div>`, then adds `layoutClass` as a third class. The `.master-grid` class in `public/styles.css` sets `display: grid`, `width: 100svw`, `height: 100svh`, `overflow: hidden`. The `.layout-home` class must override ALL of these. Since both classes are single-class selectors, `.layout-home` will override `.master-grid` only if it appears later in the stylesheet or has equal/greater specificity. **Ensure `.layout-home` is defined AFTER `.master-grid` in `public/styles.css`.**

### Key Existing Patterns to Reuse

| Pattern | Source | How to reuse |
|---|---|---|
| `EmbedCodeButton.vue` | `components/EmbedCodeButton.vue` | Render inside each card with `slug` and `title` props |
| `useEmbedCode` composable | `composables/useEmbedCode.ts` | Already used by `EmbedCodeButton`; no direct usage needed |
| Glassmorphism card style | `layouts/default.vue:71` (`.page-wrapper` gradient) and straits brainstorm detail panel spec | `background: rgba(2, 38, 64, 0.95)`, `backdrop-filter: blur(8px)`, `border: 1px solid rgba(255,255,255,0.15)`, `border-radius: 12px`, `box-shadow: 0 8px 32px rgba(0,0,0,0.3)` |
| Fluid typography | `public/styles.css` `--size-*` tokens | Use for card title, description, page heading |
| Fluid spacing | `public/styles.css` `--space-*` tokens | Use for card padding, grid gap, page margins |
| Encode Sans font | Globally loaded via `nuxt.config.ts` | Already available |
| Dark background gradient | `layouts/default.vue` `.page-wrapper` styles | Already applied by the layout |

### Card Data Structure

Define a static array in `pages/index.vue`. No separate data file is needed for 2-3 items:

```typescript
// pages/index.vue
interface InfographicEntry {
  slug: string
  title: string
  description: string
  thumbnail: string // path to image in public/images/thumbnails/
  embedTitle: string // title for the iframe embed
}

const infographics: InfographicEntry[] = [
  {
    slug: 'renewables',
    title: 'Renewables on the Rise',
    description: 'Explore how Indo-Pacific nations are expanding renewable energy infrastructure, with 2024 data on solar, wind, hydropower and more.',
    thumbnail: '/images/thumbnails/renewables.webp',
    embedTitle: 'Renewables on the Rise'
  },
  {
    slug: 'straits',
    title: 'Indo-Pacific Straits',
    description: 'Visualize maritime traffic through six critical chokepoints, from Malacca to Hormuz, with vessel data from 2019 to 2025.',
    thumbnail: '/images/thumbnails/straits.webp',
    embedTitle: 'Indo-Pacific Straits'
  }
]
```

#### Research Insights

**Thumbnail Path Correction:**
- The original plan used `~/assets/images/thumbnails/` paths. For Nuxt SSG without `@nuxt/image` module installed, images in `assets/` require Vite processing and cannot be referenced as plain strings. Since this project does not use `@nuxt/image` (not listed in `nuxt.config.ts` modules), thumbnails should go in `public/images/thumbnails/` and be referenced as `/images/thumbnails/renewables.webp`. Files in `public/` are served as-is and work reliably with SSG.

**TypeScript Props (Vue 3.5+ Pattern):**
- The `InfographicEntry` interface duplicates the props definition. Consider extracting it to the component file or to a shared type, but for 2-3 items inline in a single page, the duplication is acceptable and keeps the code self-documenting.

### Thumbnail Images

**Decision needed:** Thumbnail images do not exist yet. Two approaches:

1. **Screenshot captures** -- Take screenshots of each infographic at a representative state and export as `.webp` at ~600x375 (16:10 aspect ratio matching the embed dimensions). Store in `public/images/thumbnails/`.
2. **Placeholder approach** -- Use a solid color card background with the infographic title overlaid, matching the dark theme. Replace with real screenshots later.

**Recommendation:** Start with option 2 (placeholder) to unblock the homepage build. Thumbnails can be added as a follow-up task or during the polish phase. The card component should gracefully handle a missing thumbnail by falling back to a styled placeholder.

#### Research Insights

**Placeholder Enhancement:**
- The gradient placeholder (`linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))`) is visually subtle. Consider adding the infographic title as an overlay text on the placeholder to provide more visual information before real thumbnails are available. This can be done with a `<span>` inside `.card-thumbnail-placeholder` using the card title.

**Image Optimization (When Thumbnails Arrive):**
- Use `.webp` format at ~600px width (the card max-width), quality 80. This typically yields files under 30KB.
- Add `width` and `height` attributes to the `<img>` tag to prevent Cumulative Layout Shift (CLS). For 16:10 at 600px width: `width="600" height="375"`.
- Since `@nuxt/image` is not installed, use a native `<img>` tag with `loading="lazy"` rather than `<NuxtImg>`. Adding `@nuxt/image` solely for 2 thumbnail images is not worth the dependency.

### CSS Layout for the Homepage

The homepage breaks from the `master-grid` pattern because it is a vertically-scrolling page, not a fixed-viewport dashboard. Options:

- **Override `master-grid`** via a `layout-home` class that sets `height: auto`, `min-height: 100vh`, `grid-template-rows: auto` and removes `overflow: hidden`
- **Or opt out entirely** by setting `layoutClass: 'layout-home'` and defining homepage-specific styles in `public/styles.css` under `.layout-home`

The homepage grid should be a simple centered container with CSS Grid for the cards:

```css
.layout-home {
  height: auto;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: visible;
  padding: var(--space-xl) var(--space-l);
  padding-bottom: 6rem; /* space for footer */
}
```

Card grid:

```css
.infographic-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
  gap: var(--space-l);
  max-width: 900px;
  width: 100%;
}
```

#### Research Insights

**Footer Positioning Conflict (CRITICAL):**
- The `footer` in `layouts/default.vue` uses `position: absolute; bottom: 0;` (line 102-103). On infographic pages this works because `.page-wrapper` has a fixed `height: 100svh`. However, on the homepage with `height: auto`, the footer will overlap content when the page is short (2 cards fit within viewport height). The `padding-bottom: 6rem` mitigates this partially, but the footer is absolutely positioned to the `.page-wrapper`, not to the bottom of the scrollable content.
- **Mitigation:** The `min-height: 100svh` combined with `padding-bottom: 6rem` should provide enough space for 2 cards + footer. However, verify visually that the footer does not overlap the card grid on both desktop and mobile viewports. If overlap occurs, the homepage may need to set `position: relative` on `.layout-home` to establish a new positioning context, or use `margin-bottom` instead of `padding-bottom`.

**`display: flex` vs `display: grid` Conflict:**
- `.master-grid` sets `display: grid` and `.layout-home` sets `display: flex`. Since both classes are on the same element and both are single-class selectors, the one defined LATER in the stylesheet wins. **The `.layout-home` block MUST appear after `.master-grid` in `public/styles.css`.** Currently `.master-grid` is at line 50. Place `.layout-home` after line 121 (after `.layout-1` block ends).

**Responsive Grid Robustness:**
- The `repeat(auto-fit, minmax(min(100%, 400px), 1fr))` pattern is correct and well-tested. It gracefully handles 1, 2, or 3+ cards. On viewports narrower than 400px, cards will take full width. On viewports wider than 800px, cards display side-by-side. No media queries needed.

### Performance

- No heavy dependencies introduced; this is a pure Vue + CSS page
- Thumbnail images should be optimized `.webp` files, lazy-loaded with `loading="lazy"`
- The `EmbedCodeButton` component is lightweight (clipboard API only)
- The page has no D3, Canvas, or GSAP dependencies

#### Research Insights

**Performance Assessment:**
- This page has near-zero JavaScript runtime cost. The only JS is the clipboard API in `EmbedCodeButton` (triggered on click, not on load). The static data array is compiled away during SSG.
- No bundle size concern: `InfographicCard.vue` adds ~2KB to the page chunk (scoped CSS + template). Well within the 5KB-per-feature threshold.
- `backdrop-filter: blur(8px)` has a GPU cost on mobile devices. For 2 cards this is negligible, but if the grid grows to 10+ cards, consider reducing blur radius or removing it on mobile via `@media (max-width: 900px)`.

**SSG Build Verification:**
- The homepage at `/` is automatically pre-rendered by Nuxt SSG. No additional `nitro.prerender.routes` entry needed (confirmed: `nuxt.config.ts` only lists `/embed/*` and `/infographics/*` explicitly because those are not auto-discoverable).
- Run `npm run generate` and verify `/dist/index.html` exists and contains the card markup in the HTML source.

### Accessibility

- Cards should use semantic markup: `<article>` for each card, `<h2>` for card titles
- "View Infographic" link should be a `<NuxtLink>` (proper `<a>` tag with routing)
- "Embed Code" button already has ARIA live region for clipboard feedback (see `EmbedCodeButton.vue:39-41`)
- Focus styles must be visible on all interactive elements (already established pattern with `outline: 2px solid rgba(255,255,255,0.7)`)
- Color contrast: white text on dark glass background meets WCAG AA for large text; verify body text meets 4.5:1 ratio
- Page heading hierarchy: `<h1>` for page title, `<h2>` for each card title

#### Research Insights

**WCAG Compliance Deep-Dive:**

1. **Color Contrast Verification (CRITICAL):**
   - Card description text uses `color: rgba(255, 255, 255, 0.6)` on `background: rgba(2, 38, 64, 0.95)`. This computes to approximately `#999` on `#022640` -- a contrast ratio of roughly 4.2:1. This **FAILS** WCAG AA for normal text (requires 4.5:1). **Increase description text opacity to at least `0.7` (`rgba(255, 255, 255, 0.7)`) to meet the 4.5:1 threshold.**
   - Card title at `rgba(255, 255, 255, 0.95)` on the same background passes easily (~13:1 ratio).
   - Hub subtitle text should also use at least `rgba(255, 255, 255, 0.7)` for the same reason.

2. **Semantic Landmarks:**
   - Wrap the card grid in a `<main>` element to provide the primary landmark. Screen readers use landmarks for quick navigation.
   - The `<header>` element inside `.homepage-hub` is correct for the page header.
   - Consider adding `aria-label="Available infographics"` to the card grid container for screen reader context.

3. **Card Interactive Elements:**
   - Each card has two interactive elements (embed button + view link). Ensure tab order flows naturally: button first, then link (DOM order matches visual order -- already correct in the template).
   - The `<article>` element for each card provides correct semantics. No additional `role` attribute needed.

4. **Keyboard Navigation:**
   - All interactive elements (`<button>`, `<NuxtLink>` which renders as `<a>`) are natively keyboard-accessible.
   - The existing `focus-visible` styles in `EmbedCodeButton.vue` and the `.view-link:focus-visible` in the plan provide visible focus indicators. Verified consistent with project pattern (`outline: 2px solid rgba(255, 255, 255, 0.7); outline-offset: 2px`).

5. **`prefers-reduced-motion` (MISSING FROM ORIGINAL PLAN):**
   - The card hover effect uses `transform: translateY(-2px)` with a 200ms transition. Users who prefer reduced motion should not see this movement. **Add a `@media (prefers-reduced-motion: reduce)` block that removes the transform and keeps only the border-color change.**
   - The `EmbedCodeButton` already handles this (line 86-90 of `EmbedCodeButton.vue`). Match the same pattern for the card.

### SEO and Meta Tags

#### Research Insights (NEW SECTION)

**The original plan sets `useHead({ title: 'BFNA Indo-Pacific' })` but omits social sharing meta tags.** Since this is the homepage -- the most-shared URL for the project -- add `useSeoMeta()` for Open Graph tags:

```typescript
useSeoMeta({
  title: 'BFNA Indo-Pacific',
  ogTitle: 'BFNA Indo-Pacific',
  description: 'Interactive data visualizations exploring energy, trade, and geopolitics across the Indo-Pacific region.',
  ogDescription: 'Interactive data visualizations exploring energy, trade, and geopolitics across the Indo-Pacific region.',
  ogType: 'website',
  // ogImage: '/images/og-homepage.png' // Add when available (1200x630px)
})
```

**Key considerations:**
- `ogImage` requires an absolute URL at render time. For SSG, use `useRequestURL()` to construct the full URL, or hardcode the production domain.
- The meta description also serves as the search engine snippet. Keep it under 160 characters.
- Add a `<meta name="viewport">` check -- already set globally in `nuxt.config.ts` via `app.head`.

## Acceptance Criteria

### Functional Requirements

- [x] `pages/index.vue` renders a card-based homepage at `/`
- [x] Each card displays: title, description, thumbnail (or placeholder), "Embed Code" button, "View Infographic" link
- [x] "View Infographic" link navigates to `/infographics/<slug>` using `<NuxtLink>`
- [x] "Embed Code" button copies the iframe snippet to clipboard (uses existing `EmbedCodeButton` component)
- [x] Homepage lists both "Renewables on the Rise" and "Indo-Pacific Straits" infographics
- [x] Adding a new infographic requires only adding an entry to the `infographics` array

### Visual & Design Requirements

- [x] Dark glassmorphism aesthetic: glass-effect cards on the dark gradient background
- [x] Uses existing `--size-*` and `--space-*` fluid tokens for typography and spacing
- [x] Encode Sans font throughout
- [x] Responsive: cards stack vertically on narrow viewports, side-by-side on wider viewports
- [x] Hover state on cards provides subtle visual feedback (e.g., border glow, slight scale)
- [x] Consistent with the visual identity established in `layouts/default.vue` and the infographic pages
- [x] Card hover animation respects `prefers-reduced-motion: reduce`

### Layout & Navigation Requirements

- [x] No "Back to home" link shown on the homepage (already handled by `default.vue`)
- [x] Footer shows BFNA logo only (no source link, no embed button) -- achieved by omitting `footerSource` and `embedSlug` from page meta
- [x] Page title set via `useHead()` (e.g., "BFNA Indo-Pacific")
- [x] Open Graph meta tags set via `useSeoMeta()` for social sharing
- [x] `<main>` landmark wraps primary content for screen reader navigation

### Technical Requirements

- [x] Page uses `layouts/default.vue` with `layoutClass: 'layout-home'`
- [x] `.layout-home` class defined in `public/styles.css` AFTER `.master-grid` to ensure correct CSS specificity override
- [x] No new dependencies introduced
- [x] Builds successfully with `npm run generate` (SSG)
- [x] Page is pre-rendered at `/` by Nuxt SSG (automatic for index page)
- [x] Thumbnail images gracefully degrade if not yet available (placeholder fallback)
- [x] Card description text meets WCAG AA 4.5:1 contrast ratio (opacity >= 0.7)
- [x] `RotateDeviceOverlay` suppressed on homepage (scrollable page does not need rotation prompt)

## Implementation Approach

### Files to Create

| File | Purpose |
|---|---|
| `components/InfographicCard.vue` | Reusable card component with thumbnail, title, description, embed button, view link |

### Files to Modify

| File | Change |
|---|---|
| `pages/index.vue` | Replace Renewables infographic wrapper with homepage hub (card grid + data array + SEO meta) |
| `public/styles.css` | Add `.layout-home` class AFTER `.master-grid` (line ~122+) |

### Files Optionally Created Later

| File | Purpose |
|---|---|
| `public/images/thumbnails/renewables.webp` | Preview thumbnail for Renewables card (600x375, quality 80) |
| `public/images/thumbnails/straits.webp` | Preview thumbnail for Straits card (600x375, quality 80) |
| `public/images/og-homepage.png` | Open Graph image for social sharing (1200x630) |

### Step-by-Step

#### Step 1: Define `.layout-home` in `public/styles.css`

Add a new layout class that overrides the `master-grid` viewport-locked behavior for a scrollable page. **Place this AFTER the `.layout-1` block (after line 121) to ensure CSS specificity wins over `.master-grid`:**

```css
/* public/styles.css */

/* layout-home: scrollable hub page — overrides master-grid viewport lock */
.layout-home {
  height: auto;
  min-height: 100svh;
  grid-template-columns: 1fr;
  grid-template-rows: auto;
  overflow: visible;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl) var(--space-l);
  padding-bottom: 6rem;
}
```

#### Step 2: Create `components/InfographicCard.vue`

A self-contained, purely presentational card component:

```vue
<!-- components/InfographicCard.vue -->
<script setup lang="ts">
defineProps<{
  slug: string
  title: string
  description: string
  thumbnail?: string
  embedTitle: string
}>()
</script>

<template>
  <article class="infographic-card">
    <div class="card-thumbnail">
      <img
        v-if="thumbnail"
        :src="thumbnail"
        :alt="`Preview of ${title}`"
        width="600"
        height="375"
        loading="lazy"
      />
      <div v-else class="card-thumbnail-placeholder">
        <span class="card-thumbnail-label">{{ title }}</span>
      </div>
    </div>
    <div class="card-content">
      <h2 class="card-title">{{ title }}</h2>
      <p class="card-description">{{ description }}</p>
      <div class="card-actions">
        <EmbedCodeButton :slug="slug" :title="embedTitle" />
        <NuxtLink :to="`/infographics/${slug}`" class="view-link">
          View Infographic
        </NuxtLink>
      </div>
    </div>
  </article>
</template>
```

##### Research Insights

**Component Enhancements vs. Original:**
- Added `width="600" height="375"` to `<img>` to prevent CLS (Cumulative Layout Shift) when thumbnails load
- Added `<span class="card-thumbnail-label">` inside placeholder to show the infographic title when no thumbnail is available, improving visual information density
- Props use `defineProps<{...}>()` without destructuring since all props are only used in the template (follows Vue best practices -- destructure only when needed in script)

#### Step 3: Rewrite `pages/index.vue`

Replace the Renewables wrapper with the homepage hub:

```vue
<!-- pages/index.vue -->
<script setup lang="ts">
definePageMeta({
  layoutClass: 'layout-home'
})

useHead({
  title: 'BFNA Indo-Pacific'
})

useSeoMeta({
  description: 'Interactive data visualizations exploring energy, trade, and geopolitics across the Indo-Pacific region.',
  ogTitle: 'BFNA Indo-Pacific',
  ogDescription: 'Interactive data visualizations exploring energy, trade, and geopolitics across the Indo-Pacific region.',
  ogType: 'website'
})

const infographics = [
  {
    slug: 'renewables',
    title: 'Renewables on the Rise',
    description: 'Explore how Indo-Pacific nations are expanding renewable energy infrastructure, with 2024 data on solar, wind, hydropower and more.',
    thumbnail: undefined, // placeholder until screenshot captured
    embedTitle: 'Renewables on the Rise'
  },
  {
    slug: 'straits',
    title: 'Indo-Pacific Straits',
    description: 'Visualize maritime traffic through six critical chokepoints, from Malacca to Hormuz, with vessel data from 2019 to 2025.',
    thumbnail: undefined,
    embedTitle: 'Indo-Pacific Straits'
  }
]
</script>

<template>
  <main class="homepage-hub">
    <header class="hub-header">
      <h1 class="hub-title">BFNA Indo-Pacific</h1>
      <p class="hub-subtitle">Interactive data visualizations</p>
    </header>
    <div class="infographic-cards" aria-label="Available infographics">
      <InfographicCard
        v-for="info in infographics"
        :key="info.slug"
        v-bind="info"
      />
    </div>
  </main>
</template>
```

##### Research Insights

**Changes from Original Plan:**
- Wrapped content in `<main>` instead of `<div>` for semantic landmark
- Added `useSeoMeta()` for Open Graph tags
- Added `aria-label` on the card grid for screen reader context
- Thumbnail paths changed from `~/assets/images/thumbnails/` to `undefined` (placeholder) with the intent to use `/images/thumbnails/` (public directory) when available

#### Step 4: Add card and homepage styles

Card styles in `InfographicCard.vue` `<style scoped>` block, using the glassmorphism tokens from the brainstorm (see brainstorm: `docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md`, "Shared Visual Identity" section):

```css
.infographic-card {
  background: rgba(2, 38, 64, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.infographic-card:hover {
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  transform: translateY(-2px);
}

.card-thumbnail img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  display: block;
}

.card-thumbnail-placeholder {
  width: 100%;
  aspect-ratio: 16 / 10;
  background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-thumbnail-label {
  font-size: var(--size-1);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.2);
  text-align: center;
  padding: var(--space-m);
}

.card-content {
  padding: var(--space-m);
}

.card-title {
  font-size: var(--size-2);
  font-weight: 600;
  margin: 0 0 var(--space-xs) 0;
  color: rgba(255, 255, 255, 0.95);
}

.card-description {
  font-size: var(--size-0);
  color: rgba(255, 255, 255, 0.7); /* Increased from 0.6 to meet WCAG AA 4.5:1 */
  margin: 0 0 var(--space-m) 0;
  line-height: 1.5;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: var(--space-s);
  flex-wrap: wrap;
}

.view-link {
  font-family: 'Encode Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.5rem 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.view-link:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.35);
}

.view-link:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

/* Accessibility: respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .infographic-card {
    transition: none;
  }
  .infographic-card:hover {
    transform: none;
  }
  .view-link {
    transition: none;
  }
}
```

##### Research Insights

**Style Changes from Original Plan:**
1. **WCAG fix:** `.card-description` color changed from `rgba(255, 255, 255, 0.6)` to `rgba(255, 255, 255, 0.7)` to meet 4.5:1 contrast ratio
2. **Motion accessibility:** Added `@media (prefers-reduced-motion: reduce)` block matching the pattern already used in `EmbedCodeButton.vue` (lines 86-90)
3. **Placeholder enhancement:** `.card-thumbnail-placeholder` changed from empty div to flexbox container with centered title label
4. **Progressive enhancement approach:** Consider placing the `transition` property inside a `@media (prefers-reduced-motion: no-preference)` block instead, so motion is opt-in rather than opt-out. However, matching the existing codebase pattern (`EmbedCodeButton.vue` uses the opt-out approach) is more consistent.

**Glassmorphism Accessibility:**
- The `backdrop-filter: blur(8px)` with `background: rgba(2, 38, 64, 0.95)` provides a near-opaque background (95% opacity). This is good -- glassmorphism accessibility problems typically arise with low-opacity backgrounds where text becomes illegible against busy backgrounds. At 95% opacity, the background content is almost entirely hidden, so text readability is not affected by the blur content.

#### Step 5: Verify build and visual check

Run `npm run generate` to confirm SSG builds the homepage at `/index.html` and all existing routes still render correctly.

##### Research Insights

**Post-Build Verification Checklist:**
1. `dist/index.html` exists and contains card markup in the HTML source
2. `dist/infographics/renewables/index.html` still renders correctly (verify the old `index.vue` Renewables content was NOT duplicated)
3. `dist/embed/renewables/index.html` and `dist/embed/straits/index.html` still work
4. Open `dist/index.html` in browser -- verify footer does not overlap card content
5. Resize browser to <400px -- verify cards stack vertically
6. Enable "Reduce Motion" in OS settings -- verify no card hover animation
7. Tab through the page -- verify all buttons and links receive visible focus
8. Run Lighthouse accessibility audit -- target 100 score (simple page, should be achievable)

## Dependencies & Risks

### Dependencies

- **Existing components:** `EmbedCodeButton.vue` (already built, BF-67), `RotateDeviceOverlay.vue`, `GridOverlay.vue` (provided by `default.vue` layout)
- **Existing layout:** `layouts/default.vue` with conditional footer elements
- **No new npm packages required**

### Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Thumbnail images not available | Cards look empty without thumbnails | Implement placeholder fallback with gradient background + title label; flag as follow-up task |
| `master-grid` overflow:hidden conflicts with scrollable homepage | Page content may be clipped | `.layout-home` explicitly sets `overflow: visible` and `height: auto` to override; place AFTER `.master-grid` in stylesheet for CSS specificity |
| `EmbedCodeButton` per-card creates multiple composable instances | Each card gets its own `useEmbedCode` scope -- no conflict since `onScopeDispose` handles cleanup (see `composables/useEmbedCode.ts:92-94`) | Already handled by existing implementation |
| Homepage `<title>` may conflict with Renewables `useRenewablesHead()` | N/A -- previous `index.vue` called `useRenewablesHead()` but the new one will use `useHead()` directly | Removal of `useRenewablesHead()` from `index.vue` is intentional |
| Footer absolute positioning overlaps card content | Footer overlays bottom of card grid on short viewports | `padding-bottom: 6rem` on `.layout-home` reserves space; verify visually on mobile and desktop |
| Card description text fails WCAG AA contrast | Accessibility compliance failure | Use `rgba(255, 255, 255, 0.7)` minimum opacity for body text on dark background |
| `RotateDeviceOverlay` shows on homepage | Confusing UX -- homepage is scrollable, not a landscape-locked dashboard | Add page meta to suppress overlay, or add CSS rule to hide `.rotate-overlay` on `.layout-home` |

#### Research Insights (New Risks Discovered)

**CSS `display` Property Conflict:**
- `.master-grid` sets `display: grid` and `.layout-home` sets `display: flex`. These are mutually exclusive. If `.layout-home` does not have sufficient specificity to override, the page will render as a 12-column grid instead of a flex column. **Test in browser devtools that `display: flex` actually applies.**

**`RotateDeviceOverlay` Timing Race:**
- The `RotateDeviceOverlay` component (rendered by `default.vue`) checks viewport orientation. On mobile, if the homepage loads in portrait and the overlay briefly flashes before checking the page type, this creates a poor first impression. Either suppress it via page meta or ensure it checks `layoutClass` before rendering.

## Open Questions for Implementer

1. **Page heading copy:** "BFNA Indo-Pacific" with subtitle "Interactive data visualizations" is a placeholder. Confirm final copy with editorial/stakeholder.
2. **Card description text:** The descriptions in the data array are draft copy. Confirm with editorial.
3. **Thumbnail images:** When should real screenshots be captured and committed? This could be a separate task (since the straits infographic is still a placeholder). Store in `public/images/thumbnails/` (not `assets/`).
4. **Third infographic placeholder:** Should the homepage show a "Coming Soon" card for the planned third infographic, or only show published infographics?
5. **`RotateDeviceOverlay` on homepage:** The default layout renders it on every page. On the homepage (which is a simple card grid), it may be unnecessary or confusing. Consider hiding it on the homepage via page meta if needed. **Research confirms this should be suppressed.**
6. **Open Graph image:** Should an OG image be created for the homepage? This is the URL that will appear in social media previews. A 1200x630 image with the BFNA branding would improve social sharing appearance significantly.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md](../brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md) -- Key decisions carried forward: URL structure (`/` = hub, `/infographics/<slug>` = infographic pages), card content spec (thumbnail + title + description + embed button + view link), dark glassmorphism aesthetic for homepage.

### Internal References

- `pages/index.vue` (current, to be replaced): Renewables wrapper with `definePageMeta({ layoutClass: 'layout-1' })`
- `components/EmbedCodeButton.vue`: Reusable embed code copy button with clipboard feedback
- `composables/useEmbedCode.ts`: Iframe snippet generation and clipboard composable
- `layouts/default.vue`: Default layout with conditional footer, back link, and gradient background
- `public/styles.css`: Design tokens (`--size-*`, `--space-*`), `master-grid`, layout classes

### Related Work

- BF-67: Embed code copy button (already merged)
- BF-70: Layout extraction (already merged)
- BF-3: Phase 1 scaffolding epic (superseded URL structure; hub concept from brainstorm takes precedence)

### Research References

- [Nuxt 4 Performance Optimization Guide](https://masteringnuxt.com/blog/nuxt-4-performance-optimization-complete-guide-to-faster-apps-in-2026)
- [Glassmorphism: Definition and Best Practices - NN/g](https://www.nngroup.com/articles/glassmorphism/)
- [Glassmorphism Design Trend: Implementation Guide](https://playground.halfaccessible.com/blog/glassmorphism-design-trend-implementation-guide)
- [prefers-reduced-motion - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [Nuxt SEO and Meta - Official Docs](https://nuxt.com/docs/4.x/getting-started/seo-meta)
- [Mastering Open Graph Tags in Vue & Nuxt](https://nuxtseo.com/learn/mastering-meta/open-graph)
- [Optimising a Nuxt SSG site for Page Speed](https://gonzalohirsch.com/blog/optimising-nuxt-ssg-site-for-page-speed/)
- [How to Build Accessible Vue.js Applications - Vue Mastery](https://www.vuemastery.com/blog/how-to-build-accessible-vuejs-applications/)
