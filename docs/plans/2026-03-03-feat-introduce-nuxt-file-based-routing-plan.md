---
title: "feat: Introduce Nuxt file-based routing"
type: feat
status: active
date: 2026-03-03
linear: BF-68
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
---

# feat: Introduce Nuxt file-based routing

## Overview

Replace the monolithic `app.vue` with the Nuxt app shell (`<NuxtLayout><NuxtPage /></NuxtLayout>`) and create the `pages/` directory so Nuxt auto-enables file-based routing. This is the foundational migration step upon which all subsequent multi-infographic and embed features depend (see brainstorm: `docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md`).

The current application renders a single "Renewables on the Rise" infographic directly inside `app.vue`. After this task, the same infographic renders at an identical URL (`/`) via `pages/index.vue`, but the architecture is now ready for additional pages, layouts, and the `/infographics/<slug>` + `/embed/<slug>` URL structure decided in the brainstorm.

## Problem Statement / Motivation

The app has no routing. Everything lives in `app.vue`:
- Template markup (title, description, chart component, background image, footer)
- Scoped styles (page wrapper, footer, background animation, source link)
- `useHead()` call for fonts and title

This monolithic structure blocks:
1. Adding the straits infographic as a second page
2. Introducing layouts (`default`, `embed`)
3. Building the homepage hub
4. All downstream tasks in the multi-infographic epic

Nuxt only activates `vue-router` and file-based routing when it detects a `pages/` directory. Until that directory exists, `<NuxtPage>` is a no-op and `app.vue` is the entire application. This task flips that switch.

## Proposed Solution

A minimal, zero-regression migration in three parts:

### Part 1: Create `pages/index.vue`

Move the current `app.vue` template and scoped styles into `pages/index.vue`. This page becomes the route handler for `/`.

**File: `pages/index.vue`**

The page component receives:
- The full `<template>` from current `app.vue` (the `.page-wrapper` div with all children)
- The full `<style scoped>` block from current `app.vue`
- The `<script setup>` with `useHead()` from current `app.vue`

No logic changes. A direct cut-and-paste of the three SFC sections.

### Part 2: Replace `app.vue` with Nuxt app shell

Replace the entire contents of `app.vue` with the minimal Nuxt app shell:

```vue
<!-- app.vue -->
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

This is the standard Nuxt 3/4 entry point. `<NuxtLayout>` wraps the current page in the active layout (defaults to `default` if a `layouts/default.vue` exists, otherwise renders children directly). `<NuxtPage>` renders the matched route component from `pages/`.

**No `layouts/default.vue` is created in this task.** Without a `layouts/` directory, `<NuxtLayout>` passes through transparently. This keeps the diff minimal and defers layout extraction to a follow-up task (see brainstorm: Migration Path steps 3-4).

### Part 3: Verify routing activation

After the `pages/` directory is created, Nuxt will:
1. Auto-generate `vue-router` configuration
2. Map `pages/index.vue` to the `/` route
3. Render it via `<NuxtPage>` inside `app.vue`

The rendered output should be pixel-identical to the current application.

## Technical Considerations

### Nuxt auto-detection behavior

Nuxt 4 (currently installed: `nuxt ^4.0.0`) auto-enables file-based routing when it detects files in `pages/`. No `nuxt.config.ts` changes are required. The `vue-router` dependency already exists in `package.json`.

### `useHead()` placement

The current `app.vue` calls `useHead()` to set the page title and Google Fonts preconnect/stylesheet links. The `nuxt.config.ts` **also** declares font preconnects and stylesheets via `app.head.link`. After migration:

- **Global head config** (in `nuxt.config.ts`): Encode Sans font, `public/styles.css` -- stays as-is
- **Page-level head** (in `pages/index.vue`): Inter font, page title "Renewables on the Rise" -- moves with the page

This is the correct Nuxt pattern: global assets in config, page-specific assets in composables. No duplication issue.

### Component auto-imports

Components (`RenewableEnergyChart`, `RotateDeviceOverlay`, `GridOverlay`) are auto-imported by Nuxt from the `components/` directory. No import changes needed in the new page file.

### CSS architecture (no changes)

- `assets/styles.css` -- minimal reset (`body { margin: 0 }`) -- loaded via `nuxt.config.ts` `css` array
- `public/styles.css` -- fluid type/space tokens, `.master-grid`, `.layout-1`, typography -- loaded via `nuxt.config.ts` `app.head.link`
- Scoped styles in `app.vue` -- move to `pages/index.vue` scoped styles

All three layers continue to work identically after migration.

### Static generation (SSG)

The project uses `nuxt generate` (SSG via `nitro.preset: 'static'`). File-based routing is fully compatible with SSG. Each page in `pages/` will generate a corresponding HTML file in `.output/public/`.

### `netlify.toml` SPA fallback

The current `netlify.toml` has a catch-all redirect `/* -> /index.html` with status 200. This remains correct for SSG with client-side routing fallback. No changes needed for this task.

### gtag plugin compatibility

The `plugins/gtag.client.ts` plugin already uses `useRouter()` and listens to route changes via `router.afterEach()`. Once file-based routing is active, this plugin will correctly fire page view events on navigation. No changes needed.

## Acceptance Criteria

- [ ] `pages/` directory exists with `pages/index.vue`
- [ ] `pages/index.vue` contains the full template, scoped styles, and script from the original `app.vue`
- [ ] `app.vue` contains only the Nuxt app shell (`<NuxtLayout><NuxtPage /></NuxtLayout>`)
- [ ] `nuxt.config.ts` is unchanged
- [ ] `npm run dev` starts without errors and renders the infographic at `/` identically to before
- [ ] `npm run generate` completes without errors and produces `.output/public/index.html`
- [ ] No `layouts/` directory is created (deferred to follow-up task)
- [ ] All existing components (`RenewableEnergyChart`, `RotateDeviceOverlay`, `GridOverlay`) render correctly
- [ ] The `useHead()` page title and Inter font load correctly
- [ ] The gtag plugin continues to fire `page_view` events

## Success Metrics

- Zero visual regression: the deployed page at `/` is pixel-identical before and after
- Nuxt dev server shows `pages/index.vue` in the route table (visible in devtools)
- Downstream tasks (BF-3 scaffolding, layout extraction, homepage hub) are unblocked

## Dependencies & Risks

### Dependencies
- None. This task has zero external dependencies. It operates entirely on existing files.

### Risks
- **Low risk: Scoped style specificity** -- Moving scoped styles from `app.vue` to `pages/index.vue` changes the Vue-generated `data-v-*` attribute hash. Since all selectors are class-based and scoped, this is a non-issue. However, visual verification is still required.
- **Low risk: Component name casing** -- `app.vue` uses `<GridOverlay />` but the file is `gridOverlay.vue`. Nuxt's auto-import is case-insensitive for PascalCase usage, so this works. Worth noting for future cleanup but not a risk for this task.

## MVP

### pages/index.vue

```vue
<template>
  <div class="page-wrapper | master-grid layout-1">
    <RotateDeviceOverlay />
    <GridOverlay />
    <div class="description">
      <h1 class="title">Renewables on the Rise</h1>
      <p>Amid rising concerns about climate change and energy security, a growing number of states have invested in expanding renewable energy infrastructure. This has been especially visible in the Indo-Pacific, where several countries have become global leaders in solar, wind, hydroelectric and geothermal power generation. However, not every state in the region has embraced renewables so enthusiastically. This infographic displays the 2024 renewable energy usage percentages of the region's largest economies, alongside those of the United States and European Union.</p>
      <p class="source-description"><em>Percentage of electricity produced from renewable sources, which include solar, wind, hydropower, bioenergy, geothermal, wave, and tidal.</em></p>
    </div>
    <RenewableEnergyChart class="chart"/>
    <div class="bg-image">
      <img src="@/assets/images/background.png" alt="Planet Background" />
    </div>
    <footer>
      <a href="https://ourworldindata.org/grapher/share-of-electricity-production-from-renewable-sources?time=earliest..2024&country=CHN~JPN~IND~KOR~AUS~IDN~TWN~THA~USA~EU+%28Ember%29" target="_blank" rel="noopener noreferrer" class="source-link">Source: Our World in Data</a>
      <img src="@/assets/images/bfna.svg" alt="BFNA Logo" class="bfna-logo-footer" />
    </footer>
  </div>
</template>

<style scoped>
/* All scoped styles from current app.vue -- cut-and-pasted verbatim */
</style>

<script setup>
import { useHead } from '#app'

useHead({
  title: 'Renewables on the Rise',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap' }
  ]
})
</script>
```

### app.vue (after)

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

## Open Questions for Implementer

1. **GridOverlay casing**: The component file is `gridOverlay.vue` (camelCase) but used as `<GridOverlay />` (PascalCase). Nuxt handles this, but should the file be renamed to `GridOverlay.vue` for consistency? This is optional cleanup, not required for this task.

2. **Inter font in `useHead()`**: The renewables page loads Inter via `useHead()`, but the global config loads Encode Sans. Should Inter be promoted to the global config if future infographics also use it, or kept page-local? This is a decision for the layout extraction task, not this one.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md](docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md) -- Key decisions carried forward: Nuxt file-based routing activation via `pages/` directory, app shell pattern (`<NuxtLayout><NuxtPage />`), migration path step 1-2
- **Related epic:** [docs/epics/BF-3-phase-1-scaffolding.md](docs/epics/BF-3-phase-1-scaffolding.md) -- This task fulfills the first sub-task ("Create `pages/` directory + `pages/index.vue`")
- **Existing codebase files:**
  - `app.vue` -- current monolithic entry point (source of truth for migration)
  - `nuxt.config.ts` -- global config, unchanged by this task
  - `components/RenewableEnergyChart.vue` -- main chart component, auto-imported
  - `components/RotateDeviceOverlay.vue` -- rotate overlay, auto-imported
  - `components/gridOverlay.vue` -- grid overlay, auto-imported
  - `plugins/gtag.client.ts` -- analytics plugin, already uses `useRouter()`
  - `public/styles.css` -- fluid tokens and grid system
  - `assets/styles.css` -- body reset
  - `netlify.toml` -- deployment config, unchanged
