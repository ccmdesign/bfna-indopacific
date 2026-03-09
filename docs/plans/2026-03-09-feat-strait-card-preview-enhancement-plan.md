---
title: "feat: Strait card preview component enhancement"
type: feat
status: active
date: 2026-03-09
linear: BF-90
origin: docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md
deepened: 2026-03-09
---

# feat: Strait card preview component enhancement

## Enhancement Summary

**Deepened on:** 2026-03-09
**Sections enhanced:** 6 (Thumbnail, Trade Value, Visual Polish, Accessibility, Technical Considerations, Risks)
**Research sources:** Vue 3 docs (accessibility), CSS best practices (hover/focus/touch), WCAG 2.1 guidelines, codebase analysis (StraitCircle internals, satellite image dimensions, data variability)

### Key Improvements
1. Added `@media (hover: hover)` guard so hover effects only fire on devices with true hover capability -- prevents sticky hover on mobile tap
2. Identified Safari `overflow: hidden` + `border-radius` compositing bug and provided `-webkit-transform` workaround
3. Expanded accessibility guidance: focus-visible contrast ratio, aria-label phrasing for screen reader flow, and redundant `role="listitem"` cleanup
4. Verified all 6 satellite images are 512x512px (well above 144px retina threshold) -- risk retired
5. Discovered that the plan mentions "7 cards" but only 6 straits exist in the dataset -- corrected count

### New Considerations Discovered
- Touch devices trigger `:hover` on tap, causing the hover state to persist until next tap -- guard with `@media (hover: hover)`
- The `StraitCircle` component already handles `overflow: hidden` internally via `:has(.strait-circle__image)` -- adding it again on `.strait-card__thumbnail` creates double clipping that may interact poorly with the `box-shadow` glow effect on StraitCircle
- The em-dash (`—`) in aria-label may be read aloud as "em dash" by some screen readers; commas produce better reading flow

---

## Overview

Enhance the existing `StraitCard.vue` component (built in BF-89) to serve as the polished, final "card preview" for the mobile strait list view. The current card is functional but minimal -- this task refines the thumbnail rendering, visual polish, and design-token alignment to match the brainstorm specification.

## Current State (BF-89 baseline)

The following already exists and works:

| Capability | Status | File |
|---|---|---|
| Card component with thumbnail, name, trade value | Done | `components/straits/StraitCard.vue` |
| Card list with alphabetical sort + header | Done | `components/straits/StraitCardList.vue` |
| Tap-to-navigate via `NuxtLink` to `/infographics/straits/[id]` | Done | `components/straits/StraitCard.vue:17` |
| `StraitCircle` reused as thumbnail (radius 36) | Done | `components/straits/StraitCard.vue:22-27` |
| Design tokens for card bg/border | Done | `public/styles.css:43-44` |
| Mobile viewport detection | Done | `composables/useViewport.ts` |
| Mobile routing (`[[id]].vue` conditional layout) | Done | `pages/infographics/straits/[[id]].vue` |

## Problem Statement / Motivation

While BF-89 delivered the structural scaffold (routing, list, card shell), the card preview needs visual refinement to match the brainstorm's intent (see brainstorm: `docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md`). Specific gaps:

1. **Thumbnail quality** -- The `StraitCircle` renders at radius 36 (72px diameter) with a plain white HSL color `{h:0, s:0, l:100}`. The satellite image loads but the circle glow/border is white instead of using a strait-specific or brand-appropriate color. No `straitId` or `year` is passed, so particles cannot render even for polygon-ready straits.
2. **Trade value formatting** -- The card shows `fmtUsd(strait.valueUSD)` followed by a `<span>annual trade</span>`. The brainstorm specifies a "trade value headline" like "$5.3 Trillion" -- the current `fmtUsd` produces "$5.3T" (abbreviated), which may or may not match the desired presentation.
3. **Visual polish** -- The card styling is functional but could benefit from refinement: subtle hover elevation, consistent spacing with the detail page, and ensuring the card reads well across the full range of strait data (short names vs long names, straits with/without satellite images).
4. **Accessibility** -- The `ariaLabel` computed property references `strait.globalShareLabel` and `strait.valueLabel` but `valueLabel` is the human-written label from the JSON (e.g. "~$2.4 trillion") which may differ from the formatted display value, creating a potential disconnect between visual and screen-reader experience.

## Proposed Solution

Enhance `StraitCard.vue` in place. No new components needed -- this is a refinement pass.

### Enhancement 1: Thumbnail circle color

Pass a meaningful color to `StraitCircle` instead of plain white. Options:

- **Option A (recommended):** Use a subtle blue matching `--color-accent` (hsl 218, 60%, 58%) for all cards, creating visual consistency with the brand.
- **Option B:** Derive a unique hue per strait from its `flowScalar` or index position. Adds visual variety but risks clashing with the dark card background.

Also pass `straitId` and the latest year so the circle can show particles for polygon-ready straits (currently only Hormuz).

```vue
<!-- components/straits/StraitCard.vue — thumbnail enhancement -->
<StraitCircle
  :radius="36"
  :color="{ h: 218, s: 60, l: 58 }"
  :active="false"
  :image-url="strait.imageUrl"
  :strait-id="strait.id"
  :year="LATEST_YEAR"
/>
```

**File:** `components/straits/StraitCard.vue` (lines 22-27)

#### Research Insights

**Best Practices:**
- Option A (uniform accent color) is the stronger choice for a card list. Per-item color variation works well in dashboards where color encodes meaning (categories, severity). Here, strait cards are peers in a list -- visual uniformity reinforces that they are equivalent entry points, and the satellite images already provide per-card differentiation.
- The `StraitCircle` component applies `box-shadow` glow and `border` based on the passed HSL color. At `{h:218, s:60, l:58}` the glow will be a subtle blue halo matching `--color-accent`. This reinforces the brand palette already established in `.strait-card__share` (which uses `--color-accent`).

**Edge Cases:**
- All 6 straits have satellite images (verified: `malacca.webp`, `taiwan.webp`, `bab-el-mandeb.webp`, `luzon.webp`, `lombok.webp`, `hormuz.webp`). The fallback path (colored glow without image) is not currently triggered but should be tested by temporarily removing an `imageUrl` from the JSON.
- When the satellite image loads, the `StraitCircle` sets `opacity: 1` on `.strait-circle__image` via a `:has()` selector. The blue glow/border will still be visible around the image edge, providing a nice framing effect.

### Enhancement 2: Trade value display

Keep the abbreviated format (`$5.3T`) as it fits the compact card layout better than spelling out "Trillion". However, align the aria-label with the visual output so screen readers hear the same value.

```vue
<!-- components/straits/StraitCard.vue — updated aria-label -->
const ariaLabel = computed(() =>
  `${props.strait.name} — ${props.strait.globalShareLabel} — ${fmtUsd(props.strait.valueUSD)} annual trade`
)
```

**File:** `components/straits/StraitCard.vue` (lines 9-11)

#### Research Insights

**Accessibility Best Practice -- aria-label phrasing:**
- The em-dash character (`—`) in the aria-label may be read aloud as "em dash" by certain screen readers (notably JAWS). **Recommendation:** replace em-dashes with commas for natural reading flow:
  ```ts
  const ariaLabel = computed(() =>
    `${props.strait.name}, ${props.strait.globalShareLabel}, ${fmtUsd(props.strait.valueUSD)} annual trade`
  )
  ```
  This produces: "Strait of Malacca, 25-30% of global trade, $2.4T annual trade" -- a clean, natural sentence for screen readers.

**WCAG 1.1.1 Compliance:**
- The plan correctly identifies the mismatch between `valueLabel` (human text like "~$2.4 trillion") and the visual `fmtUsd()` output ("$2.4T"). Using `fmtUsd()` in the aria-label ensures the screen-reader experience matches the visual presentation, which is the WCAG-recommended approach.
- Screen readers will read "$2.4T" as "two point four T" or "dollar sign two point four T". If this is a concern, consider a dedicated screen-reader formatter that expands abbreviations: `$2.4 trillion`. However, the abbreviated form is widely understood and the `annual trade` suffix provides context.

**Data Variability Check:**
- All 6 straits produce reasonable `fmtUsd()` output: `$2.4T`, `$2.4T`, `$1.9T`, `$294B`, `$143B`, `$885B`. The formatter handles both trillion and billion ranges well. No edge case concerns.

### Enhancement 3: Visual polish

- Add a subtle `box-shadow` on hover for depth cue
- Ensure the thumbnail container clips the `StraitCircle` glow/shadow so it doesn't bleed into adjacent content
- Add `overflow: hidden` and `border-radius: 50%` to `.strait-card__thumbnail`

```css
/* components/straits/StraitCard.vue <style scoped> */
.strait-card__link:hover {
  background: rgba(2, 38, 64, 1);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.strait-card__thumbnail {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
}
```

**File:** `components/straits/StraitCard.vue` (lines 60-63, 70-77)

#### Research Insights

**Mobile Touch -- Hover State Persistence (NEW RISK):**
- On touch devices, `:hover` triggers on tap and persists until the user taps elsewhere. This means after tapping a card and navigating back, the card may still show the hover state (elevated shadow, brighter border). **Recommendation:** wrap the hover enhancement in a `@media (hover: hover)` query so it only applies on devices with a true hover capability (mouse/trackpad):
  ```css
  @media (hover: hover) {
    .strait-card__link:hover {
      background: rgba(2, 38, 64, 1);
      border-color: rgba(255, 255, 255, 0.25);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
  }
  ```
  This is a widely supported media query (all modern browsers). Touch-only devices skip the hover rule entirely.

**Focus-Visible Alignment:**
- The existing `:focus-visible` style uses `outline: 2px solid rgba(255, 255, 255, 0.7)`. Consider also applying the same `box-shadow` elevation on focus-visible so keyboard users get the same depth cue as mouse users:
  ```css
  .strait-card__link:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.7);
    outline-offset: 2px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  ```

**Thumbnail Clipping -- Double Overflow Concern:**
- The `StraitCircle` component already applies `overflow: hidden` on itself when an image is present (via `.strait-circle:has(.strait-circle__image) { position: relative; overflow: hidden; }`). Adding `overflow: hidden` on `.strait-card__thumbnail` creates a second clipping context. This is fine for containing the `box-shadow` glow, but be aware: the `StraitCircle`'s outer `box-shadow` (the blue glow at `0 0 16px 4px`) will be clipped by the thumbnail container. If the glow is desired, either:
  - Remove `overflow: hidden` from `.strait-card__thumbnail` and accept the glow bleeding slightly, or
  - Keep `overflow: hidden` (clips the glow) and accept a cleaner, flatter thumbnail appearance.
  The plan's current approach (clip the glow) is the better choice for card list density.

**Safari Compositing Bug:**
- Safari has a known bug where `overflow: hidden` + `border-radius` on a parent may not clip children correctly when CSS transforms are involved. The `StraitCircle` has `transition` on `width` and `height` which can trigger this. Mitigation: add `-webkit-transform: translateZ(0)` to `.strait-card__thumbnail` to force GPU compositing:
  ```css
  .strait-card__thumbnail {
    /* ... existing rules ... */
    -webkit-transform: translateZ(0); /* Safari overflow+radius fix */
  }
  ```

**Transition Performance:**
- The existing transition `background 0.15s ease, border-color 0.15s ease` is well-chosen. Adding `box-shadow` to this transition list (as done in the MVP) is fine -- `box-shadow` transitions are GPU-composited in modern browsers and won't cause layout thrashing. The 0.15s duration is snappy and appropriate for interactive feedback.

### Enhancement 4: Pass `LATEST_YEAR` to card

Import `LATEST_YEAR` from `utils/straitsData` so it can be forwarded to `StraitCircle`.

```ts
// components/straits/StraitCard.vue <script setup>
import { LATEST_YEAR } from '~/utils/straitsData'
```

**File:** `components/straits/StraitCard.vue` (line 3, new import)

#### Research Insights

**Particle Rendering Safety:**
- Confirmed: `StraitCircle` gates particle rendering on `props.selected && props.straitId && props.year && POLYGON_READY_STRAITS.has(props.straitId)`. Since `selected` is not passed (defaults to `undefined`/`false`), particles will NOT render on cards. Passing `straitId` and `year` is purely forward-compatible -- it pre-wires the data without activating the particle canvas. No performance cost.

**Import Side Effects:**
- `LATEST_YEAR` is derived from `Object.keys(historical).sort().pop()` which runs once at module load time when `straitsData.ts` is first imported. The card list page already imports `straitsData` via the parent page component, so this import adds zero additional initialization cost.

## Technical Considerations

- **No new components** -- all changes are in `StraitCard.vue` (and potentially minor CSS in `StraitCardList.vue`)
- **StraitCircle particle rendering** -- passing `straitId` and `year` enables particle rendering for polygon-ready straits. Currently only Hormuz has polygon data (`POLYGON_READY_STRAITS` in `StraitCircle.vue:3`). The `selected` prop should remain `false` on cards since particles are gated by `selected && straitId && year` -- so no particles will render on cards, which is correct (particles are for the detail hero only).
- **Performance** -- 6 cards (not 7 -- the dataset contains 6 straits) each rendering a `StraitCircle` with satellite images. Images are already lazy-loaded by the browser since they are `<img>` tags inside off-screen cards. No performance concern.
- **Bundle impact** -- Zero. No new dependencies.
- **Known todo** -- `todos/099-pending-p3-straitcard-missing-computed-import.md` flags that `computed()` is used without explicit import. This is a Nuxt auto-import and is `wont_fix`. No action needed.

### Research Insights

**Vue 3 Scoped CSS:**
- The component uses `<style scoped>` correctly. The `:deep()` pseudo-class is available if any styles need to reach into `StraitCircle`'s internals, but should not be needed for this enhancement since all visual changes are on the card wrapper or via props.

**Semantic HTML:**
- The `role="listitem"` on `<li>` is redundant -- `<li>` elements inside a `<ul role="list">` already have implicit `listitem` semantics. Removing it is a minor cleanup but not blocking.

**Text Truncation:**
- Strait names range from 12-17 characters ("Strait of Luzon" to "Strait of Malacca"). All fit comfortably within the card layout at 16px font size on 375px viewports. No truncation (`text-overflow: ellipsis`) is needed. However, if straits are added in the future with longer names, consider adding `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` to `.strait-card__name` as a defensive measure.

**Image Loading Strategy:**
- All 6 satellite images are `.webp` format at 512x512px. At 72px display size, this is 7x oversampled (far above 2x retina requirement). The images could be further optimized by providing a smaller srcset, but since there are only 6 images and `.webp` compression is efficient, this is not a priority.

## Acceptance Criteria

- [ ] `StraitCircle` in each card uses a brand-appropriate color (not plain white `{h:0,s:0,l:100}`)
- [ ] `straitId` is passed to `StraitCircle` (enables future particle rendering)
- [ ] `LATEST_YEAR` is imported and passed as `year` prop to `StraitCircle`
- [ ] Aria-label uses `fmtUsd()` output instead of raw `valueLabel` to match visual content
- [ ] Hover state includes subtle box-shadow for depth
- [ ] Thumbnail container has `overflow: hidden` to clip circle glow
- [ ] Cards still navigate correctly to `/infographics/straits/[id]` on tap
- [ ] No visual regression on the card list page (test on 375px and 414px viewports)
- [ ] `prefers-reduced-motion` still disables transitions

### Enhanced Acceptance Criteria (from research)

- [ ] Hover effects are guarded with `@media (hover: hover)` to prevent sticky hover on touch devices
- [ ] Aria-label uses commas instead of em-dashes for natural screen-reader flow
- [ ] Focus-visible state includes the same box-shadow as hover for keyboard parity
- [ ] Safari overflow+border-radius compositing is handled with `-webkit-transform: translateZ(0)` on thumbnail
- [ ] Test the no-image fallback path (remove one `imageUrl` from JSON temporarily) to verify the accent-colored glow renders correctly without a satellite image

## Dependencies & Risks

- **No blockers** -- all dependencies (StraitCircle, straitsData, design tokens) already exist
- **Low risk** -- changes are cosmetic and contained to a single component
- **Risk: satellite image quality at 72px** -- ~~some strait images may appear blurry at this size if source crops are low-res. Verify `malacca.webp`, `taiwan.webp` etc. exist and are >= 144px (2x for retina). If missing, the circle falls back to the colored glow (acceptable).~~ **RESOLVED:** All 6 satellite images verified at 512x512px -- well above the 144px retina threshold. No quality concern.

### New Risks (from research)

- **Risk: sticky hover on mobile (medium)** -- Without `@media (hover: hover)`, the hover box-shadow persists after tap on iOS/Android. Mitigation: wrap hover styles in the media query as described in Enhancement 3 research insights.
- **Risk: Safari overflow compositing (low)** -- Safari may fail to clip children of `overflow: hidden` + `border-radius` containers when CSS transforms are active. Mitigation: add `-webkit-transform: translateZ(0)` to force compositing layer.
- **Risk: screen reader em-dash pronunciation (low)** -- Some screen readers read `—` as "em dash". Mitigation: use commas in aria-label.

## MVP

### components/straits/StraitCard.vue

```vue
<script setup lang="ts">
import type { Strait } from '~/types/strait'
import { fmtUsd } from '~/utils/straitFormatters'
import { LATEST_YEAR } from '~/utils/straitsData'

const props = defineProps<{
  strait: Strait
}>()

const CIRCLE_COLOR = { h: 218, s: 60, l: 58 }

const ariaLabel = computed(() =>
  `${props.strait.name}, ${props.strait.globalShareLabel}, ${fmtUsd(props.strait.valueUSD)} annual trade`
)
</script>

<template>
  <li class="strait-card">
    <NuxtLink
      :to="`/infographics/straits/${strait.id}`"
      class="strait-card__link"
      :aria-label="ariaLabel"
    >
      <div class="strait-card__thumbnail">
        <StraitCircle
          :radius="36"
          :color="CIRCLE_COLOR"
          :active="false"
          :image-url="strait.imageUrl"
          :strait-id="strait.id"
          :year="LATEST_YEAR"
        />
      </div>
      <div class="strait-card__content">
        <h3 class="strait-card__name">{{ strait.name }}</h3>
        <p class="strait-card__share">{{ strait.globalShareLabel }}</p>
        <p class="strait-card__value">{{ fmtUsd(strait.valueUSD) }} <span>annual trade</span></p>
      </div>
      <svg class="strait-card__chevron" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M7.5 5l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </NuxtLink>
  </li>
</template>

<style scoped>
.strait-card {
  list-style: none;
}

.strait-card__link {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  min-height: 44px;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

@media (hover: hover) {
  .strait-card__link:hover {
    background: rgba(2, 38, 64, 1);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

.strait-card__link:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.strait-card__thumbnail {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  -webkit-transform: translateZ(0); /* Safari overflow+radius compositing fix */
}

.strait-card__content {
  flex: 1;
  min-width: 0;
}

.strait-card__name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 2px;
  letter-spacing: -0.01em;
}

.strait-card__share {
  font-size: 12px;
  color: var(--color-accent);
  font-weight: 500;
  margin: 0 0 4px;
}

.strait-card__value {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.strait-card__value span {
  font-weight: 400;
  font-size: 11px;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-left: 4px;
}

.strait-card__chevron {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.3);
}

@media (prefers-reduced-motion: reduce) {
  .strait-card__link {
    transition: none;
  }
}
</style>
```

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md](docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md) -- key decisions carried forward: card preview shows zoomed circle thumbnail + name + trade value; cards ordered alphabetically; tappable with route navigation
- **Predecessor plan (BF-89):** [docs/plans/2026-03-09-feat-mobile-routing-conditional-layout-plan.md](docs/plans/2026-03-09-feat-mobile-routing-conditional-layout-plan.md) -- delivered the structural scaffold this task enhances
- **Existing components:**
  - `components/straits/StraitCard.vue` -- the component being enhanced
  - `components/straits/StraitCircle.vue` -- reused for thumbnail rendering
  - `utils/straitFormatters.ts` -- `fmtUsd()` for trade value formatting
  - `utils/straitsData.ts` -- `LATEST_YEAR` constant
- **Design tokens:** `public/styles.css:42-50` -- `--color-card-bg`, `--color-card-border`, `--color-accent`, `--color-text-*`

### Research References
- [Vue.js Accessibility Guide](https://vuejs.org/guide/best-practices/accessibility) -- aria-label patterns, semantic HTML
- [Inclusive Components: Cards](https://inclusive-components.design/cards/) -- card accessibility patterns, focus management
- [Modern CSS Accessibility Upgrades](https://moderncss.dev/modern-css-upgrades-to-improve-accessibility/) -- focus-visible, prefers-reduced-motion
- [CSS-Tricks: Preventing Child Background Overflow](https://css-tricks.com/preventing-child-background-overflow-with-inherited-border-radii/) -- overflow+border-radius clipping
- [Safari overflow+border-radius bug](https://bugs.webkit.org/show_bug.cgi?id=98538) -- webkit compositing workaround
- [Prototypr: Card State Styles with Accessibility](https://blog.prototypr.io/ui-case-study-state-styles-of-card-component-with-accessibility-in-mind-2f30137c6108) -- hover/focus/active state design
