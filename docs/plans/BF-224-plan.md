# BF-224 — Embeds that fit any frame + designed thumbnails

Source: Marshall Reid (BFNA) email thread "Checking In", 17–24 Sep 2026. He is
embedding the Straits infographic on indo-pacificnexus.org (Squarespace) and
reported (1) the zoomed chokepoint panels are crowded inside his iframe and
(2) asked for a mobile format. His container is
`width:100%; height:85vh` around an `/embed/straits` iframe.

## Audit (production, 24 Sep 2026)

Rendered every embed inside a Squarespace-like column at desktop, laptop,
tablet and phone sizes, with Marshall's container and with our old 16:10 snippet.

- `/embed/<slug>` rendered the desktop page squeezed into the host frame. Type and
  spacing are `clamp(rem + vw)` tokens and `.master-grid` is viewport-locked, so
  any frame that isn't a desktop viewport reflows and clips.
- Straits: the right-hand detail panel overflowed the map top and bottom — in the
  full page too, not only the embed (4 of 6 straits at 1440×810, strait name and
  close button hidden). The embed also dropped the title, metric toggles and source.
- `RotateDeviceOverlay` covered every portrait phone/tablet embed ("Please rotate
  your device"), with a typo ("Indo Pacífic Project").
- Renewables cropped its title and x-axis in any frame wider than ~1.55:1.
- Netlify's `/* → /index.html 200` fallback served the hub page (with its embed-code
  buttons) for unknown URLs: `/embed/asean` (draft) and shared strait deep links
  (`/infographics/straits/malacca`) both showed the hub.
- Phones scrolled sideways on the hub (+39px) and the Straits list/detail (+24px).
- No Open Graph / Twitter meta anywhere; hub cards had empty thumbnail placeholders.

## Decisions (with Claudio)

**Scale-to-fit stage + cover card on phones** (over "cover images only" and
"true responsive re-layout").

- `/embed/<slug>` is now `components/EmbedStage.vue`. It loads
  `/embed/canvas/<slug>` in an inner iframe at the design canvas, where every
  vw/svh/media query resolves as on desktop, and scales that iframe uniformly to
  fit the host frame. A CSS transform in the same document can't do this — the
  vw tokens would still read the host frame's width.
- The canvas stretches along one axis to match the host frame's shape within
  `canvas.minAspect…maxAspect` (data/infographics.ts), so most frames fill edge to
  edge; outside the bounds it letterboxes on the same gradient.
  - Straits: 1440×810, aspect 1.33–2.2.
  - Renewables: 1412×993 (the client's source art), aspect 1.36–1.55 — at 16:9 its
    intro paragraph overflows the top, so it letterboxes in wide frames.
- Below a fitted scale of 0.5 (16px type → 8px) the stage shows
  `EmbedCoverCard.vue` instead: visual + headline + "Explore the interactive",
  opening the full page in a new tab. Container queries cover 343×193 strips,
  4:5 phone frames and landscape phones. `?mode=stage|cover` forces a mode.
- Straits detail panel: capped at the map height with `justify-content: safe center`
  (scrolls rather than spilling) and tightened vertical rhythm (13px body, 14px
  gaps) so all six profiles fit 1440×810 without scrolling. The top-right logo
  fades out while a strait is open (it sat over the close button).
- Embeds never show the rotate overlay (removed from `layouts/embed.vue`).

**Thumbnails** — `npm run export:thumbnails` (scripts/export-thumbnails.mjs)
captures `/embed/canvas/<slug>?capture&bare` (visual only, own text hidden) and
composes designed teasers:

- `public/thumbnails/<slug>-og.jpg` (1200×630) — og:image/twitter:image
- `public/thumbnails/<slug>-card.jpg` — hub catalog cards
- `public/thumbnails/<slug>-visual.jpg` — embed cover-card background
- `exports/thumbnails/` (gitignored, for the client): 1:1 gallery tile (2160),
  3:2 homepage feature (2400×1600), OG copy, manifest + Squarespace snippets.

The square uses a "stack" layout (copy above the full visual) — a square crop of
a landscape infographic cut off its data, and title-over-visual matches the
client's existing gallery tiles. Build/serve plumbing is shared with
export-tiles.mjs via `scripts/lib/static-site.mjs`; export-tiles now screenshots
the canvas route where one exists.

**Routing / meta**

- SPA fallback removed from netlify.toml; `error.vue` renders Nuxt's 404.html.
- `/infographics/straits/<id>` and `/embed/canvas/<slug>` are prerendered.
- `useInfographicSeo(slug)` sets OG/Twitter meta + canonical (embeds canonicalise to
  the full page). `siteUrl` comes from Netlify's `URL`.

**Renewables portrait layout** — the cover card sends phone readers to
`/infographics/renewables`, which had no portrait layout (the grid squeezed the
600px chart into a ~125px row and ran the intro over it; real phones got the
rotate overlay). Below 880px `.layout-1` now stacks title, a 4-line intro with
"Read more", the source note and the chart. `RenewableEnergyChart` gains a
compact mode (same breakpoint): height follows width (340–560px), a measured
label gutter keeps the end labels inside the screen, 4-year ticks on narrow
plots, the chart title moves above the plot, tap pins a line's highlight and
the scrub tooltip stays inside the container. The footer flows at the end of
the page on phones and drops "Copy Embed Link" below 480px. Desktop rendering
is unchanged (the embed canvas and thumbnails render at desktop size).

**Embed code** — `useEmbedCode` now emits a full-width iframe at the infographic's
design aspect, with a `<style>` rule switching phones to 4:5. Hosts may size the
frame however they like; the stage adapts.

## Not done / follow-ups

- ASEAN embed (draft) keeps its own BF-130/131 responsive design; it overflows its
  frame by ~5% horizontally and isn't on the stage yet.
- Squarespace URL-embed (oEmbed) support was not added; the code-block snippet is
  the supported path. OG tags now give URL embeds a link card at least.
- GA records a page view for both the stage and its inner canvas.
