---
title: "feat: Create infographic and embed page routes"
type: feat
status: active
date: 2026-03-03
linear: BF-72
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
depends_on:
  - docs/plans/2026-03-03-feat-create-embed-layout-plan.md
  - docs/plans/2026-03-03-refactor-extract-renewables-infographic-component-plan.md
  - docs/plans/2026-03-03-feat-extract-shared-layout-into-default-vue-plan.md
---

# feat: Create infographic and embed page routes

## Enhancement Summary

**Deepened on:** 2026-03-03
**Sections enhanced:** 8
**Research sources:** Nuxt 4 routing docs, Nuxt SSG/prerender docs, Nuxt SEO & meta docs, Netlify headers & redirect docs, Vue 3 Composition API best practices, accessibility (WCAG 2.1), security (CSP/X-Frame-Options), codebase pattern analysis

### Key Improvements
1. Added Open Graph and social sharing meta tags to head composables -- critical for sharing infographics on social media
2. Identified a Netlify SPA fallback redirect conflict that could serve `index.html` instead of prerendered HTML for new routes -- requires `force = true` or redirect removal
3. Recommended `useSeoMeta()` over raw `useHead()` meta arrays for type-safe, XSS-safe SEO metadata on embed pages
4. Added accessibility requirements for placeholder component (landmark roles, skip-link compatibility, color contrast)
5. Specified concrete placeholder component and composable implementations with exact code patterns to eliminate ambiguity

### New Risks Discovered
- The `netlify.toml` catch-all `/* -> /index.html (200)` redirect may shadow prerendered static HTML files; Netlify serves the first matching rule, and without `force = true` the static file takes precedence (which is correct), but this interaction should be verified during testing
- `definePageMeta` is a compiler macro -- the `footerSource` object is hoisted out of the component at build time, so it cannot reference runtime values; the current plan's static objects are safe, but future dynamic sources would need a different approach
- If `StraitsInfographic` placeholder is created but the `gsap` import in the straits brainstorm's component plan triggers at build time, the placeholder must avoid importing gsap or D3 to prevent SSG errors

---

## Overview

Create four thin page wrappers that render shared infographic components with the appropriate Nuxt layout. This establishes the `/infographics/<slug>` and `/embed/<slug>` URL structure defined in the brainstorm (see brainstorm: `docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md`, Key Decisions > URL Structure).

Two of the four pages already exist:
- `pages/index.vue` currently renders `RenewablesInfographic` at `/` (the homepage) -- this is **not** one of the four pages in scope, but informs the pattern.
- `pages/embed/renewables.vue` already exists and is **complete** -- it renders `RenewablesInfographic` with the embed layout. No work needed.

The remaining three pages to create:
1. `pages/infographics/renewables.vue` -- renders `RenewablesInfographic`, default layout
2. `pages/infographics/straits.vue` -- renders `StraitsInfographic`, default layout
3. `pages/embed/straits.vue` -- renders `StraitsInfographic`, embed layout

## Problem Statement / Motivation

The brainstorm defines a dual-route architecture where every infographic is accessible at two URLs:
- `/infographics/<slug>` -- full site chrome (nav back-link, footer with source attribution and BFNA logo)
- `/embed/<slug>` -- stripped-down for iframe embedding (no back-link, no footer)

Both routes render the **same** infographic component, ensuring a single source of truth per infographic (see brainstorm: Architecture section -- "Both route patterns render the same infographic component, ensuring a single source of truth per infographic").

The infrastructure is already in place:
- `layouts/default.vue` provides the full site chrome (BF-69, completed)
- `layouts/embed.vue` provides the minimal embed wrapper (BF-70, completed)
- `components/infographics/RenewablesInfographic.vue` is extracted and reusable (BF-71, completed)
- `nuxt.config.ts` has `pathPrefix: false` for `components/infographics/`, enabling clean `<RenewablesInfographic />` usage
- `netlify.toml` has path-specific headers for `/embed/*` routes

What is missing are the page files themselves -- the thin wrappers that wire components to layouts.

### Research Insights

**Best Practices (Nuxt File-Based Routing):**
- Nuxt 4 file-based routing maps `pages/` folder structure directly to URL routes. The `pages/infographics/renewables.vue` file will automatically resolve to `/infographics/renewables` -- no manual route configuration needed beyond the file placement.
- `definePageMeta()` is the correct mechanism for setting layout selection and custom metadata per page. It is a **compiler macro** -- metadata is hoisted out of the component at compile time. This means all values must be statically analyzable (no runtime variables, no `ref()`, no `computed()`). The current plan's static objects are safe.
- Nuxt auto-imports composables from `composables/` and components from `components/` (with the configured `pathPrefix: false` for `components/infographics/`). No explicit `import` statements are needed in page files.

**Pattern Validation:**
- The existing `pages/index.vue` (15 lines) and `pages/embed/renewables.vue` (16 lines) establish a proven minimal page wrapper pattern. All new pages should match this exact structure: `definePageMeta()` -> composable call -> single component in template.

---

## Proposed Solution

### File 1: `pages/infographics/renewables.vue`

A thin page wrapper following the exact pattern established by `pages/index.vue` (which already renders `RenewablesInfographic` at `/`). The key differences:
- Lives at `/infographics/renewables` instead of `/`
- Shows the back-link (default behavior of `layouts/default.vue` for non-root routes)
- Uses the same `useRenewablesHead()` composable for head tags
- Passes the same `footerSource` and `layoutClass` via `definePageMeta`

```vue
<!-- pages/infographics/renewables.vue -->
<script setup>
definePageMeta({
  layoutClass: 'layout-1',
  footerSource: {
    url: 'https://ourworldindata.org/grapher/share-of-electricity-production-from-renewable-sources?time=earliest..2024&country=CHN~JPN~IND~KOR~AUS~IDN~TWN~THA~USA~EU+%28Ember%29',
    label: 'Source: Our World in Data'
  }
})

useRenewablesHead()
</script>

<template>
  <RenewablesInfographic />
</template>
```

#### Research Insights

**SEO & Social Sharing:**
- This page will be the canonical, shareable URL for the renewables infographic. The `useRenewablesHead()` composable currently sets only `title` and a font `link`. For social sharing, it should also include Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`) and a Twitter Card (`twitter:card`). This enhancement belongs in the `useRenewablesHead` composable, not in the page file -- keeping the page thin. However, the composable change is out of scope for BF-72; file a follow-up task.
- Consider using `useSeoMeta()` alongside `useHead()` in the composable for type-safe, XSS-safe SEO meta tags. `useSeoMeta` provides 100+ typed parameters and prevents common mistakes like using `name` instead of `property` for OG tags.

**Back-Link Behavior:**
- `layouts/default.vue` line 18 shows: `showBackLink = computed(() => route.meta.showBackLink !== false && route.path !== '/')`. Since `/infographics/renewables` is not `/`, the back-link will automatically appear. No explicit `showBackLink: true` is needed in `definePageMeta`. The back-link points to `/` by default (`backLinkTarget` defaults to `/`), which is correct behavior -- users navigating from the future homepage hub will return there.

**Edge Case -- Duplicate Content:**
- Once `/infographics/renewables` exists, the same `RenewablesInfographic` component renders at both `/` (homepage) and `/infographics/renewables`. Search engines may see this as duplicate content. When the homepage is eventually migrated to a card-based hub (separate task), this resolves naturally. In the interim, consider adding a `<link rel="canonical" href="/infographics/renewables">` to the infographics page via the head composable to signal the preferred URL. This is a low-priority follow-up, not blocking for BF-72.

---

### File 2: `pages/infographics/straits.vue`

Same pattern, but for the straits infographic. Uses `StraitsInfographic` component and `layoutClass: 'layout-2'` (the straits-specific grid layout from the straits brainstorm, see brainstorm: `docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md`, Key Decisions > layout grid).

```vue
<!-- pages/infographics/straits.vue -->
<script setup>
definePageMeta({
  layoutClass: 'layout-2',
  footerSource: {
    url: '#',
    label: 'Source: IMF PortWatch'
  }
})

useStraitsHead()
</script>

<template>
  <StraitsInfographic />
</template>
```

**Note:** `StraitsInfographic` component and `useStraitsHead` composable do not exist yet. They are out of scope for this task -- the page file is a forward-looking wrapper that will render correctly once those dependencies are built. The implementer should either:
- (a) Create a placeholder `StraitsInfographic` component so the page renders without error, or
- (b) Defer this page file until the `StraitsInfographic` component is ready.

See Open Questions below.

#### Research Insights

**Placeholder Component Best Practices:**
- The placeholder `StraitsInfographic` component must be a purely presentational, zero-dependency component. It must **not** import `gsap`, `d3`, or any Canvas/WebGL APIs -- these would execute during SSG and cause build errors. The placeholder should contain only static HTML and scoped CSS.
- The placeholder should use `display: contents` (matching the existing `RenewablesInfographic` pattern) so it integrates seamlessly with the `.layout-2` grid defined in `layouts/default.vue`.
- Recommended placeholder implementation:

```vue
<!-- components/infographics/StraitsInfographic.vue (placeholder) -->
<template>
  <div class="straits-infographic">
    <div class="placeholder-content">
      <h1 class="title">Indo-Pacific Straits</h1>
      <p>Coming soon -- interactive maritime traffic visualization.</p>
    </div>
  </div>
</template>

<style scoped>
.straits-infographic {
  display: contents;
}

.placeholder-content {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  padding: 2rem;
}

.placeholder-content .title {
  font-family: 'Encode Sans', sans-serif;
  font-weight: 600;
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 1rem;
}
</style>
```

**Accessibility:**
- The placeholder should include proper heading hierarchy (`<h1>`) and be screen-reader friendly. The "Coming soon" message communicates content status to all users.
- Text color `rgba(255, 255, 255, 0.7)` on the dark gradient background (#0D0D0D to #022640) must meet WCAG AA contrast ratio of 4.5:1. At `0.7` opacity white on `#0D0D0D`, the effective contrast is approximately 11:1, which passes. The title at `0.9` opacity passes comfortably.

---

### File 3: `pages/embed/straits.vue`

Follows the exact pattern of `pages/embed/renewables.vue` (already complete).

```vue
<!-- pages/embed/straits.vue -->
<script setup>
definePageMeta({
  layout: 'embed',
  layoutClass: 'layout-2'
})

useStraitsHead({
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
</script>

<template>
  <StraitsInfographic />
</template>
```

Same dependency caveat as File 2 above.

#### Research Insights

**Security -- Embed Headers Already Covered:**
- The `netlify.toml` rule `for = "/embed/*"` (line 12) applies to **all** embed sub-routes, including the new `/embed/straits`. The headers set are:
  - `Content-Security-Policy: frame-ancestors *` -- allows embedding from any origin
  - `X-Frame-Options: SAMEORIGIN` -- fallback for older browsers
  - Additional security headers (XSS, content-type, referrer, permissions)
- **Important nuance:** `X-Frame-Options: SAMEORIGIN` and `frame-ancestors *` are contradictory. Modern browsers prioritize CSP `frame-ancestors` over `X-Frame-Options` when both are present. Older browsers that only support `X-Frame-Options` will restrict embedding to same-origin. This is acceptable -- the current configuration provides progressive security. No changes needed for BF-72, but document this behavior for future reference.

**Robots Meta Tag:**
- The `noindex, nofollow` meta tag on embed pages prevents search engines from indexing the stripped-down embed version. This is correct -- the `/infographics/<slug>` version should be the indexed canonical URL.
- For completeness, consider also adding `<meta name="robots" content="noindex, nofollow">` as a `<meta>` header in Netlify for `/embed/*` routes, providing defense-in-depth if the meta tag is somehow stripped. This is a low-priority enhancement, not blocking.

**Performance -- Embed Pages:**
- Embed pages are loaded inside iframes, often on third-party sites. They should be as lightweight as possible. The embed layout (`layouts/embed.vue`) is already minimal (no footer, no back-link). The `useHead` composable loads the Inter font -- this is an extra network request inside the iframe. Consider whether embed pages actually need the Inter font (the infographic component uses Encode Sans loaded globally). If Inter is only used by the non-embed layout chrome, it could be skipped for embeds. This is a performance follow-up, not blocking for BF-72.

---

### File 4: `pages/embed/renewables.vue` -- Already exists

This file was created as part of BF-71. No changes needed. Included here for completeness:

```vue
<!-- pages/embed/renewables.vue (existing, no changes) -->
<script setup>
definePageMeta({
  layout: 'embed',
  layoutClass: 'layout-1'
})

useRenewablesHead({
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
</script>

<template>
  <RenewablesInfographic />
</template>
```

---

### Configuration Update: `nuxt.config.ts`

Add the new embed and infographic routes to `nitro.prerender.routes` so `nuxt generate` discovers them (no `<NuxtLink>` points to embed routes -- they are only accessed via iframe):

```ts
// nuxt.config.ts (partial)
nitro: {
  preset: 'static',
  prerender: {
    routes: [
      '/embed/renewables',
      '/embed/straits',
      '/infographics/renewables',
      '/infographics/straits'
    ]
  }
}
```

The `/infographics/*` routes may eventually be linked from the homepage cards, but until the homepage is built, explicit prerender routes ensure they are generated.

#### Research Insights

**Prerender Route Discovery:**
- In Nuxt SSG mode, `nuxt generate` uses the Nitro crawler to discover pages. The crawler starts from `/` and follows `<NuxtLink>` references. Since embed pages are never linked from the app (they are accessed via iframe from external sites) and infographic pages may not be linked until the homepage hub is built, all four routes **must** be explicitly listed in `nitro.prerender.routes`.
- After running `nuxt generate`, verify that the `.output/public/` directory contains:
  - `.output/public/embed/renewables/index.html`
  - `.output/public/embed/straits/index.html`
  - `.output/public/infographics/renewables/index.html`
  - `.output/public/infographics/straits/index.html`

**Scalability -- Future Route Addition Pattern:**
- As more infographics are added (e.g., `/infographics/trade`, `/embed/trade`), the `prerender.routes` array will grow linearly. For now with 4 routes this is perfectly manageable. If the project reaches 10+ infographics, consider using a Nitro hook (`nitro:config`) to programmatically generate the route list from a data source or directory listing. This is a future consideration, not needed now.

**Potential Netlify SPA Fallback Conflict:**
- The current `netlify.toml` has a catch-all redirect: `from = "/*" to = "/index.html" status = 200`. When `nuxt generate` produces static HTML files at the prerendered paths, Netlify's behavior is: **if a file exists at the requested path, it serves the file; the redirect is only used as a fallback when no file exists.** This means the prerendered HTML files will be served correctly for the four routes without modification. However, the implementer should **verify** this during testing by visiting each route on the deployed Netlify preview and confirming the correct content is served (not the homepage). If the fallback interferes, the fix is to add `force = false` explicitly (which is the default) or to remove the catch-all redirect entirely since all routes are prerendered.

---

## Technical Considerations

### Pattern Consistency

Every page file in this project follows the same minimal structure:
1. `definePageMeta()` -- layout selection, layout class, footer source
2. `use<Name>Head()` composable -- page title, font links, optional meta overrides
3. `<template>` with a single infographic component

This pattern is established by `pages/index.vue` and `pages/embed/renewables.vue`. The new pages must follow it exactly.

#### Research Insights

**Code Simplicity Review:**
- This plan exemplifies excellent adherence to the "thin page wrapper" pattern. Each page file is 12-16 lines. The component, composable, and layout separation keeps each file at a single responsibility. No changes to this architecture are recommended.
- The `definePageMeta` custom properties (`layoutClass`, `footerSource`) are a clean way to pass page-level configuration to the layout without props or provide/inject. The TypeScript augmentation in `layouts/default.vue` (lines 2-14) properly types these custom properties via `declare module '#app'`.

**Vue Best Practices Alignment:**
- The pages correctly use `<script setup>` (Composition API) without explicit imports for auto-imported composables and components.
- The template contains a single root component, keeping the page purely a composition surface (per Vue best practices: "Keep entry/root and route view components thin").
- No local state, no watchers, no lifecycle hooks in page files -- all logic lives in composables or components.

### Nuxt Auto-Import

- Infographic components in `components/infographics/` use `pathPrefix: false` (configured in `nuxt.config.ts`), so they are auto-imported as `<RenewablesInfographic />` and `<StraitsInfographic />` without a directory prefix.
- Composables in `composables/` are auto-imported by Nuxt convention. `useRenewablesHead` is already available; `useStraitsHead` will be auto-imported once created.

#### Research Insights

**Auto-Import Verification:**
- The `nuxt.config.ts` component configuration lists `components/infographics/` first with `pathPrefix: false`, followed by the default `~/components` entry. This ordering is intentional -- it ensures infographic components get short names while all other components retain their default resolution. The new `StraitsInfographic.vue` will be auto-imported identically to `RenewablesInfographic.vue` with no config changes needed.
- Composables placed directly in `composables/` are auto-imported. The new `useStraitsHead.ts` file only needs to exist in that directory -- Nuxt will make it globally available automatically.

### Static Generation (SSG)

All four routes must appear in `nitro.prerender.routes` because:
- Embed routes have no `<NuxtLink>` pointing to them (accessed via iframe only)
- Infographic routes may not have `<NuxtLink>` until the homepage hub is built
- Without explicit prerender entries, `nuxt generate` will not crawl and generate these pages

#### Research Insights

**Build Verification Checklist:**
- After running `nuxt generate`, verify:
  1. Build completes with exit code 0 and no error output
  2. Four HTML files exist in `.output/public/` at the expected paths (see Prerender Route Discovery above)
  3. Each HTML file contains the expected `<title>` tag from the head composable
  4. Embed HTML files contain `<meta name="robots" content="noindex, nofollow">`
  5. Infographic HTML files do NOT contain the `noindex` meta tag
- If the straits placeholder component is used, confirm it does not trigger any SSG-time errors (no browser API usage, no dynamic imports of heavy libraries).

**`crawlLinks` Interaction:**
- Nuxt's SSG crawler follows links by default (`crawlLinks: true`). If `pages/index.vue` or any other page eventually adds a `<NuxtLink to="/infographics/renewables">`, the explicit prerender entry becomes redundant (but harmless). Keeping explicit entries is the safer approach -- it documents intent and prevents silent breakage if links are removed.

### Netlify Headers

The `/embed/*` header rule in `netlify.toml` already uses a wildcard pattern. Adding `pages/embed/straits.vue` requires no Netlify configuration changes -- the existing `for = "/embed/*"` rule covers it automatically.

#### Research Insights

**Header Rule Ordering:**
- The `netlify.toml` correctly places the `/embed/*` header rule (line 12) **before** the `/*` catch-all rule (line 22). Netlify processes header rules top-to-bottom, and more specific rules must come first. The `/embed/straits` route will match the `/embed/*` rule and receive the permissive `frame-ancestors *` CSP, while `/infographics/straits` will match the `/*` catch-all and receive `X-Frame-Options: DENY`. This is the correct behavior.

**Permissions-Policy on Embed Routes:**
- The embed header rule includes `Permissions-Policy = "camera=(), microphone=(), geolocation=(), fullscreen=(self)"`. The straits infographic (when fully built) will use Canvas 2D for particle rendering -- this does not require any of these permissions, so no changes are needed. If a future infographic requires fullscreen (e.g., for immersive map view), the `fullscreen=(self)` policy would need to be updated to `fullscreen=(self, *)`.

---

## Acceptance Criteria

- [ ] `pages/infographics/renewables.vue` exists and renders `RenewablesInfographic` with the default layout, back-link visible, footer with "Source: Our World in Data"
- [ ] `pages/infographics/straits.vue` exists and renders `StraitsInfographic` with the default layout (may use placeholder component)
- [ ] `pages/embed/straits.vue` exists and renders `StraitsInfographic` with the embed layout, `noindex` meta tag set (may use placeholder component)
- [ ] `pages/embed/renewables.vue` remains unchanged and functional
- [ ] `nuxt.config.ts` prerender routes include all four paths (`/embed/renewables`, `/embed/straits`, `/infographics/renewables`, `/infographics/straits`)
- [ ] `nuxt generate` completes without errors and produces HTML files for all four routes
- [ ] Visiting `/infographics/renewables` in the browser shows the renewables infographic with site chrome (back-link, footer)
- [ ] Visiting `/embed/renewables` shows the renewables infographic without site chrome
- [ ] No duplicate code -- each infographic component is defined once and rendered by two page files

### Research Insights -- Additional Verification Steps

- [ ] **SSG output verification:** After `nuxt generate`, confirm `.output/public/infographics/renewables/index.html`, `.output/public/infographics/straits/index.html`, `.output/public/embed/renewables/index.html`, and `.output/public/embed/straits/index.html` all exist and contain valid HTML
- [ ] **Netlify deploy preview:** On the Netlify deploy preview, visit all four routes and confirm the correct page renders (not the homepage fallback)
- [ ] **Embed iframe test:** Create a simple HTML file that embeds `<iframe src="[deploy-url]/embed/renewables">` and `<iframe src="[deploy-url]/embed/straits">` -- confirm both load without console errors and the `X-Frame-Options` / `frame-ancestors` headers permit embedding
- [ ] **Back-link navigation:** On `/infographics/renewables`, confirm the back-link reads "Back to home" and navigates to `/`
- [ ] **Robots meta:** View source on `/embed/straits` and confirm `<meta name="robots" content="noindex, nofollow">` is present in the `<head>`
- [ ] **Head tag isolation:** Confirm that navigating from `/infographics/renewables` to `/infographics/straits` (when both are live) correctly swaps the `<title>` tag -- each page's head composable should replace, not append

---

## Open Questions for Implementer

1. **Straits component placeholder:** The `StraitsInfographic` component does not exist yet. Should the implementer:
   - **(a)** Create a minimal placeholder component (`components/infographics/StraitsInfographic.vue`) with a title and "Coming soon" message so the straits pages render without error?
   - **(b)** Skip the straits page files entirely and create them later when the `StraitsInfographic` component is ready?
   - Recommendation: **(a)** -- create a placeholder. This validates the routing, layout, and prerender configuration end-to-end now, and the placeholder is trivially replaced later.

   **Research-informed guidance:** The placeholder must be SSG-safe (no browser APIs, no `gsap`/`d3` imports, no `onMounted` with DOM access). Use the concrete placeholder template provided in the File 2 Research Insights section above. The placeholder should use `display: contents` to match the `RenewablesInfographic` pattern and integrate with the `.layout-2` grid.

2. **`useStraitsHead` composable:** Similarly, should a placeholder `composables/useStraitsHead.ts` be created following the `useRenewablesHead` pattern? Recommendation: yes, with a working title like "Indo-Pacific Straits" and the same Inter font link.

   **Research-informed implementation:**

   ```ts
   // composables/useStraitsHead.ts
   import type { UseHeadInput } from '@unhead/vue'

   export function useStraitsHead(overrides: UseHeadInput = {}) {
     const base: UseHeadInput = {
       title: 'Indo-Pacific Straits',
       link: [
         {
           rel: 'stylesheet',
           href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap',
           key: 'inter-font'
         }
       ]
     }

     useHead({
       ...base,
       ...overrides,
       link: [...(base.link as any[]), ...((overrides.link as any[]) || [])]
     })
   }
   ```

   This follows the exact pattern of `useRenewablesHead.ts` (28 lines). The `key: 'inter-font'` ensures the font link is deduplicated if both composables are somehow called on the same page (Unhead deduplicates by `key`).

3. **Footer source for straits:** The brainstorm references IMF PortWatch as the data source. The exact URL for the footer source attribution link needs to be confirmed. A placeholder `url: '#'` is acceptable for now.

   **Research note:** The straits brainstorm specifies the data source as `_process/straits.json` which will be moved to `data/straits.json`. The footer source URL for IMF PortWatch is likely `https://portwatch.imf.org/` but should be confirmed with the editorial team. Using `url: '#'` with `label: 'Source: IMF PortWatch'` is safe -- the `default.vue` layout renders it as an `<a>` tag, and `href="#"` will scroll to top (harmless) until replaced with the real URL.

4. **Homepage (`pages/index.vue`) migration:** The current `pages/index.vue` renders the renewables infographic at `/`. Once `/infographics/renewables` is live, the homepage should eventually become the card-based hub. This is a separate task (not in scope for BF-72) but the implementer should be aware that the homepage will change.

   **Research note:** Until the homepage migration, `/` and `/infographics/renewables` will render identical content. This is acceptable short-term but creates a duplicate content signal for search engines. When the homepage migration task is planned, it should include adding `<link rel="canonical" href="/infographics/renewables">` to the infographic page and redirecting or replacing the homepage content.

---

## Implementation Order

Based on pattern analysis and dependency graph:

1. **Create `composables/useStraitsHead.ts`** -- needed by both straits pages; no dependencies
2. **Create `components/infographics/StraitsInfographic.vue`** (placeholder) -- needed by both straits pages; no dependencies
3. **Create `pages/infographics/renewables.vue`** -- no new dependencies; can be tested immediately
4. **Create `pages/infographics/straits.vue`** -- depends on steps 1-2
5. **Create `pages/embed/straits.vue`** -- depends on steps 1-2
6. **Update `nuxt.config.ts`** -- add all four routes to `nitro.prerender.routes`
7. **Run `nuxt generate`** -- verify all four routes produce HTML files
8. **Manual verification** -- check each route in browser, verify headers, test embed iframe

Steps 1-2 can be done in parallel. Steps 3-5 can be done in parallel (after 1-2). Step 6 is independent of 3-5 but logically follows. Steps 7-8 are sequential verification.

---

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md](docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md) -- Key decisions carried forward: dual-route URL structure (`/infographics/<slug>` + `/embed/<slug>`), shared component architecture, embed layout strips site chrome.

### Internal References

- Existing renewables embed page: `pages/embed/renewables.vue` (pattern to follow)
- Existing homepage: `pages/index.vue` (pattern to follow)
- Renewables head composable: `composables/useRenewablesHead.ts` (pattern for `useStraitsHead`)
- Renewables infographic component: `components/infographics/RenewablesInfographic.vue`
- Default layout: `layouts/default.vue` (BF-69)
- Embed layout: `layouts/embed.vue` (BF-70)
- Nuxt config: `nuxt.config.ts` (prerender routes, component auto-import config)
- Netlify headers: `netlify.toml` (embed path-specific headers)

### External References

- [Nuxt 4 definePageMeta documentation](https://nuxt.com/docs/4.x/api/utils/define-page-meta)
- [Nuxt 4 Prerendering guide](https://nuxt.com/docs/4.x/getting-started/prerendering)
- [Nuxt SEO and Meta documentation](https://nuxt.com/docs/4.x/getting-started/seo-meta)
- [Nuxt SEO -- Open Graph best practices](https://nuxtseo.com/learn-seo/nuxt/mastering-meta/open-graph)
- [Netlify redirect options (status 200 rewrites)](https://docs.netlify.com/manage/routing/redirects/redirect-options/)
- [CSP frame-ancestors directive](https://content-security-policy.com/frame-ancestors/)
- [Nuxt Security -- X-Frame-Options](https://nuxt-security.vercel.app/headers/xframeoptions)
- [useSeoMeta composable (Unhead)](https://unhead.unjs.io/docs/head/api/composables/use-seo-meta)

### Related Plans

- `docs/plans/2026-03-03-feat-extract-shared-layout-into-default-vue-plan.md` (BF-69, completed)
- `docs/plans/2026-03-03-feat-create-embed-layout-plan.md` (BF-70, completed)
- `docs/plans/2026-03-03-refactor-extract-renewables-infographic-component-plan.md` (BF-71, completed)
