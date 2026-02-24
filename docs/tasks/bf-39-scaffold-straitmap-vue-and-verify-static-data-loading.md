# BF-39: Scaffold StraitMap.vue and verify static data loading

| Field       | Value                          |
| ----------- | ------------------------------ |
| Identifier  | BF-39                          |
| Status      | Backlog                        |
| Priority    | Urgent                           |
| Team        | BFNA                           |
| Project     | BF-3: Phase 1 — Scaffolding |
| Created by  | Claudio Mendonca               |
| Created at  | 2026-02-24                     |
| Branch      | `claudio/bf-39-scaffold-straitmapvue-and-verify-static-data-loading` |
| Linear URL  | <https://linear.app/varro/issue/BF-39/scaffold-straitmapvue-and-verify-static-data-loading> |

---

Create `components/StraitMap.vue` with data loading only — static import `import straitsData from '~/data/straits.json'` in `<script setup>`, log to console to verify. Vite native JSON import, no async `d3.json()` needed.
