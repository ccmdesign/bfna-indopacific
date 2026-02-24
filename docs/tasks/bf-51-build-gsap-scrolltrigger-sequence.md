# BF-51: Build GSAP ScrollTrigger sequence

| Field       | Value                          |
| ----------- | ------------------------------ |
| Identifier  | BF-51                          |
| Status      | Backlog                        |
| Priority    | High                           |
| Team        | BFNA                           |
| Project     | BF-8: Phase 6 — GSAP Intro |
| Created by  | Claudio Mendonca               |
| Created at  | 2026-02-24                     |
| Branch      | `claudio/bf-51-build-gsap-scrolltrigger-sequence` |
| Linear URL  | <https://linear.app/varro/issue/BF-51/build-gsap-scrolltrigger-sequence> |

---

Configure GSAP + ScrollTrigger in the component. Initial state: map hidden (`opacity: 0`, slight scale down). GSAP timeline: map fades + scales in. Scroll snap: pins the infographic once revealed (one GSAP timeline, not per-strait scroll sequence). Guard: particles don't start looping until intro completes.
