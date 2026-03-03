---
title: "feat: Introduce Nuxt file-based routing"
type: feat
status: active
date: 2026-03-03
linear: BF-68
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
---

# feat: Introduce Nuxt file-based routing

## Enhancement Summary

**Deepened on:** 2026-03-03
**Sections enhanced:** 8
**Research sources used:** Nuxt 4 official docs (Context7), Vue Router best practices skill, Nuxt skill (routing, components, config, middleware-plugins references), Vue best practices skill, accessibility skill, presentation-logic-split skill, SEO audit skill, netlify-deploy skill, verification-before-completion skill, compound-engineering review agents (architecture-strategist, performance-oracle, security-sentinel, code-simplicity-reviewer, julik-frontend-races-reviewer, pattern-recognition-specialist, deployment-verification-agent)

### Key Improvements
1. Identified that `<NuxtLayout>` without a `layouts/` directory may render nothing rather than transparently passing through -- requires verification or removal from `app.vue` shell
2. Discovered duplicate `preconnect` declarations for Google Fonts between `nuxt.config.ts` and `useHead()` in the page -- should be deduplicated
3. Recommended upgrading from `useHead()` to `useSeoMeta()` for the page title as the modern Nuxt 4 best practice for SEO metadata
4. Added SFC section ordering guidance: Nuxt/Vue convention is `<script>` then `<template>` then `<style>` -- the current MVP code example has them in a non-standard order
5. Added concrete verification commands and deployment checklist to prevent false completion claims

### New Risks Discovered
- **Medium risk: NuxtLayout without layouts/ directory** -- Nuxt docs state "if no layout is specified, `layouts/default.vue` will be used." If no `layouts/` directory exists, `<NuxtLayout>` may fail to render content rather than pass through transparently. This must be verified in dev before assuming pass-through behavior.
- **Low risk: Duplicate preconnect headers** -- Both `nuxt.config.ts` and `useHead()` declare `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com`. While browsers deduplicate, it adds unnecessary bytes to the SSG HTML output.
- **Low risk: `float` animation on background image uses `svh` units** -- The `svh` unit in the `@keyframes float` block may not be supported in all target browsers. Should verify browser support matrix.
- **Low risk: gtag plugin initial page_view may fire twice** -- The gtag plugin calls `trackPageView` both via `router.isReady()` and `router.afterEach()`. When file-based routing activates, the initial navigation event may trigger `afterEach` in addition to the `isReady` handler.

---

## Overview

Replace the monolithic `app.vue` with the Nuxt app shell (`<NuxtLayout><NuxtPage /></NuxtLayout>`) and create the `pages/` directory so Nuxt auto-enables file-based routing. This is the foundational migration step upon which all subsequent multi-infographic and embed features depend (see brainstorm: `docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md`).

The current application renders a single "Renewables on the Rise" infographic directly inside `app.vue`. After this task, the same infographic renders at an identical URL (`/`) via `pages/index.vue`, but the architecture is now ready for additional pages, layouts, and the `/infographics/<slug>` + `/embed/<slug>` URL structure decided in the brainstorm.

### Research Insights

**Nuxt 4 Routing Activation (from official docs):**
- The `app/pages/` directory is optional. If it is not present, Nuxt will not include the `vue-router` dependency. This confirms the plan's core assumption: creating `pages/` is the switch that activates routing.
- Nuxt 4 uses a new directory structure where `app/` is the default `srcDir`. However, this project uses the root directory as `srcDir` (no `app/` prefix), which is supported via backward compatibility. The `pages/` directory at root level will work correctly.

**Architecture Review:**
- This migration correctly follows the "thin app shell" pattern recommended by both the Vue best practices skill and the Nuxt documentation. The `app.vue` becomes a pure composition surface while `pages/index.vue` holds the feature implementation.

## Problem Statement / Motivation

The app has no routing. Everything lives in `app.vue`:
- Template markup (title, description, chart component, background image, footer)
- Scoped styles (page wrapper, footer, background animation, source link)
- `useHead()` call for fonts and title

This monolithic structure blocks:
1. Adding the straits infographic as a second page
2. Introducing layouts (`default`, `embed`)
3. Building the homepage hub
4. All downstream tasks in the multi-infographic epic

Nuxt only activates `vue-router` and file-based routing when it detects a `pages/` directory. Until that directory exists, `<NuxtPage>` is a no-op and `app.vue` is the entire application. This task flips that switch.

## Proposed Solution

A minimal, zero-regression migration in three parts:

### Part 1: Create `pages/index.vue`

Move the current `app.vue` template and scoped styles into `pages/index.vue`. This page becomes the route handler for `/`.

**File: `pages/index.vue`**

The page component receives:
- The full `<template>` from current `app.vue` (the `.page-wrapper` div with all children)
- The full `<style scoped>` block from current `app.vue`
- The `<script setup>` with `useHead()` from current `app.vue`

No logic changes. A direct cut-and-paste of the three SFC sections.

#### Research Insights

**SFC Section Ordering (from Vue best practices skill):**
- The Vue/Nuxt convention is `<script>` then `<template>` then `<style>`. The MVP code example at the bottom of this plan shows `<template>` then `<style>` then `<script>`, which is non-standard. During implementation, use the canonical ordering:
  1. `<script setup>`
  2. `<template>`
  3. `<style scoped>`

**Page-Level SEO Best Practice (from Nuxt 4 docs and SEO audit skill):**
- Nuxt 4 recommends `useSeoMeta()` over raw `useHead()` for page titles and SEO metadata. For this task, since we are doing a verbatim cut-and-paste, keeping `useHead()` is acceptable. However, a follow-up improvement should migrate to:
  ```ts
  useSeoMeta({
    title: 'Renewables on the Rise',
    ogTitle: 'Renewables on the Rise',
    description: 'Renewable energy usage percentages of the Indo-Pacific region\'s largest economies.',
    ogDescription: 'Renewable energy usage percentages of the Indo-Pacific region\'s largest economies.',
  })
  ```
- The `link` entries for Inter font preconnects and stylesheet should remain in `useHead()` since `useSeoMeta` does not handle `<link>` tags.

**Duplicate Preconnect Detection:**
- `nuxt.config.ts` already declares:
  ```ts
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
  ```
- The current `app.vue` (which will become `pages/index.vue`) also declares identical preconnect entries in `useHead()`. This results in duplicate `<link rel="preconnect">` tags in the rendered HTML. During implementation, the page-level `useHead()` should only include the Inter font stylesheet, not the preconnect entries that are already global:
  ```ts
  useHead({
    title: 'Renewables on the Rise',
    link: [
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap' }
    ]
  })
  ```
- **Note:** This deduplication is a minor optimization, not a blocker. The verbatim cut-and-paste approach is still valid for a zero-risk migration. The deduplication can be done as a follow-up or in this PR if the implementer chooses.

### Part 2: Replace `app.vue` with Nuxt app shell

Replace the entire contents of `app.vue` with the minimal Nuxt app shell:

```vue
<!-- app.vue -->
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

This is the standard Nuxt 3/4 entry point. `<NuxtLayout>` wraps the current page in the active layout (defaults to `default` if a `layouts/default.vue` exists, otherwise renders children directly). `<NuxtPage>` renders the matched route component from `pages/`.

**No `layouts/default.vue` is created in this task.** Without a `layouts/` directory, `<NuxtLayout>` passes through transparently. This keeps the diff minimal and defers layout extraction to a follow-up task (see brainstorm: Migration Path steps 3-4).

#### Research Insights

**Critical: NuxtLayout Behavior Without layouts/ Directory:**
- The Nuxt 4 documentation states: "If no layout is specified, `app/layouts/default.vue` will be used." It also states: "If an invalid layout is passed to the name prop, no layout will be rendered."
- This means that when no `layouts/` directory exists and no `default.vue` layout file is found, `<NuxtLayout>` may not render its slot content at all -- rather than transparently passing through.
- **Recommended approach:** During implementation, the implementer MUST verify one of two things:
  1. **Option A (safer):** Use `<NuxtPage />` directly in `app.vue` without `<NuxtLayout>` wrapping. This is simpler, avoids the ambiguity, and is explicitly shown in the Nuxt 4 docs as the `app.vue` pattern when layouts are not yet in use:
     ```vue
     <!-- app.vue -->
     <template>
       <NuxtPage />
     </template>
     ```
  2. **Option B (original plan):** Keep `<NuxtLayout><NuxtPage /></NuxtLayout>` but verify in `npm run dev` that the page renders. If it does not, fall back to Option A.
- **Recommendation:** Use **Option A** for this task. Adding `<NuxtLayout>` wrapping can be introduced in the same PR that creates `layouts/default.vue`, ensuring the layout component always has a matching file.

**Simplicity Review:**
- The code-simplicity-reviewer perspective confirms: wrapping in `<NuxtLayout>` when no layouts exist is premature. It adds a component to the render tree that does nothing (or worse, breaks rendering). Defer it.

### Part 3: Verify routing activation

After the `pages/` directory is created, Nuxt will:
1. Auto-generate `vue-router` configuration
2. Map `pages/index.vue` to the `/` route
3. Render it via `<NuxtPage>` inside `app.vue`

The rendered output should be pixel-identical to the current application.

#### Research Insights

**Concrete Verification Steps (from verification-before-completion skill):**
The following commands MUST be run and their output verified before claiming completion:

1. **Dev server smoke test:**
   ```bash
   npm run dev
   # Verify: Server starts without errors
   # Verify: Open http://localhost:3000/ in browser
   # Verify: Infographic renders identically to before migration
   ```

2. **Static generation test:**
   ```bash
   npm run generate
   # Verify: Command exits with code 0
   # Verify: .output/public/index.html exists
   # Verify: .output/public/index.html contains the infographic markup
   ```

3. **Route table verification:**
   - Open Nuxt DevTools in browser (already enabled in `nuxt.config.ts`)
   - Navigate to the Routes tab
   - Verify `pages/index.vue` appears mapped to `/`

4. **Visual regression check:**
   - Compare the rendered page side-by-side with the pre-migration version
   - Pay special attention to: background gradient, floating planet animation, footer positioning, chart rendering, font loading (Inter for body, Encode Sans for headings)

5. **Analytics verification:**
   - Open browser DevTools Network tab
   - Filter for `google-analytics` or `gtag`
   - Verify a `page_view` event fires on page load

## Technical Considerations

### Nuxt auto-detection behavior

Nuxt 4 (currently installed: `nuxt ^4.0.0`) auto-enables file-based routing when it detects files in `pages/`. No `nuxt.config.ts` changes are required. The `vue-router` dependency already exists in `package.json`.

#### Research Insights

**From Nuxt 4 Official Documentation (Context7):**
- "The `app/pages/` directory is optional. If it is not present, Nuxt will not include the `vue-router` dependency, which is useful when building a landing page or an application that does not require routing."
- This confirms that merely creating `pages/index.vue` is sufficient to activate routing. No config changes needed.
- The `vue-router` package in `package.json` is already present but was previously unused. After this migration, it will be actively loaded.

**Nuxt 4 Directory Structure Note:**
- Nuxt 4 defaults to a new directory structure where `app/` is the root for pages, components, etc. However, backward compatibility mode (which this project uses, since there is no `app/` subdirectory) treats the project root as `srcDir`. The `pages/` directory at root will be detected correctly.

### `useHead()` placement

The current `app.vue` calls `useHead()` to set the page title and Google Fonts preconnect/stylesheet links. The `nuxt.config.ts` **also** declares font preconnects and stylesheets via `app.head.link`. After migration:

- **Global head config** (in `nuxt.config.ts`): Encode Sans font, `public/styles.css` -- stays as-is
- **Page-level head** (in `pages/index.vue`): Inter font, page title "Renewables on the Rise" -- moves with the page

This is the correct Nuxt pattern: global assets in config, page-specific assets in composables. No duplication issue.

#### Research Insights

**Head Tag Merging (from Nuxt docs and Unhead library):**
- Nuxt uses Unhead under the hood, which merges `useHead()` calls from multiple components. Tags from `nuxt.config.ts` are always rendered first, then page-level tags are appended/merged.
- Multiple `useHead()` calls in different components are handled correctly -- Unhead deduplicates by key where possible.
- The `title` set in `pages/index.vue` will override any `title` set in `nuxt.config.ts` (if one were added later).

**Font Loading Performance (from performance-oracle perspective):**
- The Inter font is loaded via a render-blocking `<link rel="stylesheet">` to Google Fonts. For optimal performance in future iterations, consider:
  - Using `@nuxtjs/google-fonts` module for automatic font optimization (preload, font-display: swap)
  - Self-hosting fonts to eliminate the external dependency and reduce TTFB
  - These are follow-up optimizations, not required for this migration task.

**Duplicate Preconnect Issue (discovered during research):**
- Both `nuxt.config.ts` (`app.head.link`) and `app.vue`/`useHead()` declare identical `preconnect` entries for `fonts.googleapis.com` and `fonts.gstatic.com`. This results in duplicate `<link>` tags in the HTML. While browsers handle this gracefully, it adds ~200 bytes of unnecessary HTML per page. See Part 1 Research Insights for the recommended fix.

### Component auto-imports

Components (`RenewableEnergyChart`, `RotateDeviceOverlay`, `GridOverlay`) are auto-imported by Nuxt from the `components/` directory. No import changes needed in the new page file.

#### Research Insights

**Component Naming Convention (from pattern-recognition-specialist perspective):**
- The `components/` directory contains: `GridCounter.vue`, `RenewableEnergyChart.vue`, `RotateDeviceOverlay.vue`, `gridOverlay.vue`
- Three of four files use PascalCase (`GridCounter.vue`, `RenewableEnergyChart.vue`, `RotateDeviceOverlay.vue`), while `gridOverlay.vue` uses camelCase. This inconsistency is noted in the plan's Open Questions. Nuxt resolves this correctly, but for codebase consistency, renaming to `GridOverlay.vue` in a follow-up is recommended.

### CSS architecture (no changes)

- `assets/styles.css` -- minimal reset (`body { margin: 0 }`) -- loaded via `nuxt.config.ts` `css` array
- `public/styles.css` -- fluid type/space tokens, `.master-grid`, `.layout-1`, typography -- loaded via `nuxt.config.ts` `app.head.link`
- Scoped styles in `app.vue` -- move to `pages/index.vue` scoped styles

All three layers continue to work identically after migration.

#### Research Insights

**Scoped Style Hash Change (from Vue SFC CSS features documentation):**
- Vue scoped styles work by adding a unique `data-v-[hash]` attribute to elements. The hash is derived from the component's file path. Moving styles from `app.vue` to `pages/index.vue` WILL change the hash value.
- Impact: None for this project. All scoped selectors use class-based selectors (`.page-wrapper`, `.bg-image`, `.source-link`, etc.) which are scoped to their own component. The hash change is cosmetic -- it only affects the attribute value, not the selector matching.
- **Edge case to verify:** If any external CSS or JavaScript targets `data-v-*` attributes directly (unlikely but possible), those would break. A grep for `data-v` in the codebase should confirm no such references exist.

**CSS Loading Order (from architecture-strategist perspective):**
- The current CSS loading chain is:
  1. `assets/styles.css` (via `nuxt.config.ts` `css` array) -- injected into the SSR HTML inline or as a bundled asset
  2. `public/styles.css` (via `nuxt.config.ts` `app.head.link`) -- loaded as an external stylesheet from `/styles.css`
  3. Scoped styles from the page component -- injected inline
- This order is preserved after migration since the page component's scoped styles are still rendered last, maintaining the same cascade.
- **Future consideration:** Loading `public/styles.css` via `app.head.link` as an external file means it is not processed by Vite's CSS pipeline (no minification, no tree-shaking, no HMR). In a future task, consider moving it to `assets/styles.css` or the Nuxt `css` config array for better build integration.

**Accessibility Considerations (from accessibility skill):**
- The current page has accessibility considerations that should be noted (not blockers for this task, but important context):
  - The `<footer>` element contains an `<a>` tag with class `source-link` -- good: it has visible text content.
  - The background image uses `alt="Planet Background"` -- acceptable but could be `alt=""` with `role="presentation"` since it is decorative.
  - The `<h1>` is present and unique on the page -- correct heading structure.
  - The `@keyframes float` animation should respect `prefers-reduced-motion`. Currently it does not. This is a pre-existing issue, not introduced by this migration, but worth a follow-up task.

### Static generation (SSG)

The project uses `nuxt generate` (SSG via `nitro.preset: 'static'`). File-based routing is fully compatible with SSG. Each page in `pages/` will generate a corresponding HTML file in `.output/public/`.

#### Research Insights

**SSG Route Discovery (from Nuxt docs):**
- `nuxt generate` crawls the application to discover routes. With file-based routing active, it will automatically discover `/` from `pages/index.vue` and generate `.output/public/index.html`.
- For future pages (e.g., `/infographics/renewables`), Nuxt will generate HTML files at the corresponding paths (`/infographics/renewables/index.html`).
- **Important for dynamic routes:** When dynamic routes like `[slug].vue` are added later, `nuxt generate` will only pre-render routes it can discover via crawling or explicit configuration. The `nitro.prerender.routes` config or `useRoute()` crawl hints may be needed. Not relevant for this task but important for the `/infographics/[slug]` follow-up.

**Netlify SSG Deployment (from deployment-verification-agent and netlify-deploy skill):**
- The `.output/public/` directory is the publish directory in `netlify.toml`. After this migration, the generated output structure remains identical: a single `index.html` at the root.
- The `/* -> /index.html` redirect with status 200 serves as an SPA fallback. This is correct for the current single-page setup. However, when multiple pages are added later, this catch-all redirect will prevent proper 404 handling. A future task should update this to use Nuxt's generated `404.html` or remove the catch-all in favor of per-route HTML files.

### `netlify.toml` SPA fallback

The current `netlify.toml` has a catch-all redirect `/* -> /index.html` with status 200. This remains correct for SSG with client-side routing fallback. No changes needed for this task.

#### Research Insights

**Security Headers (from security-sentinel perspective):**
- The `netlify.toml` already includes good security headers: `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `X-Content-Type-Options: nosniff`. These are preserved.
- `X-Frame-Options: DENY` will need to change to `SAMEORIGIN` or be made route-specific when the `/embed/<slug>` feature is added (embeds must be iframeable). Not relevant for this task but important to note for the embed layout task.

### gtag plugin compatibility

The `plugins/gtag.client.ts` plugin already uses `useRouter()` and listens to route changes via `router.afterEach()`. Once file-based routing is active, this plugin will correctly fire page view events on navigation. No changes needed.

#### Research Insights

**Potential Double-Fire on Initial Load (from julik-frontend-races-reviewer perspective):**
- The gtag plugin has two page-view triggers:
  1. `router.afterEach()` -- fires on every navigation
  2. `router.isReady().then()` -- fires once when the router is ready
- When file-based routing activates, the initial page load may trigger BOTH handlers: `isReady` resolves, AND `afterEach` fires for the initial navigation to `/`.
- The plugin has a guard (`if (to.fullPath === from.fullPath) return`) in `afterEach`, which should prevent the duplicate since the initial navigation has the same `to` and `from` paths. However, this should be verified by checking the Network tab for duplicate `page_view` events after migration.
- **Note:** The project uses `nuxt-gtag` module (declared in `nuxt.config.ts`). The custom `plugins/gtag.client.ts` appears to be a separate plugin that may conflict with or duplicate the module's built-in tracking. This should be investigated as a follow-up.

**nuxt-gtag Module Overlap:**
- `nuxt.config.ts` declares `modules: ['nuxt-gtag']` with `gtag: { id: 'G-5X2S1H0R18' }`. The `nuxt-gtag` module typically handles page-view tracking automatically.
- The custom `plugins/gtag.client.ts` also tracks page views manually via `useTrackEvent('page_view', ...)`.
- This means page views may already be double-tracked. Activating file-based routing (which triggers more `afterEach` events) could amplify this. Worth investigating but not blocking for this task.

## Acceptance Criteria

- [ ] `pages/` directory exists with `pages/index.vue`
- [ ] `pages/index.vue` contains the full template, scoped styles, and script from the original `app.vue`
- [ ] `app.vue` contains only the Nuxt app shell (`<NuxtPage />` -- see Part 2 Research Insights re: NuxtLayout)
- [ ] `nuxt.config.ts` is unchanged
- [ ] `npm run dev` starts without errors and renders the infographic at `/` identically to before
- [ ] `npm run generate` completes without errors and produces `.output/public/index.html`
- [ ] No `layouts/` directory is created (deferred to follow-up task)
- [ ] All existing components (`RenewableEnergyChart`, `RotateDeviceOverlay`, `GridOverlay`) render correctly
- [ ] The `useHead()` page title and Inter font load correctly
- [ ] The gtag plugin continues to fire `page_view` events

### Research-Enhanced Acceptance Criteria

- [ ] SFC sections in `pages/index.vue` follow canonical ordering: `<script setup>`, `<template>`, `<style scoped>`
- [ ] No duplicate `<link rel="preconnect">` tags in the rendered HTML (verify via View Source)
- [ ] Nuxt DevTools Routes tab shows `pages/index.vue` mapped to `/`
- [ ] `npm run generate` output at `.output/public/index.html` contains the complete infographic markup
- [ ] Background planet animation plays smoothly (no CSS regression from scoped style migration)
- [ ] Browser DevTools console shows no Vue or Nuxt warnings/errors

## Success Metrics

- Zero visual regression: the deployed page at `/` is pixel-identical before and after
- Nuxt dev server shows `pages/index.vue` in the route table (visible in devtools)
- Downstream tasks (BF-3 scaffolding, layout extraction, homepage hub) are unblocked

## Dependencies & Risks

### Dependencies
- None. This task has zero external dependencies. It operates entirely on existing files.

### Risks
- **Low risk: Scoped style specificity** -- Moving scoped styles from `app.vue` to `pages/index.vue` changes the Vue-generated `data-v-*` attribute hash. Since all selectors are class-based and scoped, this is a non-issue. However, visual verification is still required.
- **Low risk: Component name casing** -- `app.vue` uses `<GridOverlay />` but the file is `gridOverlay.vue`. Nuxt's auto-import is case-insensitive for PascalCase usage, so this works. Worth noting for future cleanup but not a risk for this task.

### Research-Discovered Risks

- **Medium risk: NuxtLayout without layouts/ directory** -- The Nuxt 4 documentation states that `<NuxtLayout>` looks for `layouts/default.vue` by default. Without a `layouts/` directory, the component may not render its slot content. The original plan assumes transparent pass-through, but this is not explicitly guaranteed in the docs. **Mitigation:** Use `<NuxtPage />` alone in `app.vue` (without `<NuxtLayout>` wrapping) until `layouts/default.vue` is created in a follow-up task. See Part 2 Research Insights.

- **Low risk: Duplicate preconnect tags** -- Both `nuxt.config.ts` and the page-level `useHead()` declare identical `preconnect` links for Google Fonts. This causes duplicate `<link>` tags in the HTML. **Mitigation:** Remove the preconnect entries from the page-level `useHead()` since they already exist globally. See Part 1 Research Insights.

- **Low risk: `svh` unit browser support** -- The `@keyframes float` animation uses `svh` (small viewport height) units. This is a relatively new CSS unit. As of 2025, `svh` has good support in modern browsers but may not work in older versions of Safari (< 15.4) or Chrome (< 108). **Mitigation:** Not introduced by this migration (pre-existing). Document as a follow-up if wider browser support is needed.

- **Low risk: gtag double-tracking** -- The project uses both `nuxt-gtag` module and a custom `plugins/gtag.client.ts` plugin. Both may track page views, leading to inflated analytics. Activating routing may amplify this. **Mitigation:** Investigate and potentially remove the custom plugin in a follow-up task, relying solely on `nuxt-gtag`.

- **Low risk: X-Frame-Options incompatibility with future embeds** -- The `netlify.toml` header `X-Frame-Options: DENY` will block iframing. When the `/embed/<slug>` feature is built, this header must become route-specific. **Mitigation:** Not relevant for this task. Note for the embed layout task.

## MVP

### pages/index.vue

```vue
<script setup>
import { useHead } from '#app'

useHead({
  title: 'Renewables on the Rise',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap' }
  ]
})
</script>

<template>
  <div class="page-wrapper | master-grid layout-1">
    <RotateDeviceOverlay />
    <GridOverlay />
    <div class="description">
      <h1 class="title">Renewables on the Rise</h1>
      <p>Amid rising concerns about climate change and energy security, a growing number of states have invested in expanding renewable energy infrastructure. This has been especially visible in the Indo-Pacific, where several countries have become global leaders in solar, wind, hydroelectric and geothermal power generation. However, not every state in the region has embraced renewables so enthusiastically. This infographic displays the 2024 renewable energy usage percentages of the region's largest economies, alongside those of the United States and European Union.</p>
      <p class="source-description"><em>Percentage of electricity produced from renewable sources, which include solar, wind, hydropower, bioenergy, geothermal, wave, and tidal.</em></p>
    </div>
    <RenewableEnergyChart class="chart"/>
    <div class="bg-image">
      <img src="@/assets/images/background.png" alt="Planet Background" />
    </div>
    <footer>
      <a href="https://ourworldindata.org/grapher/share-of-electricity-production-from-renewable-sources?time=earliest..2024&country=CHN~JPN~IND~KOR~AUS~IDN~TWN~THA~USA~EU+%28Ember%29" target="_blank" rel="noopener noreferrer" class="source-link">Source: Our World in Data</a>
      <img src="@/assets/images/bfna.svg" alt="BFNA Logo" class="bfna-logo-footer" />
    </footer>
  </div>
</template>

<style scoped>
/* All scoped styles from current app.vue -- cut-and-pasted verbatim */
</style>
```

**Note:** The SFC sections above are in the canonical Vue/Nuxt order: `<script>`, `<template>`, `<style>`. The actual scoped styles are indicated by the comment placeholder -- during implementation, the full styles from the current `app.vue` must be copied verbatim.

### app.vue (after)

```vue
<template>
  <NuxtPage />
</template>
```

**Note:** This uses `<NuxtPage />` alone, without `<NuxtLayout>` wrapping. See Part 2 Research Insights for the rationale. `<NuxtLayout>` should be added in the same task that creates `layouts/default.vue`.

## Verification Checklist

Before claiming this task is complete, the implementer MUST execute and verify each of the following:

### Pre-Migration Baseline
- [ ] Take a screenshot of the current page at `http://localhost:3000/`
- [ ] Note the current `data-v-*` attribute hash on `.page-wrapper` (for reference, not for matching)
- [ ] Run `npm run generate` and confirm it succeeds (baseline)

### Post-Migration Verification
- [ ] `npm run dev` starts without errors
- [ ] Page at `http://localhost:3000/` renders identically to the baseline screenshot
- [ ] Browser DevTools console shows zero errors and zero warnings
- [ ] View Source confirms: `<title>Renewables on the Rise</title>` is present
- [ ] View Source confirms: Inter font stylesheet `<link>` is present
- [ ] Nuxt DevTools > Routes shows `pages/index.vue` mapped to `/`
- [ ] `npm run generate` completes with exit code 0
- [ ] `.output/public/index.html` exists and contains the infographic markup
- [ ] Network tab shows gtag `page_view` event fires on load
- [ ] Background planet animation floats smoothly
- [ ] Footer is positioned at bottom with source link and BFNA logo

## Open Questions for Implementer

1. **GridOverlay casing**: The component file is `gridOverlay.vue` (camelCase) but used as `<GridOverlay />` (PascalCase). Nuxt handles this, but should the file be renamed to `GridOverlay.vue` for consistency? This is optional cleanup, not required for this task.

2. **Inter font in `useHead()`**: The renewables page loads Inter via `useHead()`, but the global config loads Encode Sans. Should Inter be promoted to the global config if future infographics also use it, or kept page-local? This is a decision for the layout extraction task, not this one.

3. **NuxtLayout inclusion (NEW):** Should `app.vue` include `<NuxtLayout>` wrapping now (with risk of rendering issues) or defer it to the layout extraction task? Research recommends deferring -- see Part 2 Research Insights.

4. **Duplicate preconnect cleanup (NEW):** Should the duplicate `preconnect` entries be removed from the page-level `useHead()` in this task, or deferred? Research recommends removing them since they already exist in `nuxt.config.ts`.

5. **nuxt-gtag vs custom plugin overlap (NEW):** The project has both `nuxt-gtag` module and a custom `plugins/gtag.client.ts`. Should the custom plugin be investigated/removed in this task or deferred? Research recommends deferring to a separate analytics cleanup task.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md](docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md) -- Key decisions carried forward: Nuxt file-based routing activation via `pages/` directory, app shell pattern (`<NuxtLayout><NuxtPage />`), migration path step 1-2
- **Related epic:** [docs/epics/BF-3-phase-1-scaffolding.md](docs/epics/BF-3-phase-1-scaffolding.md) -- This task fulfills the first sub-task ("Create `pages/` directory + `pages/index.vue`")
- **Existing codebase files:**
  - `app.vue` -- current monolithic entry point (source of truth for migration)
  - `nuxt.config.ts` -- global config, unchanged by this task
  - `components/RenewableEnergyChart.vue` -- main chart component, auto-imported
  - `components/RotateDeviceOverlay.vue` -- rotate overlay, auto-imported
  - `components/gridOverlay.vue` -- grid overlay, auto-imported
  - `plugins/gtag.client.ts` -- analytics plugin, already uses `useRouter()`
  - `public/styles.css` -- fluid tokens and grid system
  - `assets/styles.css` -- body reset
  - `netlify.toml` -- deployment config, unchanged

### Research References (added during deepening)

- [Nuxt 4 Pages Directory Structure](https://nuxt.com/docs/4.x/directory-structure/app/pages)
- [Nuxt 4 Routing](https://nuxt.com/docs/4.x/getting-started/routing)
- [Nuxt 4 app.vue Documentation](https://nuxt.com/docs/4.x/directory-structure/app/app)
- [Nuxt 4 NuxtLayout Component](https://nuxt.com/docs/4.x/api/components/nuxt-layout)
- [Nuxt 4 Layouts](https://nuxt.com/docs/4.x/directory-structure/app/layouts)
- [Nuxt 4 SEO and Meta](https://nuxt.com/docs/4.x/getting-started/seo-meta)
- [Nuxt 4 useHead Composable](https://nuxt.com/docs/api/composables/use-head)
- [Nuxt 4 useSeoMeta Composable](https://nuxt.com/docs/4.x/api/composables/use-seo-meta)
- [Nuxt 4 Migration: Pages and Layouts](https://nuxt.com/docs/4.x/migration/pages-and-layouts)
- [Nuxt on Netlify Deployment Guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/nuxt/)
- [Vue SFC CSS Scoped Styles](https://vuejs.org/api/sfc-css-features)
- [Nuxt SEO: Page Titles](https://nuxtseo.com/learn/mastering-meta/titles)
- [Deploy Nuxt to Netlify](https://nuxt.com/deploy/netlify)
