# Product

## Register

brand

## Users

Primary order: **Policy practitioners → Researchers → Journalists → General public.**

Two consumption contexts:

1. **Embedded inside a third-party publisher's article** (the BFNA client's main site, currently weakly designed). Reader is mid-article on a desktop monitor in office context, attention split, willing to spend ~60 seconds with one chart.
2. **Hub site itself** (`bfna-indopacific.netlify.app`) — a direct landing for the full set, copy-embed flow, and ongoing portfolio reference.

Job to be done: scan a complex Indo-Pacific question (renewables adoption, maritime chokepoint risk, ASEAN flows) in under a minute and walk away with one defensible takeaway citable in their own writing or briefing.

## Product Purpose

Self-contained interactive data visualizations on Indo-Pacific energy, trade, and geopolitics — engineered to ship inside iframes on third-party publications without losing their voice.

Strategic context: the repo was scaffolded to deliver three commissioned infographics for a BFNA client whose own site has weak design. Every embed shipped on that host site is also a portfolio piece arguing BFNA's design team should be awarded the broader website redesign contract. **Design quality is the pitch.** Cutting corners to harmonize with the host's aesthetic would defeat the strategic premise.

Success = (a) every infographic stands at editorial-magazine quality even when reduced to a 1280×800 frame inside an unrelated article, and (b) the client moves to award the broader website contract on the strength of this work.

## Brand Personality

**Authoritative. Cinematic. Atmospheric.**

Voice: think-tank gravitas without the dry-PDF stiffness. Confident framing, restrained chrome, deep moody surfaces that suggest depth and consequence — not infographic-blog cheerfulness, not dashboard ergonomics. The BFNA mark stays visible at all times; identity is never delegated to the host page.

## Anti-references

- **Tableau dashboards.** Chartjunk legends, dropdown filters as primary UI, slate-blue corporate skin, no narrative spine. Explicitly named by the team as the thing this must not feel like.
- **Generic think-tank PDF infographics.** Flat icons, pie charts, "key findings" bullet callouts.
- **SaaS marketing landing-page clichés.** Hero-metric template (big number / small label / gradient accent), identical card grids, glassmorphism as default decoration.
- **The host publisher's own visual language.** Surrendering to it defeats the strategic premise.

## Design Principles

1. **Design carries the pitch.** Every embedded infographic is a sales artifact for the BFNA full-site contract. Visual integrity outranks ease of authoring, throughput, and host-page harmony.
2. **Contained, not constrained.** A 1280×800 iframe is a stage, not a cage — within it the work stays cinematic. Atmosphere (gradients, particles, motion) is non-negotiable; trim density before trimming mood.
3. **One takeaway, defensibly sourced.** Each infographic earns one citable claim a policy reader can carry into their own writing. The footer source link is mandatory chrome, not optional.
4. **Landscape is the canon.** The 16:9 master grid is the design surface. Mobile/portrait gets a respectful redirect (rotate overlay), never a degraded shrink-to-fit.
5. **BFNA mark always visible.** The host page belongs to someone else. The footer logo and source line mark this content as BFNA's, every time.

## Accessibility & Inclusion

WCAG 2.1 AA target.

- Reduced-motion support is non-negotiable. Particle systems, FLIP zoom transitions, GSAP intros, and swipe slides already gate on `prefers-reduced-motion: reduce` — maintain in all new infographics.
- Keyboard parity for the Strait map (selection + navigation across straits) is the highest-risk surface. Route-driven selection helps; verify focus management on the detail panel and on swipe transitions.
- Text on the dark navy gradient must hit AA contrast (4.5:1 body, 3:1 large display). The `rgba(255,255,255, α)` ladder ranges 0.4–1.0; α ≤ 0.6 fails AA at body sizes — keep those tiers confined to ornamental labels.
- Landscape-only constraint is announced via `RotateDeviceOverlay` rather than silently breaking on portrait. Keep that pattern for any new infographic.
- Color is never the sole carrier of meaning in any chart (cargo type, threat tier, party affiliation). Pair with shape, position, or label.
