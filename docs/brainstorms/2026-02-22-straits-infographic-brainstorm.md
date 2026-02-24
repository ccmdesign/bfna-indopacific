---
date: 2026-02-22
topic: straits-infographic
---

# Straits Infographic — Tech & Feature Brainstorm

## What We're Building

An interactive infographic visualizing maritime traffic through six Indo-Pacific chokepoints (Malacca, Taiwan, Hormuz, Luzon, Bab-el-Mandeb, Lombok). The user experience has two phases: a scroll-triggered intro that animates the map into view, then a locked interactive dashboard where the user explores strait-specific data via a year slider (2019–2025), a metric toggle (tonnes vs. vessels), and click-to-focus on individual straits.

The defining visual feature is an animated particle system where ~240 moving dots per year represent proportional annual vessel traffic — color-coded by vessel type. This makes the "flow" legible and communicates both scale and composition at a glance.

## Why This Approach

Three approaches were evaluated:

- **Option A (Pure D3 vector map):** Zero new deps, consistent with existing code. Rejected as the primary approach because photographic map realism is an editorial goal.
- **Option B (Static satellite image + D3 Canvas) ← CHOSEN:** One exported WebP image as the base; D3 for coordinate math; Canvas 2D for particles. No runtime map API, fully static, photographic quality.
- **Option C (MapLibre GL + Canvas):** True satellite tiles with real zoom/pan. Rejected as primary — adds ~400KB bundle and tile-provider dependency. Kept as escalation path if zoom/pan becomes essential.

## Key Decisions

- **Map base:** Single static `.webp` export of the Indo-Pacific region (source TBD — Google Earth Studio, Mapbox Static API, or NASA Blue Marble). Exported once at 2× resolution for retina screens. **Bounding box: Lon 30°E–145°E, Lat 5°S–35°N** — covers all six straits with margin.

- **Coordinate system:** Simple equirectangular pixel math using the bounding box above. All strait path endpoints defined in lat/lon, converted to pixel positions at render time. Bounding box and conversion logic stored in a config object, not hardcoded in the component.

- **Pseudo-zoom / pan effect:** The image and canvas share a CSS transform container (`overflow: hidden`). On strait selection, `transform: scale(X) translate(Y, Z)` transitions smoothly, simulating zoom-in. Each strait has pre-calibrated config values `{ scale, translateX, translateY }` that can be tuned in data without touching component code.

- **Particle renderer:** Canvas 2D + `requestAnimationFrame` loop. Particles follow pre-computed bezier curves (entry → exit for each strait). Speed varies by vessel type — tankers move slowest, containers fastest, dry bulk in between — reflecting real-world transit characteristics.

- **Particle counts (2025 baseline, normalized Malacca = 80):**
  | Strait | Annual vessels | Particles |
  |---|---|---|
  | Malacca | 85,066 | 80 |
  | Taiwan | 86,636 | 82 |
  | Hormuz | 34,863 | 33 |
  | Luzon | 24,091 | 23 |
  | Bab-el-Mandeb | 12,076 | 11 |
  | Lombok | 13,021 | 12 |
  | **Total** | **256,753** | **~241** |

  *Note: Taiwan nearly matches Malacca by vessel count despite lower tonnage — editorial beat worth surfacing.*

- **Particle color coding (by vessel type):**
  - Container ships → blue
  - Tankers → amber
  - Dry bulk → slate
  - Ratios per strait come from `historical[year][straitId].vessels` breakdown.

- **Year slider:** Native `<input type="range" min="2019" max="2025">` bound to Vue reactive state. On change, recalculate particle counts from `historical[year]` and update canvas loop. Notable data story: Bab-el-Mandeb drops ~65% in 2024 due to Houthi attacks.

- **Metric toggle:** Tonnes mode — particle count proportional to `capacityMt`; Vessels mode — particle count proportional to `vessels.total`. Smooth count transition on toggle.

- **Interaction model:** Single hero reveal — map fades/scales in, particles begin flowing, then snaps into fixed dashboard. One GSAP timeline. Click a strait → CSS transform zoom + detail panel overlaying the map with `description`, `keyFacts`, `threats`, and a proportional bar chart showing container/tanker/dry bulk cargo breakdown.

- **New dependencies:**
  - `gsap` — ScrollTrigger for scroll-intro, smooth timeline control (~70KB gzipped)
  - No other additions; D3 v7 handles everything else (already installed)

- **Data source:** Move `_process/straits.json` → `data/straits.json`. Load via static Vite import: `import straitsData from '~/data/straits.json'`. This is the canonical location for build-time data assets in this project — not `public/`, which is for runtime-served static files. No async fetch required; the JSON is bundled at build time.

- **Component structure:** New `StraitMap.vue` following the same `<div ref="container">` + D3-imperative in `onMounted` pattern as `RenewableEnergyChart.vue`. Canvas drawn into a `<canvas ref="canvas">` inside the transform container.

- **Responsive:** Same pattern as existing infographic — `RotateDeviceOverlay` on mobile portrait. Dashboard designed for landscape (900px+ wide, 1080px+ tall).

- **Art direction — shared visual identity:** This infographic is part of a three-part series. It must share the same design system as the renewables infographic:
  - **Background:** `linear-gradient(#0D0D0D 5%, #022640 105%)` with blue radial glow at top
  - **Typography:** Encode Sans (already loaded globally), fluid scale via `--size-*` custom properties
  - **Spacing:** Use existing `--space-*` fluid tokens throughout
  - **Detail panel / tooltip:** Glassmorphism — `background: rgba(2, 38, 64, 0.95)`, `backdrop-filter: blur(8px)`, `border: 1px solid rgba(255,255,255,0.15)`, `border-radius: 12px`, `box-shadow: 0 8px 32px rgba(0,0,0,0.3)`
  - **Particle colors:** Match existing 60%-saturation HSL palette — container ships `hsl(218, 60%, 58%)` (blue), tankers `hsl(34, 60%, 50%)` (amber), dry bulk `hsl(186, 60%, 50%)` (slate-cyan)
  - **UI controls:** Slider and toggle styled to the dark theme; labels at `rgba(255,255,255,0.5)` matching axis label treatment
  - **Footer:** Same pattern — source attribution left, BFNA logo right, `background: rgba(0,0,0,0.2)`, `height: 4rem`
  - **Layout grid:** `.layout-2` uses the same `.master-grid` base (`100svw × 100svh`, `min-height: 1080px`) with a different column/row definition for the map-centric layout

## Open Questions

- **Map image source:** Google Earth Studio gives the most control over terrain/ocean styling. Mapbox Static API is the fastest to generate. NASA Blue Marble is royalty-free. Need to test an export at the agreed bounding box before committing — the image quality determines how much the CSS zoom effect can magnify before looking soft.

- **Strait path geometry:** Entry/exit lat/lon coordinates for each strait's bezier curve need to be defined. Hand-tuned against the image is the likely approach — the IMF PortWatch `portId` field may have reference coordinates to start from.

- **Page routing:** The straits infographic likely lives at `pages/straits.vue` with its own route, keeping the renewables infographic at the root. Needs a decision before setting up the Nuxt pages directory.

## Task Breakdown

### Critical Path

Three open questions are **blocking** — resolve before writing component code:

| Blocker | Blocks | Effort |
|---|---|---|
| Map image source decision | Coordinate calibration, bezier paths | ~1–2 hrs (testing exports) |
| Page routing decision | All scaffolding | 5 min |
| Bezier path coordinates | Particle system accuracy | 2–3 hrs visual calibration |

The map image is the real gate. Everything downstream from coordinate calibration depends on having the final `.webp` committed.

---

### Phase 0 — Unblock & Pre-work

1. Decide page routing: `/straits` own route vs. replace root
2. Pick map image source; test an export at `Lon 30°E–145°E, Lat 5°S–35°N` at 2× resolution
3. Commit final map `.webp` to `public/assets/`
4. `npm install gsap`
5. Move `_process/straits.json` → `data/straits.json` (build-time data asset, not `public/`)

### Phase 1 — Scaffolding

6. Create `pages/` directory + `pages/index.vue` (wraps existing `app.vue` content)
7. Create `pages/straits.vue` with empty shell
8. Add `.layout-2` CSS grid definition to `public/styles.css`
9. Create `components/StraitMap.vue` — data loading only (static import `import straitsData from '~/data/straits.json'` in `<script setup>`, log to console)

### Phase 2 — Map + Coordinate System

10. Define bounding box config object in the component (lon/lat extents as constants)
11. Implement `latLonToPixel(lat, lon)` utility — equirectangular math against the bounding box
12. Place map `.webp` as the base image layer inside `StraitMap.vue`
13. Build CSS transform container structure: `overflow: hidden` wrapper → inner `transform` div containing image + canvas
14. Add per-strait zoom config `{ scale, translateX, translateY }` — initial placeholder values
15. Wire CSS transform to a `selectedStrait` reactive ref
16. Validate coordinate math: draw debug SVG dots at known lat/lon points (e.g. Singapore ~103.8°E/1.3°N), confirm they land correctly on the image

### Phase 3 — Particle System

17. Define bezier control points for all 6 strait paths in lat/lon (entry, control, exit)
18. Build `Particle` class: `t` position along path `[0–1]`, speed by vessel type, color by type
19. Implement `rAF` loop: clear canvas each frame, advance all particles, draw dots
20. Implement particle count calculation from `historical[year]` data (normalize Malacca = 80)
21. Implement vessel type ratio → particle color distribution per strait per year
22. Smoke test at 2025 baseline (~241 total particles); check performance

### Phase 4 — Vue State & Controls

23. Year slider `<input type="range" min="2019" max="2025">` bound to reactive ref
24. Metric toggle (tonnes / vessels) as reactive ref
25. Particle system reacts to year change — recalculates counts, smooth fade-in/out
26. Strait click handler → sets `selectedStrait`, triggers CSS zoom
27. Click-away / close dismisses selection, resets transform

### Phase 5 — Detail Panel

28. Create `StraitPanel.vue` — overlay panel, slides in from right on CSS transition
29. Display: `name`, `globalShareLabel`, `valueLabel`, `description`
30. Display `keyFacts` as a list, `threats` as tags
31. Proportional bar chart: container/tanker/dryBulk breakdown for selected year
32. Close / dismiss behavior

### Phase 6 — GSAP Intro

33. Configure GSAP + ScrollTrigger in the component
34. Initial state: map hidden (`opacity: 0`, slight scale down)
35. Timeline: map fades + scales in, particles begin spawning progressively
36. Scroll snap: pins the infographic once revealed
37. Guard: particles don't loop until intro completes

### Phase 7 — Calibration & Polish

38. Fine-tune per-strait zoom config values (`scale`, `translateX`, `translateY`)
39. Art direction alignment pass — apply `#0D0D0D`→`#022640` background gradient, Encode Sans + `--size-*` tokens, glassmorphic detail panel, 60%-saturation HSL particle colors, dark-themed controls; ensure visual parity with renewables infographic
40. Typography pass — fluid type scale applied to panel and controls
41. Source attribution footer + methodology link (same layout as renewables — source left, BFNA logo right)
42. `RotateDeviceOverlay` wired up for mobile portrait
43. Cross-browser check (Chrome, Safari, Firefox)
44. Performance audit at 240 particles on a mid-range device

### Phase 8 — Editorial Review

45. Review all 6 strait descriptions and key facts for accuracy
46. Confirm Bab-el-Mandeb 2024 drop is visually obvious when scrubbing the slider
47. Taiwan ≈ Malacca by vessel count — confirm legible in particle density
48. Final copy sign-off

---

### Sequencing Summary

| Phase | Tasks | Dependencies | Can run in parallel with |
|---|---|---|---|
| 0 — Unblock | 1–5 | None | Phase 1 (partial) |
| 1 — Scaffolding | 6–9 | Phase 0 #1 | Phase 0 |
| 2 — Map + coords | 10–16 | Map image committed | Phase 3 (scaffold) |
| 3 — Particles | 17–22 | Phase 2 for calibration | Phase 4, 5 |
| 4 — State & controls | 23–27 | Phase 1 | Phase 3, 5 |
| 5 — Detail panel | 28–32 | Phase 1 | Phase 3, 4 |
| 6 — GSAP intro | 33–37 | Phases 3–5 done | — |
| 7 — Polish | 38–44 | Phase 6 | Phase 8 |
| 8 — Editorial | 45–48 | Phase 5 | Phase 7 |

### Dependency Graph

```
BF-2 (Unblock) ──┬──► BF-3 (Scaffolding) ──┬──► BF-6 (Vue State)   ──┐
                 │                           └──► BF-7 (Detail Panel) ──┼──► BF-8 (GSAP) ──► BF-9 (Polish)
                 └──► BF-4 (Map + Coords) ──► BF-5 (Particles) ────────┘
                                                                  BF-10 (Editorial) ◄── BF-7
                                                                  BF-9 + BF-10 run in parallel
```

**Key parallelization windows:**

- **BF-2 done →** BF-3 and BF-4 start simultaneously (scaffolding + map work in parallel)
- **BF-3 done →** BF-6 and BF-7 start simultaneously — biggest efficiency win; Vue state and detail panel are fully independent of each other and of the particle work
- **BF-5** can be scaffolded with placeholder paths while BF-4 is still in progress; final calibration waits for BF-4
- **BF-9 + BF-10** (Polish + Editorial) run together at the end

## Next Steps

→ `/workflows:plan` for implementation steps
