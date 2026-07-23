# BF-130 — Per-country detail route `/infographics/asean/<country>`

Parent: BF-110. Depends on BF-129 (extracted `components/asean/CountryDetail.vue`).

## Goal
Real nested Nuxt routes for a deep-linkable, shareable per-country detail page — the
mobile face of the ASEAN infographic — while keeping the desktop map-first landing
byte-identical.

## Routing structure
- `pages/infographics/asean.vue` → split into:
  - `pages/infographics/asean/index.vue` — the landing (unchanged: `<AseanInfographic />`).
  - `pages/infographics/asean/[country].vue` — the detail route.
- Embed parity:
  - `pages/embed/asean.vue` → `pages/embed/asean/index.vue` (unchanged).
  - `pages/embed/asean/[country].vue` — embed detail under the `embed` layout.

## Slug handling
- Slug = profile key. Only `timor_leste` carries an underscore; all other keys are single
  tokens. URL uses the hyphen form (`timor-leste`), mapped to the key with a
  hyphen↔underscore swap.
- New helpers in `data/asean/country-profiles.ts`: `urlSlugToKey`, `keyToUrlSlug`,
  `profileByUrlSlug`.
- Unknown slug → `navigateTo(list, { replace: true })` (graceful degrade to the list,
  no hard 404), guarded reactively for param-only changes.

## Desktop behaviour on the detail URL
- Map-first. `[country].vue` on desktop reuses the **same** `AseanInfographic`, docked to
  the country via a new `initialSlug` prop — NOT a second desktop layout. SSR renders this
  (isMobile defaults false), so the route prerenders as the docked map.
- Deviation from the brief's literal "index page reads the param": the detail page renders
  `AseanInfographic :initial-slug` directly instead of redirecting to index. Same acceptance
  outcome (docked map), no redirect flash, deep-link URL preserved, still prerenderable.

## Mobile detail page
- Full-width portrait. Shared component `AseanCountryDetailPage.vue`:
  - Desktop (`v-if="!isMobile"`): `<AseanInfographic :initial-slug>`.
  - Mobile (`<ClientOnly v-if="isMobile">`): country identity header (flag + name) +
    back-to-list control + `<CountryDetail :slug>`.
- Mirrors the established straits `[[id]].vue` desktop/mobile split (SSR-desktop,
  client-only mobile) to stay within the codebase's accepted hydration pattern.
- Translucent-panel visual language for the header/back control (matches
  `.asean-infographic__back`).

## Chrome / stacking (the BF-119 collision)
- Detail route sets `showBackLink: false` so the layout's top-left "Back to home" does not
  duplicate/collide with the page's own back-to-list control.
- `suppressRotateOverlay: true` on both detail routes — the page is designed for portrait.
- `layouts/embed.vue` updated to respect `suppressRotateOverlay` meta (currently hard-codes
  the overlay); existing embed pages don't set it, so their overlay is unchanged.
- Content clears the fixed 4rem footer with bottom padding.

## Prerender
- Add per-country routes (`/infographics/asean/<c>`, `/embed/asean/<c>`) to the Nitro
  prerender list, gated on whether `asean` is in `infographicsToPrerender` (asean is
  currently a draft → prerendered on dev/preview, excluded in production; future-proof if
  it flips to published).
- Add `/embed/asean/**` to the draft prerender-exclusion route rules for symmetry with
  `/infographics/asean/**`.

## Acceptance (verify via browser tests, both viewports)
- Phone: `/infographics/asean/indonesia`, `/infographics/asean/timor-leste`, +others render
  the detail (3 tabs, Key Facts, both charts, CRM box), back returns to the list, no rotate
  overlay.
- Unknown slug `/infographics/asean/nonesuch` → redirects to the list, no crash.
- Desktop: `/infographics/asean/indonesia` lands on the map with Indonesia docked.
- Desktop `/infographics/asean` (index) unchanged.
- Embed route reaches a detail.
- `npm run build` prerenders the per-country routes.
