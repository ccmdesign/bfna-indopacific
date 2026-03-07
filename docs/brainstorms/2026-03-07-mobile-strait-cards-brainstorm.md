# Brainstorm: Mobile Strait Cards

**Date:** 2026-03-07
**Status:** Draft

## What We're Building

A mobile-native experience for the straits infographic that replaces the desktop map with a vertical card list. Each strait becomes a tappable card that expands into a full detail page with its own route. The zoomed-in strait circle with the particle system serves as a decorative hero element on each detail page.

### Key Behaviors

- **Entry point:** On viewports below 900px, skip the map entirely. Show a scrollable vertical list of strait cards.
- **Card preview:** Each card shows a zoomed circle thumbnail, the strait name, and the trade value headline.
- **Tap to expand:** Tapping a card triggers a shared-element transition (expand-in-place) where the card grows to fill the viewport, the circle scales up into the hero, and the detail content fades in below.
- **Detail page:** A long-scroll page with:
  1. Hero: zoomed-in circle with satellite image + animated particle flow
  2. Strait name overlay on the hero
  3. Description paragraph
  4. Qualitative data (top industries, threats, key facts)
  5. Quantitative data (trade value, oil/LNG, vessel breakdown, historical trend chart)
- **Routing:** Nested Nuxt dynamic routes — `/infographics/straits` for the list, `/infographics/straits/[id]` for each strait detail page. Back button returns to the list.
- **Desktop unchanged:** This layout only activates below the 900px breakpoint. Desktop keeps the current map experience.

## Why This Approach

The current straits page is desktop-only — mobile users see a "rotate your device" blocker. A card-based mobile layout is the most natural pattern for presenting a collection of items on small screens. Treating each strait as its own page (rather than an inline expansion) gives room for the full data story without cramped UI, and makes each strait individually linkable/shareable.

The expand-in-place transition creates visual continuity between the list and detail views, making the experience feel fluid rather than jarring.

## Key Decisions

1. **Card list, no map on mobile** — The proportional circle map doesn't translate well to small screens. Cards are a better mobile primitive.
2. **Nested routes with dynamic `[id]`** — Each strait gets its own URL. Enables deep linking, sharing, and proper back-button behavior.
3. **Expand-in-place transition** — Shared element animation from card to full page. The circle in the card preview morphs into the hero circle.
4. **Particles as hero decoration** — The particle system (WIP) renders inside the hero circle on the detail page. Assumes particles will be ready before mobile ships.
5. **Long scroll for detail** — No tabs or accordions. Qual data first (description, industries, threats), then quant data (charts, stats). Natural mobile reading flow.
6. **Mobile-only** — Activated below 900px. No impact on desktop layout.

## Technical Considerations

- **RotateDeviceOverlay** currently blocks mobile entirely — must be removed or conditioned to only show when the card layout isn't active.
- **Shared element transitions** — Vue's `<Transition>` or the View Transitions API could power the card-to-page animation. View Transitions API is the modern choice but has limited Safari support (as of early 2026).
- **Particle system dependency** — The particle canvas needs to work at the hero size (~full viewport width, ~40vh height). Performance on mobile devices is a concern — may need reduced particle count.
- **Existing components to reuse** — `StraitCircle.vue` (renders the circle with satellite image), `StraitHistoryChart.vue` (D3 sparkline), and the strait data types/JSON are all reusable. The quant/qual panels need mobile-adapted versions.
- **Layout system** — The master grid (`layout-2`) has no responsive rules. The mobile card layout should bypass the grid entirely — either a separate layout or conditional rendering.

## Resolved Questions

1. **Card ordering** — Alphabetical.
2. **Swipe between straits** — Yes, horizontal swipe on the detail page navigates to adjacent straits.
3. **Particle performance budget** — Reduced count (~20-30 per strait) recommended for mobile, but out of scope for this feature. Tracked as [BF-88](https://linear.app/ccm-design/issue/BF-88) linked to BF-78.
