# BF-6: Phase 4 — Vue State & Controls

| Field       | Value                          |
| ----------- | ------------------------------ |
| Identifier  | BF-6                           |
| Status      | Backlog                        |
| Priority    | High                           |
| Team        | BFNA                           |
| Created by  | Claudio Mendonca               |
| Created at  | 2026-02-22                     |
| Branch      | `claudio/bf-6-phase-4-vue-state-controls` |
| Linear URL  | <https://linear.app/varro/issue/BF-6/phase-4-vue-state-and-controls> |

---

Independent of Phase 3 — can be built in parallel.

- [ ] Year slider `<input type="range" min="2019" max="2025">` bound to reactive ref
- [ ] Metric toggle (tonnes / vessels) as reactive ref
- [ ] Particle system reacts to year change — recalculates counts, smooth fade-in/out (no abrupt snap)
- [ ] Strait click handler → sets `selectedStrait`, triggers CSS zoom
- [ ] Click-away / close dismisses selection, resets transform

**Editorial note:** Bab-el-Mandeb drops ~65% in 2024 due to Houthi attacks — this should be visually obvious when scrubbing the slider.

---

**Note on Track B (3D Lens Fallback):**
If the 3D Track B is successful, the standard year/metric toggles developed here will be repurposed to drive the 3D scene (zoom dives into the lens instead of standard CSS transforms).

## Tasks (Epic Scope)

- [ ] Build global timeline controls (year slider and metric toggle)
- [ ] Wire map interactivity (strait click zoom, click-away reset)
- [ ] Bind particle rendering loop to reactive state with smooth transitions
