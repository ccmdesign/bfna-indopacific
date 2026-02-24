---
title: Execute Phase 0 Unblock Pre-work
type: feat
status: completed
date: 2026-02-24
origin: docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md
---

# Execute Phase 0: Unblock & Pre-work

## Enhancement Summary

**Deepened on:** 2026-02-24
**Sections enhanced:** 0 (Pre-work tasks)
**Research agents used:** None required for this foundational issue.

### Key Improvements

1. Validated that map generation and routing are the only blocking decisions for Phase 0.

## Overview

This issue covers the preliminary setup and blocking decisions required before beginning code implementation for the Straits Infographic. It resolves routing, map asset generation, data placement, and dependency installation.

## Problem Statement / Motivation

Before scaffolding components and binding data, foundational decisions around the application's URL structure and the primary map visual asset must be locked in. The map image is the critical gate for all coordinate math and particle rendering.

## Proposed Solution

1. **Routing:** Decide between creating a dedicated `/straits` route or replacing the root index. *Decision:* Use a dedicated `/straits` route to keep it separate from the renewables infographic.
2. **Map Asset:** Generate and evaluate a map image from Google Earth Studio, Mapbox Static API, or NASA Blue Marble. Bounding box: Lon 30°E–145°E, Lat 5°S–35°N at 2x resolution. Save as `.webp`.
3. **Data:** Relocate `_process/straits.json` to `data/straits.json` for build-time static imports.
4. **Dependencies:** Install `gsap` for scroll animations.

## Technical Considerations

- **Asset Size:** The 2x `.webp` map image should be highly compressed to avoid degrading load times.
- **Data Location:** `data/straits.json` must be accessible via Vite's static import system (`~/data/straits.json`).

## System-Wide Impact

- **Interaction graph**: Minimal. Sets up the environment.
- **Error propagation**: If map fails to load, canvas coordinate math will be misaligned.
- **State lifecycle risks**: N/A for static files.
- **API surface parity**: N/A.
- **Integration test scenarios**: Verify that `data/straits.json` successfully imports in a test component. Verify the `.webp` is served correctly.

## Acceptance Criteria

- [ ] Page routing strategy finalized (`/straits` route)
- [ ] Map image source selected and map generated at required bounding box (`Lon 30°E–145°E, Lat 5°S–35°N`, 2x res)
- [ ] Final map `.webp` committed to `public/assets/`
- [ ] `gsap` installed via npm (`npm install gsap`)
- [ ] `_process/straits.json` moved to `data/straits.json`

## Success Metrics

- Unblocked downstream tasks (Phase 1 Scaffolding and Phase 2 Coordinate System)
- Zero missing dependencies for `gsap`

## Dependencies & Risks

- Map asset quality might require iteration if 2x zoom looks overly blurry based on the source.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md](file:///Users/claudiomendonca/Documents/GitHub/bfna-indopacific/docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md)
- Epic: [BF-2 Phase 0](file:///Users/claudiomendonca/Documents/GitHub/bfna-indopacific/docs/epics/BF-2-phase-0-unblock-pre-work.md)
