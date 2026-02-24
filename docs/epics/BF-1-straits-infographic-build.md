# BF-1: Straits Infographic — Build

| Field       | Value                          |
| ----------- | ------------------------------ |
| Identifier  | BF-1                           |
| Status      | Backlog                        |
| Priority    | Urgent                         |
| Team        | BFNA                           |
| Created by  | Claudio Mendonca               |
| Created at  | 2026-02-22                     |
| Branch      | `claudio/bf-1-straits-infographic-build` |
| Linear URL  | <https://linear.app/varro/issue/BF-1/straits-infographic-build> |

---

Interactive infographic visualizing maritime traffic through six Indo-Pacific chokepoints (Malacca, Taiwan, Hormuz, Luzon, Bab-el-Mandeb, Lombok).

**Approach:** Static satellite `.webp` map + D3 Canvas particle system. ~241 animated particles, color-coded by vessel type, proportional to annual vessel counts. Scroll intro → interactive dashboard with year slider (2019–2025), metric toggle (tonnes/vessels), and click-to-focus per strait.

**Stack:** Nuxt 4 SSG · D3 v7 (existing) · GSAP (new) · Canvas 2D

**Bounding box:** Lon 30°E–145°E, Lat 5°S–35°N

**Brainstorm doc:** `docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md`

---

## Blockers — resolve before coding

| Blocker | Blocks |
| -- | -- |
| Map image source decision | Coordinate calibration, bezier paths |
| Page routing decision (`/straits` vs. root) | All scaffolding |
| Bezier path coordinates | Particle system accuracy |

The map image export is the critical gate — everything downstream depends on having the final `.webp` committed.

---

## Dependency Graph

```
BF-2 (Unblock) ──┬──► BF-3 (Scaffolding) ──┬──► BF-6 (Vue State)   ──┐
                 │                           └──► BF-7 (Detail Panel) ──┼──► BF-8 (GSAP) ──► BF-9 (Polish)
                 └──► BF-4 (Map + Coords) ──► BF-5 (Particles) ────────┘
                                                                  BF-10 (Editorial) ◄── BF-7
                                                                  BF-9 + BF-10 run in parallel
```

## Parallelization Strategy

* **BF-2 done →** BF-3 and BF-4 start simultaneously
* **BF-3 done →** BF-6 and BF-7 start simultaneously — biggest efficiency win; Vue state and detail panel are fully independent of each other and of the particle work
* **BF-5** can be scaffolded with placeholder paths while BF-4 is still in progress; final calibration waits for BF-4
* **BF-9 + BF-10** (Polish + Editorial) run together at the end

---

## Track B: The 3D Lens Upgrade (Exploration)

Once Track A (the core 2D infographic) is stable, we will explore replacing the 2D SVG/Canvas metrics with a 3D glass lens effect over the map using Three.js/TresJS. This includes a transition to a micro-view with 3D low-poly ships instead of 2D particles. See Phase B1-B3 issues.

## Task Breakdown

* [ ] Execute Phase 0: Unblock & Pre-work (Asset generation & tech decisions)
* [ ] Execute Phase 1: Scaffolding (Routing & Layouts)
* [ ] Execute Phase 2: Map + Coordinate System
* [ ] Execute Phase 3: Particle System core logic
* [ ] Execute Phase 4: Vue State Controls (Global timeline)
* [ ] Execute Phase 5: Detail Panel (Data presentation)
* [ ] Execute Phase 6: GSAP Intro animations
* [ ] Execute Phase 7: Calibration & Polish
* [ ] Execute Phase 8: Editorial Review
* [ ] (Optional) Explore Track B (Phase B1-B3)
