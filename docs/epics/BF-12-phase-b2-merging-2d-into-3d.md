# BF-12: Phase B2 — Merging 2D Data into 3D (Ships & Splines)

| Field       | Value                          |
| ----------- | ------------------------------ |
| Identifier  | BF-12                          |
| Status      | Backlog                        |
| Priority    | Medium                         |
| Team        | BFNA                           |
| Created by  | Claudio Mendonca               |
| Created at  | 2026-02-24                     |
| Branch      | `claudio/bf-12-phase-b2-merging-2d-data-into-3d-ships-splines` |
| Linear URL  | <https://linear.app/varro/issue/BF-12/phase-b2-merging-2d-data-into-3d-ships-and-splines> |

---

Replace the 2D Canvas particles with 3D models.

- [ ] Source or create 3 low-poly assets (`.glb`): Container, Tanker, Bulk
- [ ] Map the 2D path coordinates from Track A (Phase 3) into 3D `CatmullRomCurve3` splines in Three.js
- [ ] Spawn the 3D ships along the splines instead of drawing 2D canvas dots

## Tasks (Epic Scope)

- [ ] Source or create low-poly ship assets and configure for Three.js
- [ ] Convert Track A 2D bezier coordinates into 3D splines (`CatmullRomCurve3`)
- [ ] Implement oriented 3D instanced rendering along curves
