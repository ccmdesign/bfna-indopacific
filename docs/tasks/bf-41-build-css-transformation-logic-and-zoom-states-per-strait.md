# BF-41: Build CSS transformation logic and zoom states per strait

| Field       | Value                          |
| ----------- | ------------------------------ |
| Identifier  | BF-41                          |
| Status      | Backlog                        |
| Priority    | High                           |
| Team        | BFNA                           |
| Project     | BF-4: Phase 2 — Map + Coordinate System |
| Created by  | Claudio Mendonca               |
| Created at  | 2026-02-24                     |
| Branch      | `claudio/bf-41-build-css-transformation-logic-and-zoom-states-per-strait` |
| Linear URL  | <https://linear.app/varro/issue/BF-41/build-css-transformation-logic-and-zoom-states-per-strait> |

---

Build CSS transform container: `overflow: hidden` wrapper → inner `transform` div containing image + canvas. Add per-strait zoom config `{ scale, translateX, translateY }` with placeholder values. Wire CSS transform to `selectedStrait` reactive ref.
