# BF-40: Implement coordinate mapping system

| Field       | Value                          |
| ----------- | ------------------------------ |
| Identifier  | BF-40                          |
| Status      | Backlog                        |
| Priority    | High                           |
| Team        | BFNA                           |
| Project     | BF-4: Phase 2 — Map + Coordinate System |
| Created by  | Claudio Mendonca               |
| Created at  | 2026-02-24                     |
| Branch      | `claudio/bf-40-implement-coordinate-mapping-system` |
| Linear URL  | <https://linear.app/varro/issue/BF-40/implement-coordinate-mapping-system> |

---

Define bounding box config `{ lonMin: 30, lonMax: 145, latMin: -5, latMax: 35 }`. Implement `latLonToPixel(lat, lon)` utility with equirectangular math. Place map `.webp` as base image layer. Validate with debug SVG dots at known coordinates (e.g. Singapore \~103.8°E/1.3°N).
