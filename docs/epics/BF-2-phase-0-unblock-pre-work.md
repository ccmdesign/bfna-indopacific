# BF-2: Phase 0 — Unblock & Pre-work

| Field       | Value                          |
| ----------- | ------------------------------ |
| Identifier  | BF-2                           |
| Status      | Backlog                        |
| Priority    | Urgent                         |
| Team        | BFNA                           |
| Created by  | Claudio Mendonca               |
| Created at  | 2026-02-22                     |
| Branch      | `claudio/bf-2-phase-0-unblock-pre-work` |
| Linear URL  | <https://linear.app/varro/issue/BF-2/phase-0-unblock-and-pre-work> |

---

Do this before any code is written. Resolves the three blocking decisions.

- [ ] Decide page routing: `/straits` own route vs. replace root
- [ ] Pick map image source; test an export at `Lon 30°E–145°E, Lat 5°S–35°N` at 2× resolution (candidates: Google Earth Studio, Mapbox Static API, NASA Blue Marble)
- [ ] Commit final map `.webp` to `public/assets/`
- [ ] `npm install gsap`
- [ ] Move `_process/straits.json` → `data/straits.json` (**not** `public/` — this is a build-time data asset, loaded via static Vite import)

**Note:** The map image is the real gate. Coordinate calibration and bezier paths both depend on having the final image committed.

## Tasks (Epic Scope)

- [ ] Finalize and commit map asset (evaluate sources, generate 2x bounding box map)
- [ ] Resolve architecture decisions and dependencies (routing, GSAP, data paths)
