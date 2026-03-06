---
title: "feat: Add draft/published status to infographic registry"
type: feat
status: active
date: 2026-03-06
linear: BF-84
---

# feat: Add draft/published status to infographic registry

## Overview

Create a single source of truth for infographic metadata (`data/infographics.ts`) with a `status: 'published' | 'draft'` field. Replace the duplicated inline arrays in `pages/index.vue` and `pages/test/embeds.vue` with imports from this registry, and derive prerender routes dynamically from published entries.

## Problem Statement

Infographic metadata is duplicated in three places, each requiring manual synchronization:

1. **`pages/index.vue:18-39`** - Full `InfographicEntry` interface and array (slug, title, description, embedTitle)
2. **`pages/test/embeds.vue:22-25`** - Abbreviated slug/title list with a stale comment: _"Keep in sync with pages/index.vue"_
3. **`nuxt.config.ts:11-16`** - Hardcoded prerender routes for all infographics (no draft awareness)

There is no mechanism to mark an infographic as draft vs published. The straits infographic is still in progress but appears on the homepage and gets prerendered alongside the published renewables infographic.

## Proposed Solution

A single TypeScript registry file that all consumers import from. The registry holds every infographic entry with an explicit `status` field. Filtered helper exports (`publishedInfographics`) make it easy for consumers to get only what they need.

## Technical Considerations

- **Nuxt config import**: `nuxt.config.ts` uses ESM imports. Importing from `./data/infographics` works because Nuxt config runs in Node context at build time. The registry must use only plain TS (no Vue reactivity, no Nuxt auto-imports).
- **InfographicCard props**: The `InfographicCard.vue` component accepts `{ slug, title, description, thumbnail?, embedTitle }`. The registry entries must be a superset of these props so `v-bind` spreading continues to work. The `status` field will be extra but harmless.
- **No runtime filtering**: All filtering is static/build-time. No middleware, no route guards, no env vars.

## Implementation Plan

### File 1: `data/infographics.ts` (NEW)

Create the central registry.

```ts
// data/infographics.ts

export type InfographicStatus = 'published' | 'draft'

export interface InfographicEntry {
  slug: string
  title: string
  description: string
  embedTitle: string
  status: InfographicStatus
  thumbnail?: string
}

export const infographics: InfographicEntry[] = [
  {
    slug: 'renewables',
    title: 'Renewables on the Rise',
    description:
      'Explore how Indo-Pacific nations are expanding renewable energy infrastructure, with 2024 data on solar, wind, hydropower and more.',
    embedTitle: 'Renewables on the Rise',
    status: 'published'
  },
  {
    slug: 'straits',
    title: 'Indo-Pacific Straits',
    description:
      'Visualize maritime traffic through six critical chokepoints, from Malacca to Hormuz, with vessel data from 2019 to 2025.',
    embedTitle: 'Indo-Pacific Straits',
    status: 'draft'
  }
]

export const publishedInfographics = infographics.filter(
  (i) => i.status === 'published'
)
```

### File 2: `pages/index.vue` (EDIT)

- **Remove** the inline `InfographicEntry` interface (lines 18-24) and inline `infographics` array (lines 26-39).
- **Add** import: `import { publishedInfographics } from '~/data/infographics'`
- **Update** template `v-for` to iterate over `publishedInfographics` instead of `infographics`.

The `<script setup>` block becomes:

```ts
import { publishedInfographics } from '~/data/infographics'

definePageMeta({
  layoutClass: 'layout-home',
  suppressRotateOverlay: true
})

useHead({ title: 'BFNA Indo-Pacific' })

useSeoMeta({
  description: '...',
  ogTitle: 'BFNA Indo-Pacific',
  ogDescription: '...',
  ogType: 'website'
})
```

Template change (line 50):
```diff
-        v-for="info in infographics"
+        v-for="info in publishedInfographics"
```

### File 3: `pages/test/embeds.vue` (EDIT)

- **Remove** the inline `embeds` array (lines 22-25) and the sync comment (lines 20-21).
- **Add** import: `import { infographics } from '~/data/infographics'`
- **Update** `embedCodes` to map over `infographics` instead of `embeds`, carrying forward the `status` field.
- **Add** a status badge next to each embed title in the template. Reuse the existing `.dev-badge` styling pattern with color variants:
  - Published: green badge
  - Draft: amber badge (matching existing `.dev-badge` color)

Template addition inside the `<section>` for each embed:

```html
<h2>
  {{ embed.title }}
  <span
    class="status-badge"
    :class="embed.status === 'draft' ? 'status-draft' : 'status-published'"
  >
    {{ embed.status }}
  </span>
</h2>
```

New scoped styles:

```css
.status-badge {
  display: inline-block;
  font-size: var(--size-0);
  font-weight: 600;
  padding: var(--space-3xs) var(--space-s);
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  vertical-align: middle;
  margin-left: var(--space-xs);
}

.status-draft {
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: rgba(245, 158, 11, 0.95);
}

.status-published {
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.5);
  color: rgba(34, 197, 94, 0.95);
}
```

### File 4: `nuxt.config.ts` (EDIT)

- **Add** import at top: `import { publishedInfographics } from './data/infographics'`
- **Replace** hardcoded `routes` array (lines 11-16) with:

```ts
routes: publishedInfographics.flatMap((i) => [
  `/embed/${i.slug}`,
  `/infographics/${i.slug}`
])
```

### Files NOT changed

- `pages/embed/renewables.vue` - stays as-is
- `pages/embed/straits.vue` - stays as-is (accessible in dev, not prerendered)
- `pages/infographics/renewables.vue` - stays as-is
- `pages/infographics/straits.vue` - stays as-is (accessible in dev, not prerendered)
- `components/InfographicCard.vue` - props unchanged; extra `status` prop from `v-bind` is harmless

## Acceptance Criteria

- [ ] `data/infographics.ts` exists with `InfographicEntry` type, `infographics` array, and `publishedInfographics` filtered export
- [ ] Renewables has `status: 'published'`; Straits has `status: 'draft'`
- [ ] `pages/index.vue` imports from registry; no inline infographic array remains
- [ ] `pages/test/embeds.vue` imports from registry; no inline embeds array remains; shows status badges
- [ ] `nuxt.config.ts` derives prerender routes from `publishedInfographics`
- [ ] `npm run build` succeeds with only renewables routes prerendered (no `/embed/straits` or `/infographics/straits` in output)
- [ ] Homepage shows only the renewables card
- [ ] `/test/embeds` shows both renewables (green "published" badge) and straits (amber "draft" badge)
- [ ] `/embed/straits` and `/infographics/straits` still load in `npm run dev`
- [ ] TypeScript compilation has no errors
- [ ] Adding a future infographic requires editing only `data/infographics.ts`

## Out of Scope

- No middleware or route guards for draft pages
- No runtime env vars -- filtering is static at build time
- No changes to `InfographicCard.vue` props
- No UI changes to the homepage beyond filtering out draft cards

## Sources & References

### Internal References

- `pages/index.vue:18-39` - Current inline infographic array and interface
- `pages/test/embeds.vue:20-25` - Duplicated embeds list with sync comment
- `nuxt.config.ts:11-16` - Hardcoded prerender routes
- `components/InfographicCard.vue:1-8` - Component prop interface (must remain compatible)

### Related Work

- Linear issue: BF-84
