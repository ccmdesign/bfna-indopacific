---
title: "feat: Create infographic and embed page routes"
type: feat
status: active
date: 2026-03-03
linear: BF-72
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
depends_on:
  - docs/plans/2026-03-03-feat-create-embed-layout-plan.md
  - docs/plans/2026-03-03-refactor-extract-renewables-infographic-component-plan.md
  - docs/plans/2026-03-03-feat-extract-shared-layout-into-default-vue-plan.md
---

# feat: Create infographic and embed page routes

## Overview

Create four thin page wrappers that render shared infographic components with the appropriate Nuxt layout. This establishes the `/infographics/<slug>` and `/embed/<slug>` URL structure defined in the brainstorm (see brainstorm: `docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md`, Key Decisions > URL Structure).

Two of the four pages already exist:
- `pages/index.vue` currently renders `RenewablesInfographic` at `/` (the homepage) -- this is **not** one of the four pages in scope, but informs the pattern.
- `pages/embed/renewables.vue` already exists and is **complete** -- it renders `RenewablesInfographic` with the embed layout. No work needed.

The remaining three pages to create:
1. `pages/infographics/renewables.vue` -- renders `RenewablesInfographic`, default layout
2. `pages/infographics/straits.vue` -- renders `StraitsInfographic`, default layout
3. `pages/embed/straits.vue` -- renders `StraitsInfographic`, embed layout

## Problem Statement / Motivation

The brainstorm defines a dual-route architecture where every infographic is accessible at two URLs:
- `/infographics/<slug>` -- full site chrome (nav back-link, footer with source attribution and BFNA logo)
- `/embed/<slug>` -- stripped-down for iframe embedding (no back-link, no footer)

Both routes render the **same** infographic component, ensuring a single source of truth per infographic (see brainstorm: Architecture section -- "Both route patterns render the same infographic component, ensuring a single source of truth per infographic").

The infrastructure is already in place:
- `layouts/default.vue` provides the full site chrome (BF-69, completed)
- `layouts/embed.vue` provides the minimal embed wrapper (BF-70, completed)
- `components/infographics/RenewablesInfographic.vue` is extracted and reusable (BF-71, completed)
- `nuxt.config.ts` has `pathPrefix: false` for `components/infographics/`, enabling clean `<RenewablesInfographic />` usage
- `netlify.toml` has path-specific headers for `/embed/*` routes

What is missing are the page files themselves -- the thin wrappers that wire components to layouts.

## Proposed Solution

### File 1: `pages/infographics/renewables.vue`

A thin page wrapper following the exact pattern established by `pages/index.vue` (which already renders `RenewablesInfographic` at `/`). The key differences:
- Lives at `/infographics/renewables` instead of `/`
- Shows the back-link (default behavior of `layouts/default.vue` for non-root routes)
- Uses the same `useRenewablesHead()` composable for head tags
- Passes the same `footerSource` and `layoutClass` via `definePageMeta`

```vue
<!-- pages/infographics/renewables.vue -->
<script setup>
definePageMeta({
  layoutClass: 'layout-1',
  footerSource: {
    url: 'https://ourworldindata.org/grapher/share-of-electricity-production-from-renewable-sources?time=earliest..2024&country=CHN~JPN~IND~KOR~AUS~IDN~TWN~THA~USA~EU+%28Ember%29',
    label: 'Source: Our World in Data'
  }
})

useRenewablesHead()
</script>

<template>
  <RenewablesInfographic />
</template>
```

### File 2: `pages/infographics/straits.vue`

Same pattern, but for the straits infographic. Uses `StraitsInfographic` component and `layoutClass: 'layout-2'` (the straits-specific grid layout from the straits brainstorm, see brainstorm: `docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md`, Key Decisions > layout grid).

```vue
<!-- pages/infographics/straits.vue -->
<script setup>
definePageMeta({
  layoutClass: 'layout-2',
  footerSource: {
    url: '#',
    label: 'Source: IMF PortWatch'
  }
})

useStraitsHead()
</script>

<template>
  <StraitsInfographic />
</template>
```

**Note:** `StraitsInfographic` component and `useStraitsHead` composable do not exist yet. They are out of scope for this task -- the page file is a forward-looking wrapper that will render correctly once those dependencies are built. The implementer should either:
- (a) Create a placeholder `StraitsInfographic` component so the page renders without error, or
- (b) Defer this page file until the `StraitsInfographic` component is ready.

See Open Questions below.

### File 3: `pages/embed/straits.vue`

Follows the exact pattern of `pages/embed/renewables.vue` (already complete).

```vue
<!-- pages/embed/straits.vue -->
<script setup>
definePageMeta({
  layout: 'embed',
  layoutClass: 'layout-2'
})

useStraitsHead({
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
</script>

<template>
  <StraitsInfographic />
</template>
```

Same dependency caveat as File 2 above.

### File 4: `pages/embed/renewables.vue` -- Already exists

This file was created as part of BF-71. No changes needed. Included here for completeness:

```vue
<!-- pages/embed/renewables.vue (existing, no changes) -->
<script setup>
definePageMeta({
  layout: 'embed',
  layoutClass: 'layout-1'
})

useRenewablesHead({
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
</script>

<template>
  <RenewablesInfographic />
</template>
```

### Configuration Update: `nuxt.config.ts`

Add the new embed and infographic routes to `nitro.prerender.routes` so `nuxt generate` discovers them (no `<NuxtLink>` points to embed routes -- they are only accessed via iframe):

```ts
// nuxt.config.ts (partial)
nitro: {
  preset: 'static',
  prerender: {
    routes: [
      '/embed/renewables',
      '/embed/straits',
      '/infographics/renewables',
      '/infographics/straits'
    ]
  }
}
```

The `/infographics/*` routes may eventually be linked from the homepage cards, but until the homepage is built, explicit prerender routes ensure they are generated.

## Technical Considerations

### Pattern Consistency

Every page file in this project follows the same minimal structure:
1. `definePageMeta()` -- layout selection, layout class, footer source
2. `use<Name>Head()` composable -- page title, font links, optional meta overrides
3. `<template>` with a single infographic component

This pattern is established by `pages/index.vue` and `pages/embed/renewables.vue`. The new pages must follow it exactly.

### Nuxt Auto-Import

- Infographic components in `components/infographics/` use `pathPrefix: false` (configured in `nuxt.config.ts`), so they are auto-imported as `<RenewablesInfographic />` and `<StraitsInfographic />` without a directory prefix.
- Composables in `composables/` are auto-imported by Nuxt convention. `useRenewablesHead` is already available; `useStraitsHead` will be auto-imported once created.

### Static Generation (SSG)

All four routes must appear in `nitro.prerender.routes` because:
- Embed routes have no `<NuxtLink>` pointing to them (accessed via iframe only)
- Infographic routes may not have `<NuxtLink>` until the homepage hub is built
- Without explicit prerender entries, `nuxt generate` will not crawl and generate these pages

### Netlify Headers

The `/embed/*` header rule in `netlify.toml` already uses a wildcard pattern. Adding `pages/embed/straits.vue` requires no Netlify configuration changes -- the existing `for = "/embed/*"` rule covers it automatically.

## Acceptance Criteria

- [ ] `pages/infographics/renewables.vue` exists and renders `RenewablesInfographic` with the default layout, back-link visible, footer with "Source: Our World in Data"
- [ ] `pages/infographics/straits.vue` exists and renders `StraitsInfographic` with the default layout (may use placeholder component)
- [ ] `pages/embed/straits.vue` exists and renders `StraitsInfographic` with the embed layout, `noindex` meta tag set (may use placeholder component)
- [ ] `pages/embed/renewables.vue` remains unchanged and functional
- [ ] `nuxt.config.ts` prerender routes include all four paths (`/embed/renewables`, `/embed/straits`, `/infographics/renewables`, `/infographics/straits`)
- [ ] `nuxt generate` completes without errors and produces HTML files for all four routes
- [ ] Visiting `/infographics/renewables` in the browser shows the renewables infographic with site chrome (back-link, footer)
- [ ] Visiting `/embed/renewables` shows the renewables infographic without site chrome
- [ ] No duplicate code -- each infographic component is defined once and rendered by two page files

## Open Questions for Implementer

1. **Straits component placeholder:** The `StraitsInfographic` component does not exist yet. Should the implementer:
   - **(a)** Create a minimal placeholder component (`components/infographics/StraitsInfographic.vue`) with a title and "Coming soon" message so the straits pages render without error?
   - **(b)** Skip the straits page files entirely and create them later when the `StraitsInfographic` component is ready?
   - Recommendation: **(a)** -- create a placeholder. This validates the routing, layout, and prerender configuration end-to-end now, and the placeholder is trivially replaced later.

2. **`useStraitsHead` composable:** Similarly, should a placeholder `composables/useStraitsHead.ts` be created following the `useRenewablesHead` pattern? Recommendation: yes, with a working title like "Indo-Pacific Straits" and the same Inter font link.

3. **Footer source for straits:** The brainstorm references IMF PortWatch as the data source. The exact URL for the footer source attribution link needs to be confirmed. A placeholder `url: '#'` is acceptable for now.

4. **Homepage (`pages/index.vue`) migration:** The current `pages/index.vue` renders the renewables infographic at `/`. Once `/infographics/renewables` is live, the homepage should eventually become the card-based hub. This is a separate task (not in scope for BF-72) but the implementer should be aware that the homepage will change.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md](docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md) -- Key decisions carried forward: dual-route URL structure (`/infographics/<slug>` + `/embed/<slug>`), shared component architecture, embed layout strips site chrome.

### Internal References

- Existing renewables embed page: `pages/embed/renewables.vue` (pattern to follow)
- Existing homepage: `pages/index.vue` (pattern to follow)
- Renewables head composable: `composables/useRenewablesHead.ts` (pattern for `useStraitsHead`)
- Renewables infographic component: `components/infographics/RenewablesInfographic.vue`
- Default layout: `layouts/default.vue` (BF-69)
- Embed layout: `layouts/embed.vue` (BF-70)
- Nuxt config: `nuxt.config.ts` (prerender routes, component auto-import config)
- Netlify headers: `netlify.toml` (embed path-specific headers)

### Related Plans

- `docs/plans/2026-03-03-feat-extract-shared-layout-into-default-vue-plan.md` (BF-69, completed)
- `docs/plans/2026-03-03-feat-create-embed-layout-plan.md` (BF-70, completed)
- `docs/plans/2026-03-03-refactor-extract-renewables-infographic-component-plan.md` (BF-71, completed)
