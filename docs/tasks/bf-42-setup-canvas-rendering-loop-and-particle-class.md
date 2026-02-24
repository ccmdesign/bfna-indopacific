# BF-42: Setup canvas rendering loop and Particle class

| Field       | Value                          |
| ----------- | ------------------------------ |
| Identifier  | BF-42                          |
| Status      | Backlog                        |
| Priority    | High                           |
| Team        | BFNA                           |
| Project     | BF-5: Phase 3 — Particle System |
| Created by  | Claudio Mendonca               |
| Created at  | 2026-02-24                     |
| Branch      | `claudio/bf-42-setup-canvas-rendering-loop-and-particle-class` |
| Linear URL  | <https://linear.app/varro/issue/BF-42/setup-canvas-rendering-loop-and-particle-class> |

---

Build `Particle` class: `t` position along path `[0–1]`, speed by vessel type (containers fast, tankers slow, dry bulk mid), color by type (blue/amber/slate). Implement `rAF` loop: clear canvas each frame, advance all particles, draw dots. Smoke test at \~241 total particles.
