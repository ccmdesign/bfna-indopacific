# BF-117 — ASEAN map: no way back to the country list from a docked country

## Problem
With a country docked, the only way back to the idle overview is clicking empty map
geometry (undiscoverable). The layout's "Back to home" link goes to a site index that
does not list this infographic, which makes it worse.

## Approach
One button, one key handler. No routing, no history entries.

- `components/infographics/AseanInfographic.vue` — the only file touched.
- Add a fixed, top-left `<button class="asean-infographic__back">` rendered only when
  `activeProfile` is truthy (absent on the idle screen), wired to
  `onActiveSlugUpdate(null)`.
- Bind `Escape` on `window` via `onMounted` / `onBeforeUnmount` (listener removed on
  unmount) calling the same handler, guarded on `activeSlug !== null`.
- Wrap in the existing `intro-fade` Transition so it matches the idle/sidebar choreography.

## Placement
- `position: fixed; left: clamp(16px, 1.5vw, 24px)`, top offset **below** two things:
  1. `layouts/default.vue:34` `.back-link-nav` ("Back to home", `top: 1rem; left: 1.5rem`)
  2. the `AseanCountrySwitcher` reel band (`top: 0`, height ≈ `64px + clamp(32px, 6vh, 64px)`)
  so `top: calc(64px + clamp(32px, 6vh, 64px) + 8px)` — no collision, no visual duplication.
- Sidebar is on the **right**, so top-left is inherently clear of it.
- `pointer-events: auto` is mandatory — the surrounding overlays are `pointer-events: none`
  by design so the map stays clickable through them.

## Styling
Panel language from `.asean-legend__menu`: `rgba(2, 38, 64, 0.5)`,
`backdrop-filter: blur(12px)` (+ `-webkit-` prefix), 1px `rgba(255,255,255,0.1)` border,
Encode Sans, `:focus-visible` outline, reduced-motion respected.

## Accessibility
- Real `<button type="button">`, keyboard reachable, `aria-label="Back to all countries"`
  (visible text "Back" is contained in it → WCAG 2.5.3 satisfied).

## Test strategy
Browser (Claude Browser, `nuxt-dev` on :3100), on `/infographics/asean` and `/embed/asean`:
dock → button visible top-left without hover/scroll → click restores idle → dock → Escape
restores idle → absent on idle → empty-ocean deselect still works → repeat at 1280×720.

## Risks
- `pointer-events` inheritance from a `none` ancestor — mitigated by making the button a
  direct child of `.asean-infographic` (which is not `none`) and setting `auto` explicitly.
- Stacking: sidebar/idle are `z-index: 20`, switcher `22` → button gets `25`.
- Escape listener leak — removed in `onBeforeUnmount`.

## Out of scope (per brief)
The layout "Back to home" target and the site index. Noted in the PR if confusing.
