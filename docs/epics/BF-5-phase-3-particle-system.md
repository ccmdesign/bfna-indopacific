# BF-5: Phase 3 — Particle System

| Field       | Value                          |
| ----------- | ------------------------------ |
| Identifier  | BF-5                           |
| Status      | Backlog                        |
| Priority    | High                           |
| Team        | BFNA                           |
| Created by  | Claudio Mendonca               |
| Created at  | 2026-02-22                     |
| Branch      | `claudio/bf-5-phase-3-particle-system` |
| Linear URL  | <https://linear.app/varro/issue/BF-5/phase-3-particle-system> |

---

Can be scaffolded with placeholder paths in parallel with Phase 2; final calibration needs Phase 2 complete.

- [ ] Define bezier control points for all 6 strait paths in lat/lon (entry, control point, exit)
- [ ] Build `Particle` class: `t` position along path `[0–1]`, speed by vessel type (containers fast, tankers slow, dry bulk mid), color by type (blue/amber/slate)
- [ ] Implement `rAF` loop: clear canvas each frame, advance all particles, draw dots
- [ ] Implement particle count calculation from `historical[year]` data, normalized to Malacca = 80
- [ ] Implement vessel type ratio → particle color distribution per strait per year
- [ ] Smoke test at 2025 baseline (~241 total particles); check performance on mid-range device

**2025 particle counts:**

| Strait | Particles |
| -- | -- |
| Malacca | 80 |
| Taiwan | 82 |
| Hormuz | 33 |
| Luzon | 23 |
| Lombok | 12 |
| Bab-el-Mandeb | 11 |
| **Total** | **~241** |

## Tasks (Epic Scope)

- [ ] Setup canvas rendering loop and fundamental `Particle` class
- [ ] Map bezier coordinate paths for all 6 straits
- [ ] Wire particle logic to historical metrics (data-driven counts and type distributions)
