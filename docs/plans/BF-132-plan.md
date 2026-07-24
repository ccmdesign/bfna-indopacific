# BF-132 — Retire the map-era mobile band-aids

Parent: BF-110. Sub 4/4, runs after BF-129 / BF-130 / BF-131 landed on `dev`.

## Premise

The map no longer renders on a phone. Both entry points that mount
`components/infographics/AseanInfographic.vue` gate it behind `!isMobile`:

- `components/asean/AseanLanding.vue:43` — `<div v-if="!isMobile" class="asean-landing__map">`
- `components/asean/AseanCountryDetailPage.vue:50` — `<AseanInfographic v-if="!isMobile" …>`

`useViewport()` sets `isMobile` at **≤ 879px width**. So inside `AseanInfographic`
there is no live code path where `isMobile === true` for more than the frame
before Vue tears the component down. Any CSS or logic in that file whose only
customer was a phone is dead.

This is a subtractive cycle. No features, no new mobile components touched.

## Rule-by-rule verdicts

### 1. `shouldCollapse`'s `isMobile` term — DELETE

`AseanInfographic.vue:43-47`

```
const { isMobile } = useViewport()
const shouldCollapse = computed(
  () => (activeSlug.value !== null || isMobile.value) && !userExpanded.value
)
```

**Verdict: delete the `|| isMobile.value` term and the `useViewport()` call.**

Reason: the mobile half can never fire — the component is unmounted at the very
widths that would make it true. The desktop half (collapse when a country is
docked, because the map reframes into the top-left quadrant and the legend would
overlap land) is the real reason and stays verbatim.

Note: `useViewport` is a Nuxt auto-import in this file — there is no explicit
`import` line to drop (line 2 imports only from `vue`). Nothing else in the file
references `isMobile`.

Knock-on: the watcher comment on `shouldCollapse` mentions a "viewport-shrink
collapse path" that no longer exists; the comment gets trimmed, the watcher
itself stays (dock + Overview/Back still need it).

### 2. BF-118 — `.asean-infographic__idle { max-height: 100svh }` + `.asean-legend` / `.asean-legend__menu` flex sizing — KEEP

`AseanInfographic.vue:284-308`, `components/asean/AseanLegend.vue:110-140`

**Verdict: keep, unchanged.**

Reason: it is a **height** rule with no width component and no media query. It
earns its place on genuinely short *desktop* viewports — a 150%-scaled 1920×1080
Windows display is a 1280×720 CSS viewport, 125% laptops land at 768, and an
unmaximised window can be shorter still. Without the cap, intro + gap + legend
stack past `100svh` and push Timor-Leste below the fold where the legend's own
internal scroller can never reach it.

Confirmation that it does nothing for phones now: neither `.asean-infographic__idle`
nor the `.asean-legend` flex rules are ever rendered on a phone — the component
that owns them is not mounted at ≤ 879px. They are desktop-only by construction,
not by media query.

### 3. BF-119 — `@media (max-height: 480px)` intro-shrink block — DELETE

`AseanInfographic.vue:363-408` (comment + block, ~46 lines)

**Verdict: delete.**

Reasons, in order:

1. Its stated trigger is *landscape phone* — "iOS Safari lands at ~812×340". No
   phone reaches the map landing any more, in either orientation.
2. Its premise is gone twice over. The block existed so the **collapsed legend
   pill** cleared the fixed 4rem footer. The pill only appeared in the idle state
   because `shouldCollapse` fired on `isMobile` — which rule 1 removes. On
   desktop idle, `shouldCollapse` is `false`, so the legend is the full list, not
   a pill, and the block is shrinking type for a layout that no longer exists.
3. No realistic desktop viewport is ≤ 480px CSS height. The shortest desktop
   targets under test are 1280×720 and 1366×768; macOS and Windows both floor a
   usable window well above 480px. To be measured in the browser step — if a
   short desktop window still needs it, this verdict flips to keep with a note.

Deleting the block does **not** touch BF-118's cap, which is what actually keeps
the idle column inside the viewport at 720/768.

## Explicitly NOT touched

- BF-106 `@media (max-height: 800px) { .asean-infographic__sidebar { pointer-events: auto } }`
  — the docked sidebar must stay wheel-scrollable on short desktop viewports.
- `AseanCardList.vue`, `AseanLanding.vue`, `CountryDetail.vue`,
  `AseanCountryDetailPage.vue`, the new pages. Their `isMobile` usage is the
  desktop/mobile split itself, not a band-aid.
- `components/asean/AseanLegend.vue` flex sizing (rule 2).
- `RotateDeviceOverlay` / straits pages — out of scope.

## Acceptance

- Diff is net negative.
- `npm run build` clean.
- 1280×720 and 1366×768 idle: legend column fits, Timor-Leste reachable, panel
  bottom on screen.
- 1280×720 docked: hit-test over the sidebar lands in the sidebar; second chart
  card reachable by scroll.
- 1920×1080 idle + docked unchanged; map clickable through the gap beside the column.
- Docking a country still collapses the legend.
- 390×844: card list renders, 11 cards, no map SVG in the DOM, tap-through works.
