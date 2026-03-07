# Brainstorm: Multi-Infographic Support & Embeddable Infographics

**Date:** 2026-03-03
**Status:** Final
**Related:** [Straits Infographic Brainstorm](2026-02-22-straits-infographic-brainstorm.md), [Phase 1 Scaffolding Epic](../epics/BF-3-phase-1-scaffolding.md)

---

## What We're Building

Two interconnected features for the BFNA Indo-Pacific infographic site:

1. **Multi-infographic support** — The site evolves from a single "Renewables on the Rise" page to a hub hosting multiple interactive infographics (starting with "Straits" as the second, with a third planned).

2. **Embeddable infographics** — Users can copy embed code (iframe snippets) to place these interactive infographics on their own websites. The embed renders the full infographic experience at a fixed recommended size.

---

## Why This Approach

**Architecture: Shared Components with Nuxt Layouts (Approach A)**

Each infographic is a self-contained Vue component living in `components/infographics/`. Two Nuxt layouts handle the different contexts:
- `layouts/default.vue` — full site chrome (nav, footer) for `/infographics/*` pages
- `layouts/embed.vue` — no back-link or footer attribution, but retains the infographic's own background and rotate overlay for `/embed/*` pages

Both route patterns render the same infographic component, ensuring a single source of truth per infographic. This is the idiomatic Nuxt pattern and scales cleanly to the planned three-part series.

**Why not alternatives:**
- Query parameter toggle (`?embed=true`) — harder to set path-specific security headers in Netlify; less clean URLs
- Dynamic catch-all route — over-engineered for 2-3 infographics; breaks Nuxt's file-based routing convention

---

## Key Decisions

### URL Structure
- **Homepage:** `/` — card-based hub listing all infographics
- **Infographic pages:** `/infographics/<slug>` (e.g., `/infographics/renewables`, `/infographics/straits`)
- **Embed pages:** `/embed/<slug>` (e.g., `/embed/renewables`, `/embed/straits`)

### Homepage Cards
Each infographic card includes:
- Preview thumbnail
- Title
- Short description
- Two buttons: "Embed Code" (copy iframe snippet) and "View Infographic" (link to `/infographics/<slug>`)

### Embed Behavior
- **Full experience** — the embed renders the entire infographic (scrolling, animations, all sections)
- **Fixed recommended size** — the embed code specifies `1280 x 800` px as the recommended iframe dimensions
- **Open to all domains** — no domain restrictions on who can embed

### Embed Security (Netlify Headers)
- `/embed/*` routes: remove `X-Frame-Options` restriction (currently `DENY` globally)
- All other routes: keep `X-Frame-Options: DENY`
- Use path-specific header rules in `netlify.toml`

### Routing & Layouts
- Introduce `pages/` directory (currently the app is a single `app.vue`)
- `pages/index.vue` — homepage hub with infographic cards
- `pages/infographics/renewables.vue` — thin wrapper rendering `RenewablesInfographic` component
- `pages/infographics/straits.vue` — thin wrapper rendering `StraitsInfographic` component
- `pages/embed/renewables.vue` — same component, embed layout
- `pages/embed/straits.vue` — same component, embed layout
- `layouts/default.vue` — shared nav, footer, background
- `layouts/embed.vue` — strips back-link and footer; keeps background gradient and rotate overlay (part of the infographic experience)

### Shared Visual Identity
Extracted from current `app.vue` into shared layout/components:
- Background gradient
- Typography (Encode Sans) and fluid spacing tokens
- Footer pattern
- `RotateDeviceOverlay` component
- Master grid base (`.master-grid` CSS)

### Second Infographic
The straits/chokepoints infographic as already brainstormed in `2026-02-22-straits-infographic-brainstorm.md`. This brainstorm does not revisit its content — only the architectural changes needed to support it alongside the first.

---

## Resolved Questions

1. **Recommended embed dimensions** — `1280 x 800` px. Good balance of readability and embeddability at a common laptop viewport size.

2. **Homepage design** — Same dark glassmorphism aesthetic as the infographics. Consistent visual identity across the whole site.

3. **Navigation between infographics** — Minimal back link only. A small "Back to home" or logo link in the corner to keep the infographic experience immersive.

4. **Existing renewables URL redirect** — No redirect needed. The homepage at `/` is the new experience; old links land on the homepage where users can find the infographic.

5. **Embed analytics** — Standard tracking only. Same GA tracking everywhere; embeds and direct views are counted together. Can revisit later if needed.

---

## Technical Considerations

### Migration Path
The current app is a monolithic `app.vue` with no routing. The migration involves:
1. Create `pages/` directory — Nuxt auto-detects and enables file-based routing
2. Replace `app.vue` with Nuxt app shell (`<NuxtLayout><NuxtPage /></NuxtLayout>`) and move infographic content into a reusable component
3. Extract shared elements into `layouts/default.vue`
4. Create `layouts/embed.vue` (minimal)
5. Build homepage `pages/index.vue`
6. Update `netlify.toml` with path-specific headers

### Data Consolidation
Consolidate all datasets into `data/` with per-infographic organization (e.g., `data/renewables/dataset.csv`, `data/straits/straits.json`). The renewables CSV currently lives in `public/dataset.csv` and must be moved. This means switching from runtime `d3.csv('/dataset.csv')` fetch to a build-time import, matching the pattern already used by the straits data.

### Existing Phase 1 Plan Impact
The existing Phase 1 scaffolding plan (`BF-3-phase-1-scaffolding.md`) assumed renewables stays at `/` and straits goes to `/straits`. This brainstorm supersedes that URL structure with the `/infographics/<slug>` pattern and introduces the homepage hub concept.
