---
name: BFNA Indo-Pacific
description: Editorial data visualizations on Indo-Pacific energy, trade, and geopolitics, engineered to ship inside iframes without losing their voice.
colors:
  ink: "#0D0D0D"
  abyss: "#022640"
  bureau: "#FFFFFF"
  meridian: "hsl(218, 60%, 58%)"
  coral-alert: "hsl(348, 80%, 72%)"
  tanker: "hsl(348, 60%, 55%)"
  bulk: "hsl(34, 60%, 50%)"
  card-surface: "rgba(2, 38, 64, 0.95)"
  scrim-soft: "rgba(0, 0, 0, 0.30)"
typography:
  display:
    fontFamily: "Encode Sans, system-ui, sans-serif"
    fontSize: "clamp(1.866rem, 1.381rem + 3.5vw, 5.052rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0"
  headline:
    fontFamily: "Encode Sans, system-ui, sans-serif"
    fontSize: "clamp(1.555rem, 1.193rem + 1.611vw, 2.441rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontFamily: "Encode Sans, system-ui, sans-serif"
    fontSize: "clamp(1.08rem, 0.883rem + 0.877vw, 1.5625rem)"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: "Encode Sans, system-ui, sans-serif"
    fontSize: "clamp(0.75rem, 0.648rem + 0.455vw, 1rem)"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.01em"
  label:
    fontFamily: "Encode Sans, system-ui, sans-serif"
    fontSize: "clamp(0.625rem, 0.553rem + 0.318vw, 0.8rem)"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.02em"
rounded:
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "12px"
  pill: "9999px"
  circle: "50%"
spacing:
  3xs: "clamp(0.1875rem, 0.162rem + 0.114vw, 0.25rem)"
  2xs: "clamp(0.375rem, 0.324rem + 0.227vw, 0.5rem)"
  xs: "clamp(0.5625rem, 0.486rem + 0.341vw, 0.75rem)"
  s: "clamp(0.75rem, 0.648rem + 0.455vw, 1rem)"
  m: "clamp(1.125rem, 0.972rem + 0.682vw, 1.5rem)"
  l: "clamp(1.5rem, 1.295rem + 0.909vw, 2rem)"
  xl: "clamp(2.25rem, 1.943rem + 1.364vw, 3rem)"
  2xl: "clamp(3rem, 2.591rem + 1.818vw, 4rem)"
  3xl: "clamp(4.5rem, 3.886rem + 2.727vw, 6rem)"
components:
  card-infographic:
    backgroundColor: "{colors.card-surface}"
    textColor: "{colors.bureau}"
    rounded: "{rounded.lg}"
    padding: "{spacing.m}"
  button-secondary:
    backgroundColor: "rgba(255, 255, 255, 0.08)"
    textColor: "rgba(255, 255, 255, 0.85)"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  button-secondary-hover:
    backgroundColor: "rgba(255, 255, 255, 0.15)"
    textColor: "{colors.bureau}"
  button-secondary-success:
    backgroundColor: "rgba(34, 197, 94, 0.20)"
    textColor: "rgba(34, 197, 94, 0.95)"
    rounded: "{rounded.md}"
  button-secondary-error:
    backgroundColor: "rgba(239, 68, 68, 0.20)"
    textColor: "rgba(239, 68, 68, 0.95)"
    rounded: "{rounded.md}"
---

# Design System: BFNA Indo-Pacific

## 1. Overview

**Creative North Star: "The Deep Watch."**

A think-tank reading-room rendered as a moonless sea. Surfaces are abyssal navy fading into ink; light arrives through restricted apertures — a single accent blue, a coral alert when something reads as risk, white text held at editorial weight. The mood is satellite-feed-at-2am, not dashboard-at-9am: somebody is paying attention, and the reader is briefly let inside that posture.

Density is restrained on purpose. Each infographic occupies a 16:9 stage and earns one defensible takeaway. Atmosphere — radial blue mix-blend overlays, particle drifts across the Strait map, GSAP-driven intros, FLIP zoom into detail — is structural, not garnish; without it the dark surface collapses into "just a chart on black." The system explicitly rejects Tableau corporate slate, generic think-tank PDF flatness, SaaS hero-metric templates, and the host publisher's softer house style. **The infographic must feel like a guest essay in a stronger magazine, not a widget in someone else's CMS.**

**Key Characteristics:**
- Two-tone vertical gradient (`ink` → `abyss`) anchors every embed; never a flat solid.
- One accent (`meridian`) carries selection, lines, and the container-cargo role; restraint is the rule, not the exception.
- Single typeface (Encode Sans) at 400 / 600 only — hierarchy lives in scale and color, not in weight sprawl.
- Motion is exponential ease-out, never elastic; respects `prefers-reduced-motion`.
- Landscape canon at 1280×800; portrait gets a respectful rotate overlay rather than a shrunk fallback.

## 2. Colors

A nocturnal palette: two near-black neutrals do the heavy structural work, one saturated blue carries voice, two warm signals (coral, amber) appear only when data demands them.

### Primary

- **Meridian Blue** (`hsl(218, 60%, 58%)`): the single voice color. Carries selection, axis emphasis, line strokes in the Renewables chart, the container-cargo segment in stacked bars. Rare on purpose — never used as a background tint, never used decoratively. ≤10% of any given screen.

### Secondary

- **Coral Alert** (`hsl(348, 80%, 72%)` text on `hsl(348, 60%, 55%, 0.10)` field, `hsl(348, 60%, 55%, 0.20)` border): threat tier, warning copy, tanker-cargo segment. Reserved for content that genuinely reads as risk in Indo-Pacific framing — not for stylistic emphasis.

### Tertiary

- **Bulk Amber** (`hsl(34, 60%, 50%)`): dry-bulk cargo segment in the Strait map. Currently a chart-only role; do not promote to UI chrome without explicit reason.

### Neutral

- **Ink** (`#0D0D0D`): top of the page gradient; the deepest near-black. Tinted toward warm neutral, not pure `#000`.
- **Abyss** (`#022640`): bottom of the page gradient. Deep navy; carries the Indo-Pacific maritime cue without naming it.
- **Card Surface** (`rgba(2, 38, 64, 0.95)`): infographic card on the hub page. Abyss with 5% scrim, sitting over a backdrop blur.
- **Bureau White** (`#FFFFFF`) at α 1.0 / 0.85 / 0.6 / 0.4 / 0.15 / 0.06 / 0.04: the entire text + border + subtle-surface ladder. Higher α for body copy; α ≤ 0.6 reserved for ornamental labels.

### Named Rules

**The One Voice Rule.** Meridian is the only saturated color permitted as UI chrome. If a second accent enters a screen, justify it as data, not decoration.

**The Tinted-Black Rule.** Neither `#000` nor `#fff` ship as raw values. Ink and Bureau both sit on the warm side of pure; the gradient gives away the temperature.

**The Mix-Blend Halo Rule.** The radial `rgba(0, 0, 200, 0.20)` overlay at `50% 0%` with `mix-blend-mode: color` is part of the page surface, not an effect. Do not remove it; do not stack a second blend mode on top of it.

## 3. Typography

**Display Font:** Encode Sans (with `system-ui, sans-serif` fallback)
**Body Font:** Encode Sans
**Label Font:** Encode Sans

**Character:** A single humanist sans across the entire system. Weight is binary — 400 for body, 600 for everything that asks for attention. Hierarchy is carried by scale (Utopia clamp ladder, ≥1.25 ratio between steps) and by the white-on-navy α ladder, never by a third weight. The constraint is the discipline.

### Hierarchy

- **Display** (600, `clamp(1.866rem → 5.052rem)`, line-height 1.1): the infographic title set against the gradient. Hero typography for the renewables surface. One per screen.
- **Headline** (600, `clamp(1.555rem → 2.441rem)`, line-height 1.2): hub page H1 ("BFNA Indo-Pacific") and section openers within an infographic.
- **Title** (600, `clamp(1.08rem → 1.5625rem)`, line-height 1.3): card titles, strait names, panel headers.
- **Body** (400, `clamp(0.75rem → 1rem)`, line-height 1.5, letter-spacing 0.01em): description copy, prose. Cap line length at 65–75ch.
- **Label** (600, `clamp(0.625rem → 0.8rem)`, letter-spacing 0.02em): axis labels, source lines, meta chrome, small caps.

### Named Rules

**The Two-Weight Rule.** Encode Sans at 400 and 600 only. Italic is permitted for source-attribution copy (`<em>` in description footers); bold-italic and 700 are forbidden.

**The Display Singular Rule.** One Display element per infographic. If two compete for the role, the second is a Headline.

## 4. Elevation

The system is **flat by default with one structural exception.** The page itself is a layered atmosphere — a vertical gradient, a radial blue mix-blend halo, an additive black scrim — and depth on the page surface lives in those overlays, not in shadows on individual elements. Most infographic chrome (axes, labels, panels, particles) sits flush at z-index 1 over the gradient.

The exception is the hub page's `InfographicCard`, which uses a deep ambient shadow + 8px backdrop-filter blur to read as a discrete artifact lifting off the gradient. That treatment is reserved for the hub's card grid; do not propagate it to in-infographic chrome.

### Shadow Vocabulary

- **Card Ambient** (`box-shadow: 0 8px 32px rgba(0, 0, 0, 0.30)` resting; `0 12px 40px rgba(0, 0, 0, 0.40)` on hover with `translateY(-2px)`): hub-page `InfographicCard` only.
- **Title Drop** (`text-shadow: 0 5px 5px rgba(0, 0, 0, 0.25)`): Display and hub-headline copy over the gradient. Lifts the type off the radial halo.
- **Stacked-Bar Value** (`text-shadow: 0 1px 2px rgba(0, 0, 0, 0.50)`): white numerals laid over saturated stacked-bar segments. Legibility, not effect.

### Named Rules

**The Atmosphere-Not-Stack Rule.** Depth comes from the page gradient + mix-blend halo, not from layered shadows on every element. If a new component is asking for a shadow, ask first whether it should sit at z-index 1 with no shadow at all.

**The Card-Lift Exception.** `box-shadow: 0 8px 32px rgba(0,0,0,0.30)` is the hub card's signature. Do not reuse the same value on dialogs, panels, or in-infographic chrome — it is meant to be unique to the hub.

## 5. Components

### Buttons

- **Shape:** 6px radius (`{rounded.md}`). Pills are forbidden; sharp rectangles are forbidden; this midpoint is the stance.
- **Primary:** the system has no filled primary button. Voice is carried by Meridian on data, not on CTAs.
- **Secondary** (`btn-secondary`, used by `EmbedCodeButton` and the hub's "View Infographic" / "Embed Preview" links): `rgba(255,255,255,0.08)` field, `1px solid rgba(255,255,255,0.20)` border, white text at α 0.85, padding `0.5rem 1.25rem`, font-size `0.875rem`, weight 600.
- **Hover:** field lifts to `rgba(255,255,255,0.15)`, border to `rgba(255,255,255,0.35)`, text to α 1.0. Transition `200ms ease`.
- **Focus:** `outline: 2px solid rgba(255,255,255,0.7)` with 2px offset.
- **Stateful variants** (`EmbedCodeButton`): a green success skin (`rgba(34,197,94,0.20)` field / `0.50` border / `0.95` text) on copy success, red error skin (`rgba(239,68,68,...)`) on failure. Both reuse the secondary geometry.

### Cards / Containers

- **Corner Style:** 12px radius (`{rounded.lg}`).
- **Background:** `rgba(2, 38, 64, 0.95)` over `backdrop-filter: blur(8px)`.
- **Border:** `1px solid rgba(255, 255, 255, 0.15)` resting; `0.30` on hover.
- **Shadow:** Card Ambient (see Elevation).
- **Internal Padding:** `{spacing.m}` (`clamp(1.125rem → 1.5rem)`).
- **Hover behavior:** `translateY(-2px)` with shadow deepening to `0 12px 40px rgba(0,0,0,0.40)`.

### Stacked Bars (signature data primitive)

- **Track:** `width 100%`, `height 24px`, `border-radius 4px` (`{rounded.sm}`), `overflow hidden`.
- **Segments:** flex children, separated by `1px solid rgba(0,0,0,0.30)` for chart-internal definition. Cargo roles map: container = Meridian, dry-bulk = Bulk Amber, tanker = Tanker.
- **Value labels:** `10px / weight 600`, white, `font-variant-numeric: tabular-nums`, with the Stacked-Bar Value text-shadow.
- **Legend:** below the bar, dot + label + count, gap `8px 14px`.

### Strait Circles (signature interactive primitive)

- **Shape:** circle (`{rounded.circle}`), area-scaled by tonnage / vessel count / value via `d3.scaleSqrt` against the latest year's data.
- **Color:** white at varying α — color is not the carrier of meaning here; size and position are.
- **Active state:** clicked circle expands via FLIP transition (clone lifted to `position: fixed`, `z-index: 9999`) into a detail panel; surrounding map zooms out at the same time.

### Footer Chrome

- Single horizontal bar at the bottom (`height 4rem`, `0 2rem` padding, `rgba(0,0,0,0.20)` field).
- Source link (left, α-0.6 white, `0.875rem`, underline on hover) + `EmbedCodeButton` (centered) + BFNA logo SVG (right, max 100px). Required on every published infographic.

### Rotate Device Overlay

- Full-screen overlay shown when viewport is portrait and below the 879px breakpoint. Carries the rotate icon and a one-line instruction. Suppressible per page via `suppressRotateOverlay: true` (used on the hub).

### Named Rules

**The No-Filled-Button Rule.** No filled primary button exists. CTAs are ghost-style secondaries. If a screen feels like it needs a colored CTA, the screen is wrong, not the system.

**The Stacked-Bar Is The Chart Rule.** When a quantitative breakdown across categories is needed, reach for the stacked-bar primitive before reaching for a pie, donut, or grouped bar.

## 6. Do's and Don'ts

### Do:
- **Do** anchor every embed in the `ink → abyss` vertical gradient + radial blue mix-blend halo. The atmosphere is part of the page, not an option.
- **Do** keep Meridian Blue at ≤10% of the surface area on any given infographic.
- **Do** ship every infographic with a footer source link + BFNA logo. The mark stays visible on every host page.
- **Do** use the Utopia clamp ladder (`--size-*`, `--space-*`) for all type and spacing. Mixed scales pollute the rhythm.
- **Do** gate every motion (particles, GSAP intros, FLIP transitions, swipe slides) on `prefers-reduced-motion: reduce`.
- **Do** use `font-variant-numeric: tabular-nums` on every numeric label that participates in alignment.

### Don't:
- **Don't** make this look like a Tableau dashboard. No dropdown filter as primary UI, no slate-blue corporate skin, no chartjunk legend.
- **Don't** ship a generic think-tank PDF aesthetic — flat icons, pie charts, "key findings" bullet callouts.
- **Don't** harmonize with the host publisher's softer house style. Surrendering to it defeats the strategic premise.
- **Don't** use the SaaS hero-metric template (big number / small label / supporting stats / gradient accent).
- **Don't** apply gradient text (`background-clip: text` over a gradient). Single solid color always.
- **Don't** use `border-left` greater than 1px as a colored stripe on cards, panels, or alerts.
- **Don't** introduce a third font weight; 400 / 600 is the system. No 700, no light, no italic outside source attribution.
- **Don't** propagate the hub-card shadow (`0 8px 32px rgba(0,0,0,0.30)`) to in-infographic chrome — it is the hub's signature only.
- **Don't** add a second saturated accent color to UI chrome. Coral and Amber are data-only roles.
- **Don't** ship a portrait fallback for an infographic. Show the rotate overlay; never let a 16:9 design squash to fit.
- **Don't** stack glassmorphism (additional `backdrop-filter: blur` layers) on top of the existing card. One blur per surface.
