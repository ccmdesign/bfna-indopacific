---
title: "feat: Mobile routing + conditional layout (list vs map)"
type: feat
status: active
date: 2026-03-09
linear: BF-89
origin: docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md
---

# feat: Mobile routing + conditional layout (list vs map)

## Overview

Replace the desktop-only `RotateDeviceOverlay` blocker on mobile with a native card-based experience for the straits infographic. Below 900px, users see a scrollable card list at `/infographics/straits` and a long-scroll detail page at `/infographics/straits/:id`. Desktop remains unchanged.

## Problem Statement

Mobile users currently hit a full-screen "Please rotate your device" overlay on the straits page. The proportional-circle map does not translate to small screens. There is no mobile-native way to browse strait data.

(see brainstorm: `docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md`, "Why This Approach")

## Proposed Solution

### Route Structure

Keep the existing `pages/infographics/straits/[[id]].vue` catch-all route. It already handles both `/infographics/straits` (no param) and `/infographics/straits/:id` (with param). Inside this page, a viewport-aware composable determines whether to render:

- **Desktop (>=900px):** `<StraitMap>` (existing behavior, unchanged)
- **Mobile (<900px), no `id`:** `<StraitCardList>` (new)
- **Mobile (<900px), with `id`:** `<StraitMobileDetail>` (new)

**Why keep `[[id]].vue` instead of splitting into `index.vue` + `[id].vue`:**
- The catch-all already works and handles validation, head meta, and navigation callbacks
- Splitting would duplicate the `definePageMeta`, validation watcher, and `useStraitsHead` logic
- The mobile branch adds conditional rendering, not a different route structure

### Viewport Detection

Create `composables/useViewport.ts` exposing a reactive `isMobile` ref based on a `matchMedia('(max-width: 899px)')` listener. This composable:

- Uses `window.matchMedia` (not resize events) for performance
- Returns `isMobile: Ref<boolean>`
- SSR-safe: defaults to `false` (desktop) during SSR, hydrates on mount
- Reusable across the project for future responsive needs

### RotateDeviceOverlay Bypass

The layout already supports `suppressRotateOverlay` via page meta. The straits page will set this dynamically:

```ts
// In [[id]].vue — suppress overlay when mobile layout is active
definePageMeta({
  suppressRotateOverlay: true, // Always suppress on straits; mobile has its own layout
  layoutClass: 'layout-2',
  // ...existing meta
})
```

Since the straits page now has a proper mobile experience, the rotate overlay is never needed on this page. Static `suppressRotateOverlay: true` is simpler than reactive conditioning.

### Layout Bypass on Mobile

The master grid (`.layout-2`) locks `.strait-map` into `grid-row: 1/8; grid-column: 1/-1` with the 12x7 grid at `100svh`. On mobile, the card list and detail page need a scrollable layout. Two changes in `public/styles.css`:

1. Add a media query to `.layout-2` that switches to a scrollable flow layout below 900px (matching `layout-home` pattern)
2. The mobile components use normal document flow, not grid placement

```css
/* public/styles.css */
.layout-2 {
  @media (max-width: 900px) {
    height: auto;
    min-height: 100svh;
    overflow: visible;
    display: flex;
    flex-direction: column;
  }
}
```

## Technical Approach

### Phase 1: Foundation (routing + viewport + layout bypass)

**Goal:** Mobile users see "something" instead of the rotate overlay. Desktop is unchanged.

#### Tasks

1. **`composables/useViewport.ts`** (new file)
   - Export `useViewport()` returning `{ isMobile: Ref<boolean> }`
   - Uses `matchMedia('(max-width: 899px)')` with `change` event listener
   - SSR guard: check `import.meta.client` before accessing `window`
   - Cleanup listener on scope dispose

2. **`pages/infographics/straits/[[id]].vue`** (modify)
   - Import `useViewport`
   - Add `suppressRotateOverlay: true` to `definePageMeta`
   - Wrap template in conditional: `<StraitMap v-if="!isMobile" ...>` / `<StraitCardList v-else-if="!straitId" ...>` / `<StraitMobileDetail v-else ...>`
   - Pass `straits`, `straitId`, and `onSelect` to mobile components

3. **`public/styles.css`** (modify)
   - Add `@media (max-width: 900px)` block to `.layout-2` to override grid with flex column
   - Hide footer or make it relative on mobile (matching `.layout-home footer` pattern)

4. **`components/straits/StraitCardList.vue`** (new file)
   - Accepts `straits: Strait[]` prop
   - Renders alphabetically sorted list of `<StraitCard>` components
   - Emits `select(id: string)` when a card is tapped
   - Simple vertical scroll container with padding

5. **`components/straits/StraitCard.vue`** (new file)
   - Accepts `strait: Strait` prop
   - Shows: strait name, `globalShareLabel`, `valueLabel` (trade value headline)
   - Shows a small `<StraitCircle>` as thumbnail (reuse existing component with a fixed small radius, e.g. 40px)
   - Card styling: dark glass card (reuse `--color-card-bg`, `--color-card-border` tokens)
   - Click handler emits `select`

#### Acceptance Criteria

- [ ] `composables/useViewport.ts` exists and exports `useViewport()` with reactive `isMobile`
- [ ] Desktop (>=900px): `<StraitMap>` renders, no change from current behavior
- [ ] Mobile (<900px), list view: card list renders with all straits in alphabetical order
- [ ] Mobile (<900px), detail view: placeholder detail component renders for `/infographics/straits/:id`
- [ ] `RotateDeviceOverlay` does not appear on the straits page at any viewport size
- [ ] `.layout-2` becomes scrollable below 900px
- [ ] Back button from detail navigates to list (existing `navigateTo` logic)

---

### Phase 2: Detail Page

**Goal:** Full mobile detail page with hero, data sections, and navigation.

#### Tasks

1. **`components/straits/StraitMobileDetail.vue`** (new file)
   - Props: `strait: Strait`, `historical: Record<string, StraitHistoricalEntry>`, `year: string`, `allStraits: Strait[]` (for swipe navigation)
   - Long-scroll layout with sections:
     1. **Hero:** `<StraitCircle>` at full viewport width (~90vw), satellite image visible, overlaid strait name. Height ~40vh.
     2. **Trade value hero stat:** Reuse `StraitDetailPanel` pattern (or extract into a shared component)
     3. **Key metrics row:** Oil, LNG, cargo, vessels (from `StraitDetailPanel`)
     4. **Description paragraph**
     5. **Top Industries** (tag chips)
     6. **Threats** (tag chips, threat color)
     7. **Key Facts** (bulleted list)
     8. **Vessel breakdown bar** (from `StraitDetailPanel`)
     9. **Historical trend chart:** `<StraitHistoryChart>` (reuse, may need responsive sizing)
   - Back button / link at top → `navigateTo('/infographics/straits')`
   - Emits `close` (alternative to back navigation)

2. **`pages/infographics/straits/[[id]].vue`** (modify)
   - Pass full data props to `<StraitMobileDetail>`: `strait`, `historical` (by strait), `year`, `allStraits`
   - The `historicalByStrait` function from `StraitMap.vue` needs to be extracted or duplicated (it's a pure function)

3. **Shared data helper** (decision needed)
   - `StraitMap.vue` has `historicalByStrait()` and `LATEST_YEAR` as local logic. For the page to pass these to `StraitMobileDetail`, either:
     - **(A)** Move to a composable `composables/useStraitsData.ts` (cleaner, shared)
     - **(B)** Duplicate in `[[id]].vue` (faster, isolated)
   - Recommendation: **(A)** — the data processing is simple and benefits from a single source of truth

#### Acceptance Criteria

- [ ] Detail page renders all data sections from the brainstorm spec
- [ ] `<StraitCircle>` renders as hero with satellite image at ~90vw
- [ ] `<StraitHistoryChart>` renders responsively on mobile widths
- [ ] Back navigation returns to card list
- [ ] Deep link to `/infographics/straits/malacca` renders the detail page directly on mobile

---

### Phase 3: Transitions + Swipe (Polish)

**Goal:** Fluid card-to-detail transition and swipe-between-straits gesture.

#### Tasks

1. **Expand-in-place transition**
   - Use Vue's `<Transition>` with CSS animations for now (View Transitions API has limited Safari support as of early 2026 — see brainstorm)
   - Card scales up + fades into detail page; reverse on back
   - The `<StraitCircle>` in the card morphs into the hero circle (shared element concept via coordinated CSS transforms)
   - Fallback: simple fade transition if shared-element is too complex for Phase 3

2. **Swipe between straits**
   - Horizontal swipe on the detail page navigates to the next/previous strait (alphabetically)
   - Use touch event listeners (`touchstart`, `touchmove`, `touchend`) with a swipe threshold (~50px horizontal, <30px vertical)
   - Update route via `navigateTo` to adjacent strait ID
   - Show subtle edge indicators (chevron or peek of next card)

3. **Particle system in hero** (depends on BF-78)
   - `<StraitParticleCanvas>` already renders inside `<StraitCircle>` when `selected` prop is true
   - On mobile detail, always pass `selected: true` so particles animate in the hero
   - Performance tuning tracked separately in BF-88 (reduced particle count for mobile)

#### Acceptance Criteria

- [ ] Card-to-detail transition animates smoothly (or gracefully degrades to fade)
- [ ] Swiping left/right on detail page navigates between straits
- [ ] Particle system renders in hero circle (if BF-78 is merged)
- [ ] `prefers-reduced-motion` disables animations

## Alternative Approaches Considered

1. **Split `[[id]].vue` into `index.vue` + `[id].vue`:** Rejected — would duplicate page meta, validation, and head logic. The catch-all already handles both states cleanly.

2. **CSS-only show/hide (no composable):** Rejected — we need the `isMobile` value in script to conditionally import/render heavy components (StraitMap vs StraitCardList). CSS `display:none` would still mount and execute StraitMap's D3 logic on mobile.

3. **Separate mobile layout:** Rejected — the `layout-2` responsive override is simpler and keeps the page in the same layout system. A separate layout would require a layout-switching mechanism.

4. **View Transitions API for shared-element:** Deferred to future — Safari support is incomplete as of early 2026. CSS transitions are a reliable cross-browser fallback.

(see brainstorm: `docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md`, "Technical Considerations")

## System-Wide Impact

- **Interaction graph:** `[[id]].vue` conditionally renders one of three components based on viewport. `StraitMap` (desktop) is unchanged. New mobile components (`StraitCardList`, `StraitMobileDetail`) use `navigateTo` for route changes, which triggers the same param watcher already in `[[id]].vue`.
- **Error propagation:** Invalid strait IDs are already handled by the `watch` in `[[id]].vue` that redirects to `/infographics/straits`. This works for both desktop and mobile branches.
- **State lifecycle risks:** None — mobile components are stateless (data from props/JSON). No new client-side state beyond `useViewport`.
- **API surface parity:** The embed route (`/embed/straits`) uses `StraitMap` directly in `layouts/embed.vue`. Embeds remain desktop-only — no mobile card layout in embeds. This is intentional (embeds are publisher-controlled iframes).

## Dependencies & Prerequisites

- **BF-78 (Particle system):** The hero circle decoration depends on `<StraitParticleCanvas>`. If not merged, the hero renders without particles (graceful degradation — the satellite image still shows).
- **BF-88 (Mobile particle performance):** Reduced particle count for mobile. Out of scope for this feature — particles will use desktop count until BF-88 ships.
- **Strait data:** `data/straits/straits.json` is the single data source. No new data needed.

## Open Questions

1. **Shared data composable vs duplication:** Should `historicalByStrait()` and `LATEST_YEAR` move to a composable? Recommendation is yes (`composables/useStraitsData.ts`), but implementer may prefer duplication if the extraction scope is too large.

2. **StraitDetailPanel reuse vs new mobile component:** `StraitDetailPanel.vue` has all the data rendering logic but is styled for a 320px desktop panel. Should `StraitMobileDetail` reuse it (with responsive overrides) or build a new layout? The brainstorm implies a new layout ("long scroll"), but sharing the data formatting helpers (`fmtUsd`, `fmtNum`, vessel segments) would reduce duplication.

3. **Card thumbnail:** The brainstorm says "zoomed circle thumbnail." Should this be a `<StraitCircle>` with `imageUrl` at small radius, or a static image crop? Using `<StraitCircle>` is simpler and reuses existing component.

4. **Transition approach for Phase 3:** The expand-in-place shared-element transition is the most complex part. If it proves too brittle, a simple slide/fade is an acceptable fallback. The implementer should timebox this to ~2 hours before falling back.

## File Inventory

### New Files

| File | Purpose |
|------|---------|
| `composables/useViewport.ts` | Reactive viewport detection (mobile/desktop) |
| `components/straits/StraitCardList.vue` | Mobile card list container |
| `components/straits/StraitCard.vue` | Individual strait card |
| `components/straits/StraitMobileDetail.vue` | Mobile detail page |
| `composables/useStraitsData.ts` (optional) | Shared data helpers extracted from StraitMap |

### Modified Files

| File | Change |
|------|--------|
| `pages/infographics/straits/[[id]].vue` | Add viewport branching, suppress rotate overlay, pass props to mobile components |
| `public/styles.css` | Add `.layout-2` responsive rules for mobile |

### Unchanged Files (referenced)

| File | Role |
|------|------|
| `components/StraitMap.vue` | Desktop map (no changes) |
| `components/straits/StraitCircle.vue` | Reused in card thumbnail and mobile hero |
| `components/straits/StraitHistoryChart.vue` | Reused in mobile detail page |
| `components/straits/StraitDetailPanel.vue` | Reference for data formatting patterns |
| `components/RotateDeviceOverlay.vue` | Suppressed via page meta (no code change) |
| `layouts/default.vue` | Already supports `suppressRotateOverlay` (no change) |
| `types/strait.ts` | Type definitions (no change) |
| `data/straits/straits.json` | Data source (no change) |

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md](docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md) -- Key decisions carried forward: card list instead of map on mobile, nested routes with `[id]`, expand-in-place transition, 900px breakpoint, long-scroll detail page.

### Internal References

- `layouts/default.vue:15-16,26,31` -- `suppressRotateOverlay` page meta support
- `public/styles.css:64-86` -- master grid and `.layout-2` rules
- `public/styles.css:139-150` -- `.layout-home` scrollable pattern (reference for mobile override)
- `components/straits/StraitDetailPanel.vue` -- data formatting patterns (`fmtUsd`, `fmtNum`, vessel segments)
- `components/straits/StraitCircle.vue` -- reusable circle component with satellite image
