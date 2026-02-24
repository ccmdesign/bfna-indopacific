# BF-11: Phase B1 — Prototyping the 3D Scene

| Field       | Value                          |
| ----------- | ------------------------------ |
| Identifier  | BF-11                          |
| Status      | Backlog                        |
| Priority    | Medium                         |
| Team        | BFNA                           |
| Created by  | Claudio Mendonca               |
| Created at  | 2026-02-24                     |
| Branch      | `claudio/bf-11-phase-b1-prototyping-the-3d-scene` |
| Linear URL  | <https://linear.app/varro/issue/BF-11/phase-b1-prototyping-the-3d-scene> |

---

Time-boxed experiment to prove we can render a glass lens effect over a map in Vue without destroying performance.

- [ ] Spin up `/concept-3d` route using TresJS (Vue wrapper for Three.js)
- [ ] Load `.webp` map as a base texture on a plane
- [ ] Create custom convex mesh with refractive `MeshPhysicalMaterial` bound to cursor for the 'lens'
- [ ] Evaluate performance (target 60fps) and visual quality

**Go/No-Go Decision:** If the lens looks great and performance is solid, proceed to B2. If too heavy or visually messy, scrap Track B and stick to Track A.

## Tasks (Epic Scope)

- [ ] Scaffold TresJS prototype environment and base materials
- [ ] Build and bind interactive glass lens mesh
- [ ] Conduct 3D performance profiling and Go/No-Go evaluation
