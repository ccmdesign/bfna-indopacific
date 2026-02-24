# BF-9: Phase 7 — Calibration & Polish

| Field       | Value                          |
| ----------- | ------------------------------ |
| Identifier  | BF-9                           |
| Status      | Backlog                        |
| Priority    | High                           |
| Team        | BFNA                           |
| Created by  | Claudio Mendonca               |
| Created at  | 2026-02-22                     |
| Branch      | `claudio/bf-9-phase-7-calibration-polish` |
| Linear URL  | <https://linear.app/varro/issue/BF-9/phase-7-calibration-and-polish> |

---

- [ ] Fine-tune per-strait zoom config values (`scale`, `translateX`, `translateY`) for all 6 straits
- [ ] **Art direction alignment** — apply shared visual identity from the renewables infographic:
  - Background: `linear-gradient(#0D0D0D 5%, #022640 105%)` + blue radial glow at top
  - Typography: Encode Sans + fluid `--size-*` custom properties throughout
  - Detail panel: glassmorphism — `background: rgba(2, 38, 64, 0.95)`, `backdrop-filter: blur(8px)`, `border: 1px solid rgba(255,255,255,0.15)`, `border-radius: 12px`
  - Particle colors: 60%-saturation HSL palette — containers `hsl(218, 60%, 58%)`, tankers `hsl(34, 60%, 50%)`, dry bulk `hsl(186, 60%, 50%)`
  - UI controls (slider, toggle): dark theme, labels at `rgba(255,255,255,0.5)` matching axis label treatment
  - Footer: source attribution left, BFNA logo right, `background: rgba(0,0,0,0.2)`, `height: 4rem`
- [ ] Typography pass — fluid `--size-*` tokens applied to panel and controls
- [ ] Source attribution footer + methodology link (same layout as renewables)
- [ ] `RotateDeviceOverlay` wired up for mobile portrait (reuse existing component)
- [ ] Cross-browser check (Chrome, Safari, Firefox)
- [ ] Performance audit at 240 particles on a mid-range device

## Tasks (Epic Scope)

- [ ] Fine-tune coordinate calibrations and strait zoom states
- [ ] Apply art direction and style tokens (typography, glassmorphism, HSL particle palette)
- [ ] Finalize UI details (footer, rotation overlay) and conduct cross-browser performance audit
