---
title: "feat: Build homepage hub with infographic cards"
type: feat
status: active
date: 2026-03-03
linear: BF-74
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
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

## Technical Considerations

### Architecture

**No new layout required.** The homepage can use `layouts/default.vue` with a different `layoutClass` (e.g., `'layout-home'`) or no class at all. The `master-grid` CSS is designed for full-viewport infographic dashboards; the homepage needs a simpler vertically-scrolling layout. The default layout already provides the background gradient, `RotateDeviceOverlay`, `GridOverlay`, and footer.

**However, the homepage does NOT need the footer pattern used by infographic pages** (source attribution + embed button + BFNA logo). The homepage footer should show only the BFNA logo. This is already handled -- `layouts/default.vue` conditionally renders `footerSource` and `embedSlug` from page meta, so omitting them from `definePageMeta()` in `index.vue` will produce a clean footer with just the logo.

**Back link suppression** is already handled: `default.vue` hides the back link when `route.path === '/'` (see `layouts/default.vue:20`).

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
  thumbnail: string // path to image in assets/images/thumbnails/
  embedTitle: string // title for the iframe embed
}

const infographics: InfographicEntry[] = [
  {
    slug: 'renewables',
    title: 'Renewables on the Rise',
    description: 'Explore how Indo-Pacific nations are expanding renewable energy infrastructure, with 2024 data on solar, wind, hydropower and more.',
    thumbnail: '/assets/images/thumbnails/renewables.webp',
    embedTitle: 'Renewables on the Rise'
  },
  {
    slug: 'straits',
    title: 'Indo-Pacific Straits',
    description: 'Visualize maritime traffic through six critical chokepoints, from Malacca to Hormuz, with vessel data from 2019 to 2025.',
    thumbnail: '/assets/images/thumbnails/straits.webp',
    embedTitle: 'Indo-Pacific Straits'
  }
]
```

### Thumbnail Images

**Decision needed:** Thumbnail images do not exist yet. Two approaches:

1. **Screenshot captures** -- Take screenshots of each infographic at a representative state and export as `.webp` at ~600x375 (16:10 aspect ratio matching the embed dimensions). Store in `assets/images/thumbnails/`.
2. **Placeholder approach** -- Use a solid color card background with the infographic title overlaid, matching the dark theme. Replace with real screenshots later.

**Recommendation:** Start with option 2 (placeholder) to unblock the homepage build. Thumbnails can be added as a follow-up task or during the polish phase. The card component should gracefully handle a missing thumbnail by falling back to a styled placeholder.

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

### Performance

- No heavy dependencies introduced; this is a pure Vue + CSS page
- Thumbnail images should be optimized `.webp` files, lazy-loaded with `loading="lazy"`
- The `EmbedCodeButton` component is lightweight (clipboard API only)
- The page has no D3, Canvas, or GSAP dependencies

### Accessibility

- Cards should use semantic markup: `<article>` for each card, `<h2>` for card titles
- "View Infographic" link should be a `<NuxtLink>` (proper `<a>` tag with routing)
- "Embed Code" button already has ARIA live region for clipboard feedback (see `EmbedCodeButton.vue:39-41`)
- Focus styles must be visible on all interactive elements (already established pattern with `outline: 2px solid rgba(255,255,255,0.7)`)
- Color contrast: white text on dark glass background meets WCAG AA for large text; verify body text meets 4.5:1 ratio
- Page heading hierarchy: `<h1>` for page title, `<h2>` for each card title

## Acceptance Criteria

### Functional Requirements

- [ ] `pages/index.vue` renders a card-based homepage at `/`
- [ ] Each card displays: title, description, thumbnail (or placeholder), "Embed Code" button, "View Infographic" link
- [ ] "View Infographic" link navigates to `/infographics/<slug>` using `<NuxtLink>`
- [ ] "Embed Code" button copies the iframe snippet to clipboard (uses existing `EmbedCodeButton` component)
- [ ] Homepage lists both "Renewables on the Rise" and "Indo-Pacific Straits" infographics
- [ ] Adding a new infographic requires only adding an entry to the `infographics` array

### Visual & Design Requirements

- [ ] Dark glassmorphism aesthetic: glass-effect cards on the dark gradient background
- [ ] Uses existing `--size-*` and `--space-*` fluid tokens for typography and spacing
- [ ] Encode Sans font throughout
- [ ] Responsive: cards stack vertically on narrow viewports, side-by-side on wider viewports
- [ ] Hover state on cards provides subtle visual feedback (e.g., border glow, slight scale)
- [ ] Consistent with the visual identity established in `layouts/default.vue` and the infographic pages

### Layout & Navigation Requirements

- [ ] No "Back to home" link shown on the homepage (already handled by `default.vue`)
- [ ] Footer shows BFNA logo only (no source link, no embed button) -- achieved by omitting `footerSource` and `embedSlug` from page meta
- [ ] Page title set via `useHead()` (e.g., "BFNA Indo-Pacific")

### Technical Requirements

- [ ] Page uses `layouts/default.vue` with `layoutClass: 'layout-home'`
- [ ] `.layout-home` class defined in `public/styles.css` to override `master-grid` defaults for a scrollable page
- [ ] No new dependencies introduced
- [ ] Builds successfully with `npm run generate` (SSG)
- [ ] Page is pre-rendered at `/` by Nuxt SSG (automatic for index page)
- [ ] Thumbnail images gracefully degrade if not yet available (placeholder fallback)

## Implementation Approach

### Files to Create

| File | Purpose |
|---|---|
| `components/InfographicCard.vue` | Reusable card component with thumbnail, title, description, embed button, view link |

### Files to Modify

| File | Change |
|---|---|
| `pages/index.vue` | Replace Renewables infographic wrapper with homepage hub (card grid + data array) |
| `public/styles.css` | Add `.layout-home` class and `.infographic-card` styles |

### Files Optionally Created Later

| File | Purpose |
|---|---|
| `assets/images/thumbnails/renewables.webp` | Preview thumbnail for Renewables card |
| `assets/images/thumbnails/straits.webp` | Preview thumbnail for Straits card |

### Step-by-Step

#### Step 1: Define `.layout-home` in `public/styles.css`

Add a new layout class that overrides the `master-grid` viewport-locked behavior for a scrollable page:

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

A self-contained card component:

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
        loading="lazy"
      />
      <div v-else class="card-thumbnail-placeholder" />
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
  <div class="homepage-hub">
    <header class="hub-header">
      <h1 class="hub-title">BFNA Indo-Pacific</h1>
      <p class="hub-subtitle">Interactive data visualizations</p>
    </header>
    <div class="infographic-cards">
      <InfographicCard
        v-for="info in infographics"
        :key="info.slug"
        v-bind="info"
      />
    </div>
  </div>
</template>
```

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
  color: rgba(255, 255, 255, 0.6);
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
```

#### Step 5: Verify build

Run `npm run generate` to confirm SSG builds the homepage at `/index.html` and all existing routes still render correctly.

## Dependencies & Risks

### Dependencies

- **Existing components:** `EmbedCodeButton.vue` (already built, BF-67), `RotateDeviceOverlay.vue`, `GridOverlay.vue` (provided by `default.vue` layout)
- **Existing layout:** `layouts/default.vue` with conditional footer elements
- **No new npm packages required**

### Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Thumbnail images not available | Cards look empty without thumbnails | Implement placeholder fallback with gradient background; flag as follow-up task |
| `master-grid` overflow:hidden conflicts with scrollable homepage | Page content may be clipped | `.layout-home` explicitly sets `overflow: visible` and `height: auto` to override |
| `EmbedCodeButton` per-card creates multiple composable instances | Each card gets its own `useEmbedCode` scope -- no conflict since `onScopeDispose` handles cleanup (see `composables/useEmbedCode.ts:92-94`) | Already handled by existing implementation |
| Homepage `<title>` may conflict with Renewables `useRenewablesHead()` | N/A -- previous `index.vue` called `useRenewablesHead()` but the new one will use `useHead()` directly | Removal of `useRenewablesHead()` from `index.vue` is intentional |

## Open Questions for Implementer

1. **Page heading copy:** "BFNA Indo-Pacific" with subtitle "Interactive data visualizations" is a placeholder. Confirm final copy with editorial/stakeholder.
2. **Card description text:** The descriptions in the data array are draft copy. Confirm with editorial.
3. **Thumbnail images:** When should real screenshots be captured and committed? This could be a separate task (since the straits infographic is still a placeholder).
4. **Third infographic placeholder:** Should the homepage show a "Coming Soon" card for the planned third infographic, or only show published infographics?
5. **`RotateDeviceOverlay` on homepage:** The default layout renders it on every page. On the homepage (which is a simple card grid), it may be unnecessary or confusing. Consider hiding it on the homepage via page meta if needed.

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
