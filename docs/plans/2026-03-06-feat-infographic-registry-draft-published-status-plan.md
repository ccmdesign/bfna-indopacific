---
title: "feat: Add draft/published status to infographic registry"
type: feat
status: active
date: 2026-03-06
linear: BF-84
deepened: 2026-03-06
---

# feat: Add draft/published status to infographic registry

## Enhancement Summary

**Deepened on:** 2026-03-06
**Sections enhanced:** 6
**Research sources:** Nuxt 4 docs (Context7), TypeScript reviewer, architecture strategist, code simplicity reviewer, pattern recognition, performance oracle, Vue/Nuxt skills, accessibility skill

### Key Improvements
1. Use `as const satisfies` for compile-time slug literal types and exhaustive checking
2. Add `prerender:routes` Nuxt hook as a safer alternative to top-level import in nuxt.config.ts
3. Identified `v-bind` prop-spreading edge case with the extra `status` field on `InfographicCard`
4. Added accessibility considerations for status badges (WCAG color contrast, `aria-label`)
5. Added build verification step to confirm draft routes are excluded from static output

### New Considerations Discovered
- The `data/infographics.ts` file lives in `data/` alongside `data/renewables/` and `data/straits/` subdirectories -- this is the correct conventional location
- The `useEmbedCode` composable uses `onScopeDispose` and must be called synchronously in `<script setup>` -- the refactored `embedCodes` mapping must preserve this constraint
- Nuxt 4 supports a `prerender:routes` hook that could dynamically inject routes without needing a top-level import in `nuxt.config.ts`
- The project already uses a typed pattern for data contracts (`types/strait.ts`) -- the new `InfographicEntry` type follows this convention

---

## Overview

Create a single source of truth for infographic metadata (`data/infographics.ts`) with a `status: 'published' | 'draft'` field. Replace the duplicated inline arrays in `pages/index.vue` and `pages/test/embeds.vue` with imports from this registry, and derive prerender routes dynamically from published entries.

## Problem Statement

Infographic metadata is duplicated in three places, each requiring manual synchronization:

1. **`pages/index.vue:18-39`** - Full `InfographicEntry` interface and array (slug, title, description, embedTitle)
2. **`pages/test/embeds.vue:22-25`** - Abbreviated slug/title list with a stale comment: _"Keep in sync with pages/index.vue"_
3. **`nuxt.config.ts:11-16`** - Hardcoded prerender routes for all infographics (no draft awareness)

There is no mechanism to mark an infographic as draft vs published. The straits infographic is still in progress but appears on the homepage and gets prerendered alongside the published renewables infographic.

### Research Insights

**Pattern Recognition:**
- The "keep in sync" comment in `embeds.vue:20-21` is a classic code smell indicating a missing single source of truth. This pattern reliably leads to stale data after 2-3 development cycles.
- The project already follows a pattern of centralized data contracts: `types/strait.ts` defines the `Strait` interface for `data/straits/straits.json`. The new `InfographicEntry` type follows this established convention.

**Duplication Impact:**
- Three locations means three potential points of failure when adding a third infographic. The current plan correctly reduces this to one.

## Proposed Solution

A single TypeScript registry file that all consumers import from. The registry holds every infographic entry with an explicit `status` field. Filtered helper exports (`publishedInfographics`) make it easy for consumers to get only what they need.

### Research Insights

**Architecture Assessment (SOLID Compliance):**
- **Single Responsibility**: The registry file has one job -- hold infographic metadata. Good.
- **Open/Closed**: Adding a new infographic means appending to the array, not modifying consumer code. Good.
- **Dependency Inversion**: Consumers depend on the registry abstraction, not on each other. Good.

**Simplicity Review:**
- The plan is appropriately minimal. No over-engineering (no factory pattern, no class hierarchy, no runtime validation framework). A plain array with a filter is the correct level of abstraction for 2-5 items.
- The `publishedInfographics` export pre-computes the filter so consumers do not need to know about filtering logic. This is a good "pit of success" design.

## Technical Considerations

- **Nuxt config import**: `nuxt.config.ts` uses ESM imports. Importing from `./data/infographics` works because Nuxt config runs in Node context at build time. The registry must use only plain TS (no Vue reactivity, no Nuxt auto-imports).
- **InfographicCard props**: The `InfographicCard.vue` component accepts `{ slug, title, description, thumbnail?, embedTitle }`. The registry entries must be a superset of these props so `v-bind` spreading continues to work. The `status` field will be extra but harmless.
- **No runtime filtering**: All filtering is static/build-time. No middleware, no route guards, no env vars.

### Research Insights

**Nuxt Config Import Edge Case:**
- `nuxt.config.ts` is processed by Nuxt's build toolchain (jiti/unbuild) before the full Vite pipeline runs. Plain TypeScript with no Vue imports works reliably. However, if the file uses path aliases (`~/` or `@/`), the config context may not resolve them. The plan correctly uses a relative import (`./data/infographics`).
- **Alternative approach**: Nuxt 4 supports a `prerender:routes` hook (documented at nuxt.com/docs/getting-started/prerendering) that can dynamically add routes. This avoids the top-level import entirely:

```ts
// Alternative: using the hook instead of top-level import
export default defineNuxtConfig({
  hooks: {
    'prerender:routes'(ctx) {
      // Import is lazy, runs only at build time
      const { publishedInfographics } = require('./data/infographics')
      for (const i of publishedInfographics) {
        ctx.routes.add(`/embed/${i.slug}`)
        ctx.routes.add(`/infographics/${i.slug}`)
      }
    }
  }
})
```

**Recommendation**: Stick with the plan's top-level `import` approach. It is simpler, statically analyzable, and the `jiti` loader in Nuxt config handles `.ts` imports correctly. The hook approach is documented here as a fallback if unexpected import resolution issues arise.

**v-bind Prop Spreading with Extra Fields:**
- Vue 3 passes all `v-bind` properties as props or `$attrs`. Since `InfographicCard` does not declare a `status` prop, the `status` field from the registry will fall through as an HTML attribute (`<article status="published">`). This is harmless but technically impure.
- **Recommended improvement**: Use destructured spreading to exclude `status`:

```vue
<InfographicCard
  v-for="info in publishedInfographics"
  :key="info.slug"
  :slug="info.slug"
  :title="info.title"
  :description="info.description"
  :embed-title="info.embedTitle"
  :thumbnail="info.thumbnail"
  role="listitem"
/>
```

Or add `defineOptions({ inheritAttrs: false })` to `InfographicCard.vue` to suppress fallthrough. However, both add complexity for negligible benefit. The current plan's `v-bind` approach is acceptable for a 2-item array.

**useEmbedCode Composable Constraint:**
- The `useEmbedCode` composable (in `composables/useEmbedCode.ts`) calls `onScopeDispose()` internally, which means it must be invoked synchronously within `<script setup>`. The refactored `embedCodes` mapping in `embeds.vue` must preserve this synchronous `.map()` pattern. The plan's implementation does this correctly.

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

#### Research Insights

**TypeScript Best Practices (Kieran TypeScript Review):**

- **`as const satisfies` pattern**: For a small, known array, consider using `as const satisfies` for stricter literal types. This gives compile-time narrowing on slug values and prevents typos:

```ts
export const infographics = [
  {
    slug: 'renewables',
    title: 'Renewables on the Rise',
    // ...
    status: 'published'
  },
  {
    slug: 'straits',
    title: 'Indo-Pacific Straits',
    // ...
    status: 'draft'
  }
] as const satisfies readonly InfographicEntry[]

// Derive a union type of all slugs for use elsewhere
export type InfographicSlug = (typeof infographics)[number]['slug']
// Result: 'renewables' | 'straits'
```

This enables exhaustive switch/case checks if slug routing logic is added later. However, it makes the array `readonly`, which means `publishedInfographics` must use a different type signature. **Recommendation**: Use the simpler mutable array in the plan. The `as const satisfies` pattern is a future enhancement if slug validation becomes important (e.g., when adding a third or fourth infographic).

**File Location Convention:**
- The `data/` directory already contains `data/renewables/` and `data/straits/` subdirectories with raw data files. Placing `data/infographics.ts` at the root of `data/` is the correct location for a cross-cutting registry that references all infographics. This follows the project's existing convention.

**Named Export over Default Export:**
- The plan correctly uses named exports (`infographics`, `publishedInfographics`, `InfographicEntry`). This is better for tree-shaking, refactoring, and import clarity. Approved.

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

#### Research Insights

**Critical Deletion Check:**
- The inline `InfographicEntry` interface (lines 18-24) is only used in `pages/index.vue`. It is not imported elsewhere. Safe to remove.
- The inline `infographics` array (lines 26-39) is only referenced in the same file's template. Safe to remove.
- No tests reference these symbols (confirmed: no test files in the project reference `InfographicEntry` from `index.vue`).

**Vue Best Practices:**
- The `import` statement is explicit and replaces Nuxt auto-import behavior. Since `data/` is not an auto-import directory (only `composables/`, `utils/`, and `components/` are), an explicit import is required and correct.

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

#### Research Insights

**Accessibility (WCAG 2.1 Compliance):**
- The status badges convey meaning through color alone (amber = draft, green = published). WCAG 1.4.1 requires that color is not the only visual means of conveying information. The text labels ("draft" / "published") inside the badges satisfy this requirement -- good.
- **Color contrast check**: The amber text `rgba(245, 158, 11, 0.95)` on the amber background `rgba(245, 158, 11, 0.2)` may not meet WCAG AA contrast ratio (4.5:1) depending on the underlying page background. Since the page background is dark (`rgba(0,0,0,...)` derived from the layout), the amber text color at 0.95 opacity should have sufficient contrast against the semi-transparent amber background. Verify this during implementation with a contrast checker.
- **Recommendation**: Add `role="status"` or an `aria-label` to the badge for screen readers:

```html
<span
  class="status-badge"
  :class="embed.status === 'draft' ? 'status-draft' : 'status-published'"
  :aria-label="`Status: ${embed.status}`"
>
  {{ embed.status }}
</span>
```

**embedCodes Mapping Constraint:**
- The existing `embedCodes` mapping calls `useEmbedCode()` inside `.map()`. This works because `.map()` runs synchronously within `<script setup>`. The refactored version must also call `.map()` synchronously. The plan's implementation preserves this pattern.
- The `status` field needs to be carried through the mapping. Update the `embedCodes` computation:

```ts
const embedCodes = infographics.map(e => {
  const { embedCode } = useEmbedCode(() => e.slug, () => e.title)
  return { ...e, code: embedCode }
})
```

This spreads all registry fields (including `status`) into each item. The template can then access `embed.status`.

**Code Duplication Note (Review Finding #040):**
- The existing comment at line 31-36 documents a known duplication of `useEmbedCode` instances. This duplication is unaffected by this refactor -- it remains acceptable for a small list.

### File 4: `nuxt.config.ts` (EDIT)

- **Add** import at top: `import { publishedInfographics } from './data/infographics'`
- **Replace** hardcoded `routes` array (lines 11-16) with:

```ts
routes: publishedInfographics.flatMap((i) => [
  `/embed/${i.slug}`,
  `/infographics/${i.slug}`
])
```

#### Research Insights

**Nuxt 4 Config Import Behavior:**
- Nuxt 4 uses `jiti` (a TypeScript-aware `require` alternative) to load `nuxt.config.ts`. This supports importing `.ts` files with type annotations. The relative path `./data/infographics` (without `.ts` extension) is resolved correctly by `jiti`.
- **Do NOT use the `~/` alias** in `nuxt.config.ts`. The alias is only available inside the Nuxt app context (pages, components, composables), not in the config file itself. The plan correctly uses `./data/infographics`.

**Prerender Route Verification:**
- After `npm run build`, verify the generated routes by checking the `.output/public/` directory:
  - Should exist: `.output/public/embed/renewables/index.html`, `.output/public/infographics/renewables/index.html`
  - Should NOT exist: `.output/public/embed/straits/index.html`, `.output/public/infographics/straits/index.html`
- The existing `routeRules` entry (`'/test/**': { prerender: false }`) is unaffected by this change.

**Performance Consideration:**
- The `flatMap` call runs once at build time during config resolution. Zero runtime cost. The array has 1-2 published items, so even the algorithmic complexity is irrelevant.

**Deployment Consideration:**
- After this change, the straits pages will no longer be pre-rendered as static HTML. They will still be accessible in `npm run dev` via Nuxt's dev server, but they will return a 404 on the static Netlify deployment if someone navigates to `/embed/straits` or `/infographics/straits` directly. This is the desired behavior -- draft infographics should not be publicly accessible in production.
- When the straits infographic is promoted to `status: 'published'`, a rebuild and redeploy will automatically include the straits routes.

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

### Research Insights: Additional Verification Steps

- [ ] **Build output verification**: After `npm run build`, run `find .output/public -name "index.html" | grep -E "(embed|infographics)"` to confirm only renewables routes are pre-rendered
- [ ] **Attr fallthrough check**: Inspect the rendered homepage HTML to confirm no `status="published"` attribute appears on `<article>` elements (from `v-bind` spreading). If it does, add `defineOptions({ inheritAttrs: false })` to `InfographicCard.vue`
- [ ] **Status badge contrast**: Visually verify the amber and green badge text is legible against the dark page background

## Edge Cases & Risks

### Identified During Research

1. **All infographics set to draft**: If every entry in the registry has `status: 'draft'`, `publishedInfographics` will be an empty array. The homepage will render an empty `<div class="infographic-cards">` container with no cards. The `prerender.routes` array will be empty, but the `/` route is still rendered (it is the homepage). No crash, but may want to show a placeholder message in the future.

2. **nuxt.config.ts import cache**: Nuxt caches the resolved config. If `data/infographics.ts` is modified during `npm run dev`, the config is NOT hot-reloaded -- a dev server restart is required for prerender route changes to take effect. This only matters during development; production builds always read the file fresh.

3. **Duplicate slugs**: If two entries share the same `slug`, the prerender routes will contain duplicates (e.g., `/embed/renewables` listed twice). Nuxt deduplicates prerender routes internally, so this causes no build error, but it indicates a data bug. Consider adding a development-time assertion:

```ts
// Optional: dev-time uniqueness check
if (import.meta.dev) {
  const slugs = infographics.map(i => i.slug)
  const dupes = slugs.filter((s, idx) => slugs.indexOf(s) !== idx)
  if (dupes.length) console.warn(`[infographics] Duplicate slugs: ${dupes.join(', ')}`)
}
```

**Recommendation**: Skip the uniqueness check for now (YAGNI for 2 items). Add it when the registry grows to 4+ entries.

4. **Future status values**: If a third status like `'archived'` is needed, the `InfographicStatus` type union and `publishedInfographics` filter will need updating. The current design handles this correctly -- `publishedInfographics` only includes `'published'` entries, so any new status is excluded by default.

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
- `types/strait.ts` - Existing typed data contract pattern (convention reference)
- `composables/useEmbedCode.ts` - Composable with `onScopeDispose` constraint

### External References

- Nuxt prerender routes configuration: https://nuxt.com/docs/getting-started/prerendering
- Nuxt `prerender:routes` hook: https://nuxt.com/docs/getting-started/prerendering#prerenderroutes
- TypeScript `satisfies` operator: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html
- WCAG 1.4.1 Use of Color: https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html

### Related Work

- Linear issue: BF-84
