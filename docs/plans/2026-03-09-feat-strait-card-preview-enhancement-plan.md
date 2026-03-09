---
title: "feat: Strait card preview component enhancement"
type: feat
status: active
date: 2026-03-09
linear: BF-90
origin: docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md
---

# feat: Strait card preview component enhancement

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

### Enhancement 2: Trade value display

Keep the abbreviated format (`$5.3T`) as it fits the compact card layout better than spelling out "Trillion". However, align the aria-label with the visual output so screen readers hear the same value.

```vue
<!-- components/straits/StraitCard.vue — updated aria-label -->
const ariaLabel = computed(() =>
  `${props.strait.name} — ${props.strait.globalShareLabel} — ${fmtUsd(props.strait.valueUSD)} annual trade`
)
```

**File:** `components/straits/StraitCard.vue` (lines 9-11)

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

### Enhancement 4: Pass `LATEST_YEAR` to card

Import `LATEST_YEAR` from `utils/straitsData` so it can be forwarded to `StraitCircle`.

```ts
// components/straits/StraitCard.vue <script setup>
import { LATEST_YEAR } from '~/utils/straitsData'
```

**File:** `components/straits/StraitCard.vue` (line 3, new import)

## Technical Considerations

- **No new components** -- all changes are in `StraitCard.vue` (and potentially minor CSS in `StraitCardList.vue`)
- **StraitCircle particle rendering** -- passing `straitId` and `year` enables particle rendering for polygon-ready straits. Currently only Hormuz has polygon data (`POLYGON_READY_STRAITS` in `StraitCircle.vue:3`). The `selected` prop should remain `false` on cards since particles are gated by `selected && straitId && year` -- so no particles will render on cards, which is correct (particles are for the detail hero only).
- **Performance** -- 7 cards each rendering a `StraitCircle` with satellite images. Images are already lazy-loaded by the browser since they are `<img>` tags inside off-screen cards. No performance concern.
- **Bundle impact** -- Zero. No new dependencies.
- **Known todo** -- `todos/099-pending-p3-straitcard-missing-computed-import.md` flags that `computed()` is used without explicit import. This is a Nuxt auto-import and is `wont_fix`. No action needed.

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

## Dependencies & Risks

- **No blockers** -- all dependencies (StraitCircle, straitsData, design tokens) already exist
- **Low risk** -- changes are cosmetic and contained to a single component
- **Risk: satellite image quality at 72px** -- some strait images may appear blurry at this size if source crops are low-res. Verify `malacca.webp`, `taiwan.webp` etc. exist and are >= 144px (2x for retina). If missing, the circle falls back to the colored glow (acceptable).

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
  `${props.strait.name} — ${props.strait.globalShareLabel} — ${fmtUsd(props.strait.valueUSD)} annual trade`
)
</script>

<template>
  <li class="strait-card" role="listitem">
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

.strait-card__link:hover {
  background: rgba(2, 38, 64, 1);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.strait-card__link:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
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
