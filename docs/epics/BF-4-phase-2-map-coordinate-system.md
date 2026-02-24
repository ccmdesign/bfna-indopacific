# BF-4: Phase 2 — Map + Coordinate System

| Field       | Value                          |
| ----------- | ------------------------------ |
| Identifier  | BF-4                           |
| Status      | Backlog                        |
| Priority    | High                           |
| Team        | BFNA                           |
| Created by  | Claudio Mendonca               |
| Created at  | 2026-02-22                     |
| Branch      | `claudio/bf-4-phase-2-map-coordinate-system` |
| Linear URL  | <https://linear.app/varro/issue/BF-4/phase-2-map-coordinate-system> |

---

Depends on final map image being committed (Phase 0 #3).

- [ ] Define bounding box config object: `{ lonMin: 30, lonMax: 145, latMin: -5, latMax: 35 }`
- [ ] Implement `latLonToPixel(lat, lon)` utility — equirectangular math against the bounding box
- [ ] Place map `.webp` as the base image layer inside `StraitMap.vue`
- [ ] Build CSS transform container: `overflow: hidden` wrapper → inner `transform` div containing image + canvas
- [ ] Add per-strait zoom config `{ scale, translateX, translateY }` — placeholder values to calibrate later
- [ ] Wire CSS transform to a `selectedStrait` reactive ref
- [ ] Validate coordinate math: draw debug SVG dots at known lat/lon points (e.g. Singapore ~103.8°E/1.3°N) and confirm they land correctly on the image

## Tasks (Epic Scope)

- [ ] Implement coordinate mapping system (`latLonToPixel` method and debug markers)
- [ ] Build CSS transformation logic and initial zoom states per strait
