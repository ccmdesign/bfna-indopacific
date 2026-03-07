# Brainstorm: Circle + Lens Straits Visualization

**Date:** 2026-03-04
**Status:** Draft
**Extends:** [2026-02-22-straits-infographic-brainstorm.md](./2026-02-22-straits-infographic-brainstorm.md)

## What We're Building

A simplified interaction model for the straits infographic. The overview map shows **six circles** positioned over each strait, sized proportionally to cargo volume. Clicking a circle triggers a **full-view transition** into a "lens" — a zoomed-in view of that strait with **bidirectional particle animation** representing vessel traffic, color-coded by ship type (container, tanker, dry bulk).

### Two States

1. **Overview Map** — Static satellite image with six proportionally-sized circles. Year slider and metric toggle control what data drives circle sizes.
2. **Lens View** — Full viewport transition to a zoomed-in scene of the selected strait. Canvas renders continuous bidirectional particle flow. A glassmorphism info panel overlays key stats. Close via X button or clicking outside content.

## Why This Approach

The original brainstorm envisioned CSS transform zoom, GSAP scroll intro, and more complex state management. This version is **simpler to build and simpler to use**:

- Circles provide an obvious, intuitive affordance ("click to explore")
- Circle size immediately communicates relative scale across straits
- The lens transition creates focus without juggling multiple UI states
- Particles inside the lens are the hero moment — contained and performant

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Interaction model** | Circles → lens zoom | Simpler than scroll-based or always-visible particles |
| **Lens behavior** | Full view transition | Clean focus on one strait at a time |
| **Particle flow** | Continuous + bidirectional | Reflects real two-way shipping traffic |
| **Controls** | Year slider (2019-2025) + metric toggle (tonnes vs vessels) | Keeps analytical depth from original brainstorm |
| **Detail panel** | Glassmorphism overlay in lens view | Shows cargo value, oil/LNG, industries, threats, key facts |
| **Exit lens** | X button or click outside | Standard modal-like pattern |
| **Technical approach** | Hybrid HTML + Canvas | HTML/SVG circles on overview; Canvas for particles in lens |

## Technical Approach: Hybrid HTML + Canvas

### Overview State
- Static satellite `.webp` as background image
- Six circles rendered as **HTML/SVG elements** positioned via CSS (absolute positioning relative to map container)
- Circle radius = `scale(capacityMt)` using D3 scale, with Malacca as the largest
- Year slider and metric toggle are Vue components that reactively update circle sizes
- Click events are native DOM events on the circle elements

### Lens State
- Clicking a circle triggers a **GSAP-animated transition** (scale + translate + opacity) from overview to lens
- Lens view renders a **`<canvas>` element** for particle animation
- Background: zoomed crop of the satellite image (or a separate higher-res crop per strait)
- Particles animate via `requestAnimationFrame`, following bezier curve paths through the strait
- Particle count ∝ vessel count for the selected year; color-coded:
  - Container: `hsl(218, 60%, 58%)` (blue)
  - Tanker: `hsl(34, 60%, 50%)` (amber)
  - Dry bulk: `hsl(186, 60%, 50%)` (cyan)
- Bidirectional: ~50% of particles flow each direction
- Info panel: Vue component with glassmorphism styling, overlaid on the canvas

### Data Flow
- `straits.json` imported at build time (existing pattern)
- Year slider state drives: circle sizes, particle counts, info panel numbers
- Metric toggle drives: circle sizing basis (capacityMt vs vessels.total)

## Particle System Design

- ~240 particles at 2025 baseline (Malacca = ~80, others proportional)
- Each particle: `{ x, y, progress, speed, direction, type, color }`
- Path: bezier curve per strait (calibrated to the map image)
- Speed varies slightly per particle for organic feel
- Particles wrap around (loop from end back to start)
- Canvas clears and redraws each frame at 60fps

## Circle Sizing

- D3 `scaleSqrt()` domain: `[min capacityMt, max capacityMt]` → range: `[minRadius, maxRadius]`
- Square root scale so area (not radius) is proportional to data
- Min/max radius tuned to look good on the map without overlapping

## Transition Animation

- Overview → Lens: GSAP timeline
  1. Fade out non-selected circles (opacity → 0)
  2. Scale + translate selected circle to fill viewport
  3. Cross-fade to lens canvas + info panel
- Lens → Overview: Reverse the timeline
- Duration: ~0.6-0.8s with ease-out

## Resolved Questions

1. **Map image:** Single satellite `.webp` for both overview and lens. The lens zooms into the same image via CSS/canvas cropping. Simpler pipeline, acceptable detail.
2. **Circle labels:** Always visible — strait names shown next to or below each circle on the overview map.
3. **Mobile behavior:** Vertical card stack on small screens. Skip the map; show straits as a scrollable list of cards, each tappable to open the lens/particle view.

## Out of Scope (for now)

- GSAP scroll-based intro animation (can be added later)
- Route/path visualization on the overview map
- Comparison mode between straits
- Export/download functionality
