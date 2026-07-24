# BF-131 — Mobile 3/4: country-card list landing (replaces the map on phones)

Stacked on BF-130 (PR base = `feature/BF-130-country-detail-route`). Open PR only, do NOT merge.

## Goal
On phones (`useViewport().isMobile`, ≤ 879px) the `/infographics/asean` landing renders a
vertical, scrollable list of 11 country cards (flag + name + tagline), each a full-tap-target
link to that country's `[country]` detail route. On desktop the landing is the UNCHANGED map
composition. The d3 `AseanMap` must NOT be mounted or hydrated on mobile. `/embed/asean` shows
the same card list on a phone.

## Approach

### New component: `components/asean/AseanCardList.vue`
- Iterates `PROFILES` (insertion order = the designed order: Indonesia, Thailand, Singapore,
  Malaysia, Vietnam, Philippines, Brunei, Cambodia, Laos, Myanmar, Timor-Leste — 11 cards).
- Each card is a `<NuxtLink :to="`${basePath}/${keyToUrlSlug(key)}`">` (reuses BF-130's
  `keyToUrlSlug`; URL uses `timor-leste`) wrapping flag `<img>` + name + tagline. Whole card is
  the tap target.
- `basePath` prop (default `/infographics/asean`); embed passes `/embed/asean` so cards stay on
  the embed surface.
- Panel language: `background: rgba(2,38,64,0.5)`, `backdrop-filter: blur(12px)`, hairline border
  `rgba(255,255,255,0.1)`, `border-radius: 16px` — same as `.asean-legend__menu` / the detail
  page back button, so it reads as the same product.
- Compact masthead (ASEAN title + one-line subtitle) above the list for orientation, reusing the
  intro copy. Scroll container with bottom padding clearing the default layout's fixed 4rem footer.

### New component: `components/asean/AseanLanding.vue` (the mobile/desktop split)
Shared by both `/infographics/asean` and `/embed/asean` so the split lives in one place (DRY —
embed renders the same body). Renders:
```
<ClientOnly><AseanCardList v-if="isMobile" :base-path="base" /></ClientOnly>
<div v-if="!isMobile" class="asean-landing__map"><AseanInfographic /></div>
```
- **Map never mounts/hydrates on mobile:** the map is behind `v-if="!isMobile"`. On a phone
  `useViewport` sets `isMobile=true` during client setup, so on hydration the `AseanInfographic`
  branch is never client-created → its `onMounted` d3 draw never runs → the map SVG is provably
  absent from the mobile DOM (not merely hidden).
- **SSR-desktop→client-mobile flash handling:** `useViewport` defaults `isMobile=false` during
  SSR/prerender, so the static HTML always contains the desktop map branch. To stop a phone
  painting that map scaffold before hydration, `.asean-landing__map` is `display:none` under
  `@media (max-width:879px)` in plain CSS (works pre-JS). The card list is `<ClientOnly>` (renders
  nothing on SSR, mounts on the phone after hydration). Net phone sequence: dark layout background
  (no map) → card list. No map flash. Desktop is untouched (SSR renders the map, media query
  doesn't apply, `v-if` keeps it).

### Page wiring
- `pages/infographics/asean/index.vue`: `<AseanInfographic />` → `<AseanLanding />`; add
  `suppressRotateOverlay: true` to page meta (mobile card list wants portrait; desktop overlay
  never triggers anyway).
- `pages/embed/asean/index.vue`: `<AseanInfographic />` → `<AseanLanding base-path="/embed/asean" />`;
  add `suppressRotateOverlay: true` (embed layout honours it).

## Acceptance mapping
- 11 scrollable cards, flag+name+tagline, full-card link → `[country]` detail. ✓ AseanCardList
- d3 map provably not in mobile DOM. ✓ `v-if="!isMobile"` (never client-mounts)
- No rotate overlay on mobile landing. ✓ `suppressRotateOverlay: true`
- Desktop unchanged. ✓ `v-if="!isMobile"` renders the same `AseanInfographic`
- Embed shows card list on phone. ✓ shared `AseanLanding`
- `npm run build` clean. ✓ verify

## Out of scope / not touched
- No new copy — flag/name/tagline come from existing profile data.
- BF-130's detail route (`AseanCountryDetailPage`) is unchanged; cards link into it.
