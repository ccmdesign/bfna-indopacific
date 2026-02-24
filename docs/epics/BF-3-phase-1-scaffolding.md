# BF-3: Phase 1 — Scaffolding

| Field       | Value                          |
| ----------- | ------------------------------ |
| Identifier  | BF-3                           |
| Status      | Backlog                        |
| Priority    | Urgent                         |
| Team        | BFNA                           |
| Created by  | Claudio Mendonca               |
| Created at  | 2026-02-22                     |
| Branch      | `claudio/bf-3-phase-1-scaffolding` |
| Linear URL  | <https://linear.app/varro/issue/BF-3/phase-1-scaffolding> |

---

Project structure. Can start once page routing decision is made (Phase 0 #1).

- [ ] Create `pages/` directory + `pages/index.vue` (wraps existing `app.vue` content)
- [ ] Create `pages/straits.vue` with empty shell
- [ ] Add `.layout-2` CSS grid definition to `public/styles.css` (follows `.master-grid` base: `100svw × 100svh`, `min-height: 1080px`)
- [ ] Create `components/StraitMap.vue` — data loading only (static import `import straitsData from '~/data/straits.json'` in `<script setup>`, log to console to verify)

**Data loading note:** `straits.json` lives in `data/` and is bundled at build time via Vite's native JSON import — no async `d3.json()` fetch needed.

## Tasks (Epic Scope)

- [ ] Implement foundational routing and `.layout-2` CSS grid system
- [ ] Scaffold base Vue components (`StraitMap.vue`) and verify static data loading
