# BF-7: Phase 5 — Detail Panel

| Field       | Value                          |
| ----------- | ------------------------------ |
| Identifier  | BF-7                           |
| Status      | Backlog                        |
| Priority    | High                           |
| Team        | BFNA                           |
| Created by  | Claudio Mendonca               |
| Created at  | 2026-02-22                     |
| Branch      | `claudio/bf-7-phase-5-detail-panel` |
| Linear URL  | <https://linear.app/varro/issue/BF-7/phase-5-detail-panel> |

---

Independent — can be built in parallel with Phases 3 & 4.

- [ ] Create `StraitPanel.vue` — overlay panel, slides in from right on CSS transition
- [ ] Display: `name`, `globalShareLabel`, `valueLabel`, `description`
- [ ] Display `keyFacts` as a list, `threats` as tags
- [ ] Proportional bar chart: container/tanker/dryBulk breakdown for selected year (simple SVG or Canvas, ~100px tall)
- [ ] Close / dismiss behavior (close button + click-away)

Panel overlays the map (does not push layout). Data comes from `straits.json` static records + `historical[year]` for the cargo chart.

## Tasks (Epic Scope)

- [ ] Build `StraitPanel.vue` UI shell and layout topography
- [ ] Connect panel data layer (metrics, key facts, threat tags)
- [ ] Implement proportional vessel breakdown bar chart
