# BF-129 — Extract reusable CountryDetail component

Parent: BF-110. Pure, behaviour-preserving refactor. Desktop `/infographics/asean` and
`/embed/asean` must be pixel- and behaviour-identical after. No mobile work here.

## What moves → `components/asean/CountryDetail.vue` (new)

Everything inside `.asean-infographic__sidebar` that is country-content (not the
positioning/pointer-events wrapper):

- **Tab state + APG keyboard model:** `Tab` type, `TAB_ORDER`, `tab`, `tabRefs`,
  `setTabRef`, `selectTab`, `focusTab`, `onTabKeydown`, `chartsPanelLabelledBy`.
- **Data gating tied to the active country:** resolve `profile`/`tradeStacked`/`minerals`
  from the `slug` prop internally; `showMineralShareCard`, `NICKEL_CHART_SLUGS` /
  `showsNickelChart`, `crmNote`, `CHART_PARTNERS`, per-tab prose/source selection.
- **Markup:** the tablist header, the Description tabpanel (prose + `CountryKeyFacts`),
  and the shared Trade|Minerals charts tabpanel (both `CardFlip`s + all chart cards).
- **Styles (scoped, moved verbatim):** `.asean-infographic__top`, `__top-main`,
  `__title`, `__tabs`, `__tab*`, `__title-paragraph`, `__prose*`, `__source`,
  `__tabpanel*`, `__panel*`, and the `desc-fade` transition rules.

Component API: single `slug: string | null` prop; owns its own tab state. Renders inside
a single root `.country-detail` wrapper that reproduces the aside's
`flex column / gap: clamp(14px,2vh,24px)` so child spacing is identical. Wrapper stays
pointer-events-inherited (none from aside); `.__tabs` and `.__panel` opt back in as today.

## What stays in `AseanInfographic.vue`

Map, dock framing, floating legend, `AseanCountrySwitcher`, Back-to-overview, idle intro,
`activeSlug`, legend state, `activeProfile` (still gates back/switcher/sidebar). The
`<aside class="asean-infographic__sidebar">` wrapper (positioning, pointer-events:none,
mask, gradient, `panel-rise` transition, `@media max-height:800px`) stays and simply renders
`<CountryDetail :slug="activeSlug" />`.

## Traps

- pointer-events chain: aside none → wrapper inherit none → tabs/panel auto. Verify by
  actually clicking a tab in browser.
- desc-fade out-in keyed on `slug` (+ `slug-tab`); preserve the R10 hidden-tab comment.
- Keep tab/tabpanel IDs (`asean-tab-*`, `asean-tabpanel-*`) — one instance mounted at a time.
- Nickel-chart vs CRM-box editorial split unchanged (fixed slug set).

## Verify

Browser (desktop 1440x900) on both routes: dock every country incl. Indonesia,
Timor-Leste, Myanmar; cycle 3 tabs; flip Trade↔Minerals; keyboard nav. `npm run build`
clean. Standalone-mount probe proves CountryDetail renders from just a slug.
