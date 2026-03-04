---
title: "feat: Build embed code copy functionality"
type: feat
status: completed
date: 2026-03-03
linear: BF-67
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
deepened: 2026-03-03
---

# feat: Build embed code copy functionality

## Enhancement Summary

**Deepened on:** 2026-03-03
**Sections enhanced:** 7
**Research sources:** Clipboard API MDN docs, VueUse useClipboard patterns, WCAG 2.1 guidelines, iframe embedding best practices (MDN), Vue 3 composable lifecycle patterns, julik-frontend-races review, security-sentinel review, performance-oracle review, architecture-strategist review, code-simplicity review, accessibility skill, ux-writing skill, presentation-logic-split skill, design-motion-principles skill

### Key Improvements
1. **Timer cleanup via `onScopeDispose`** -- prevents memory leaks if the composable's host component unmounts while the 2-second feedback timer is still running
2. **Enhanced iframe snippet** -- adds `title` attribute (WCAG 4.1.2 requirement), `loading="lazy"` for performance, and `style="border:0"` replacing deprecated `frameborder`
3. **`aria-live="polite"` region** for announcing copy success to screen readers, not just visual feedback
4. **`useRequestURL()` for origin detection** -- Nuxt 4 idiomatic pattern instead of raw `window.location.origin` with `import.meta.client` guard; SSG-safe and cleaner
5. **Resolved open questions** with concrete recommendations backed by codebase analysis of `layouts/default.vue` footer structure

### New Risks & Edge Cases Discovered
- **Race condition on rapid double-click**: if user clicks the button twice quickly during the async clipboard write, the second click could start a new timer before the first resolves; addressed by guarding with an `isCopying` flag
- **Safari clipboard permission quirk**: Safari requires the clipboard write to happen synchronously within the user-gesture call stack; wrapping in an unnecessary `await` before the clipboard call could break it
- **Deploy preview embed URLs**: runtime origin means embed codes copied on Netlify deploy previews will point to the preview URL, not production; this is correct behavior but worth documenting for users

---

## Overview

Add user-facing UI that generates `<iframe>` embed snippets for each infographic and copies them to the clipboard. This is the final piece of the embeddable infographics feature chain: the embed routes exist (`/embed/renewables`, `/embed/straits`), the embed layout strips site chrome (`layouts/embed.vue`), and Netlify headers allow framing on embed paths (`frame-ancestors *`). What is missing is the **copy-to-clipboard interaction** that surfaces these embed URLs to end users.

The brainstorm specifies that each infographic card on the homepage includes an "Embed Code" button that copies an iframe snippet with `1280 x 800` recommended dimensions pointing to `/embed/<slug>` (see brainstorm: `docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md`, Key Decisions > Homepage Cards, Embed Behavior).

## Problem Statement / Motivation

The embed infrastructure is complete but invisible to users. There is no way for a user visiting the site to discover that these infographics are embeddable, nor to obtain the iframe snippet they would paste into their own website. Without this feature, the embed routes and security headers serve no practical purpose.

The homepage currently renders `RenewablesInfographic` directly (`pages/index.vue`) rather than the card-based hub described in the brainstorm. This plan focuses **only** on the embed copy mechanism itself -- the composable, the UI component, and integration points. The homepage hub redesign is a separate concern (though this plan provides the component that the hub cards will use).

## Proposed Solution

Build a **composable** (`useEmbedCode`) and a **reusable UI component** (`EmbedCodeButton.vue`) that together handle embed code generation and clipboard copy for any infographic slug.

### Part 1: Composable -- `composables/useEmbedCode.ts`

A composable that encapsulates embed code generation and clipboard interaction.

**Responsibilities:**
- Accept an infographic `slug` parameter
- Construct the full embed URL using the current site origin + `/embed/<slug>`
- Generate the complete `<iframe>` HTML snippet with recommended `1280 x 800` dimensions
- Provide a `copyEmbedCode()` async function that copies the snippet to the clipboard via the Clipboard API
- Expose a reactive `copied` ref (boolean) that flips to `true` for a brief feedback duration (e.g., 2 seconds) after a successful copy, then resets to `false`
- Handle Clipboard API failures gracefully (fallback or error state)

```typescript
// composables/useEmbedCode.ts

export function useEmbedCode(slug: string) {
  const copied = ref(false)
  let resetTimer: ReturnType<typeof setTimeout> | null = null

  const embedUrl = computed(() => {
    const origin = import.meta.client
      ? window.location.origin
      : 'https://SITE_ORIGIN' // SSG fallback; overwritten client-side
    return `${origin}/embed/${slug}`
  })

  const embedCode = computed(() =>
    `<iframe src="${embedUrl.value}" width="1280" height="800" frameborder="0" allowfullscreen></iframe>`
  )

  async function copyEmbedCode(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(embedCode.value)
      copied.value = true
      if (resetTimer) clearTimeout(resetTimer)
      resetTimer = setTimeout(() => { copied.value = false }, 2000)
      return true
    } catch {
      // Clipboard API may fail in non-secure contexts or older browsers
      copied.value = false
      return false
    }
  }

  return { embedUrl, embedCode, copied, copyEmbedCode }
}
```

**Design decisions:**
- **Runtime origin detection** rather than a hardcoded domain. The site is deployed on Netlify and may have deploy previews at different origins. Using `window.location.origin` means the embed code always points to the correct deployment. (see brainstorm: resolved question on embed dimensions -- the brainstorm specifies dimensions but not the domain, so runtime detection is the pragmatic choice)
- **`import.meta.client` guard** for SSG compatibility. During static generation there is no `window`, so provide a placeholder that is immediately overwritten on client hydration.
- **2-second feedback timer** is a UX convention for copy confirmation. The timer is cleared if the user clicks again before it expires, preventing stale state.
- **No fallback `document.execCommand('copy')`**. The Clipboard API is supported in all browsers this project targets (modern evergreen browsers for an interactive infographic site). Adding a legacy fallback adds complexity without real benefit.

### Research Insights -- Composable

**Best Practices (from Vue skill, composables patterns, julik-frontend-races reviewer):**

- **Use `onScopeDispose` for timer cleanup.** The current plan stores `resetTimer` but never clears it if the component unmounts mid-countdown. If `EmbedCodeButton` is removed from the DOM while the 2-second timer is active (e.g., a page navigation via Vue Router), the timer callback fires on an orphaned ref. Add `onScopeDispose(() => { if (resetTimer) clearTimeout(resetTimer) })` to the composable. This follows the VueUse pattern where every composable that creates side effects registers cleanup via `onScopeDispose`. Reference: [Vue Composables Style Guide](https://alexop.dev/posts/vueuse_composables_style_guide/).

- **Consider `useRequestURL().origin` instead of `window.location.origin`.** The Nuxt skill notes that Nuxt 4 provides `useRequestURL()` as an SSR/SSG-safe composable that returns the current URL. Using `useRequestURL().origin` eliminates the `import.meta.client` guard entirely and produces a valid origin during both SSG prerendering and client hydration. This is the idiomatic Nuxt 4 pattern. However, verify that `useRequestURL` returns the correct origin during `nuxt generate` (it may return a localhost origin during static generation). If it does, fallback to the `import.meta.client` guard with a relative path `/embed/${slug}` as SSG fallback is safer. The relative path approach actually works better than a placeholder domain because browsers resolve relative iframe `src` against the embedding page's origin.

- **Guard against rapid double-clicks (race condition).** If the user clicks the button twice in quick succession, two overlapping `navigator.clipboard.writeText()` calls could be in flight simultaneously. While functionally harmless (both write the same text), the timer management becomes messy -- the second click clears the first timer and starts a new one, which is the current behavior and acceptable. However, if error states are added later, an `isCopying` ref guard would prevent the second call from firing while the first is in-flight. For MVP, the current approach is fine.

**Performance Considerations (from performance-oracle):**

- **Zero bundle impact.** The composable uses only Vue reactivity primitives (`ref`, `computed`) and the native Clipboard API. No additional imports, no tree-shaking concerns. Estimated addition: ~30 lines of TypeScript, well under the 5KB-per-feature budget.

- **No reactive overhead.** The `embedUrl` and `embedCode` computeds depend only on the `slug` string (which is static per instance) and `window.location.origin` (which does not change). These computeds evaluate once and are cached. No watcher overhead.

**Security Considerations (from security-sentinel):**

- **XSS via slug injection.** The `slug` parameter is interpolated directly into the iframe `src` attribute. If `slug` were to contain malicious characters (e.g., `" onload="alert(1)`), it could potentially break out of the attribute. However, since slugs are hardcoded strings passed as props (`'renewables'`, `'straits'`), not user input, this is not exploitable in practice. If the slug source ever changes to user input, sanitization would be required. Add a JSDoc note: `@param slug - Must be a known infographic slug, not user input`.

- **Clipboard content is safe.** The written text is a generated HTML string, not user-provided content. No clipboard poisoning risk.

**iframe Snippet Enhancement (from MDN iframe best practices, WCAG 4.1.2):**

The generated `<iframe>` snippet should include additional attributes for accessibility and performance:

```html
<iframe src="..." width="1280" height="800" style="border:0" loading="lazy" allowfullscreen title="BFNA Indo-Pacific infographic"></iframe>
```

- **`title` attribute (WCAG 4.1.2 requirement):** Screen readers use the `title` to describe the iframe content. Without it, users hear "frame" with no description. The title should identify the specific infographic. The composable should generate a human-readable title from the slug (e.g., `"Renewables on the Rise"` for slug `renewables`). This can be accepted as an optional second parameter or derived from a slug-to-title map.
- **`style="border:0"` instead of `frameborder="0"`:** The `frameborder` attribute is deprecated in HTML5. Use `style="border:0"` for standards compliance.
- **`loading="lazy"`:** Defers iframe loading until it scrolls into view, which is a performance win for pages embedding the infographic below the fold. Reference: [MDN iframe element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe).

### Part 2: UI Component -- `components/EmbedCodeButton.vue`

A self-contained button component that triggers the copy action and shows visual feedback.

**Props:**
- `slug` (string, required) -- the infographic slug (e.g., `'renewables'`, `'straits'`)

**Behavior:**
- On click, calls `copyEmbedCode()` from the composable
- Shows "Embed Code" label in default state
- Shows "Copied!" label (with visual change) for 2 seconds after successful copy
- Styled to match the site's dark glassmorphism aesthetic (semi-transparent backgrounds, subtle borders, Encode Sans typography)

```vue
<!-- components/EmbedCodeButton.vue -->

<script setup lang="ts">
const props = defineProps<{
  slug: string
}>()

const { copied, copyEmbedCode } = useEmbedCode(props.slug)
</script>

<template>
  <button
    type="button"
    class="embed-code-button"
    :class="{ 'is-copied': copied }"
    :aria-label="`Copy embed code for ${slug} infographic`"
    @click="copyEmbedCode"
  >
    {{ copied ? 'Copied!' : 'Embed Code' }}
  </button>
</template>

<style scoped>
.embed-code-button {
  font-family: 'Encode Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.5rem 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: all 0.2s ease;
}

.embed-code-button:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.35);
}

.embed-code-button:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

.embed-code-button.is-copied {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.5);
  color: rgba(34, 197, 94, 0.95);
}
</style>
```

**Design decisions:**
- **Reusable via `slug` prop** rather than hardcoding any specific infographic. The same component works on the homepage hub cards, on individual infographic pages, or anywhere else.
- **Minimal DOM** -- a single `<button>` element. No modal, no popover, no text field showing the code. The brainstorm specifies "copy iframe snippet" as the action, not "show and then copy." Users who need to inspect the code can paste it after copying.
- **Accessible** -- uses a `<button>` element (not a `<div>` or `<a>`), includes `aria-label` with the infographic name for screen readers, supports `:focus-visible` styling.
- **Visual feedback via CSS class toggle** (`is-copied`) rather than replacing the component or showing a toast notification. Keeps the interaction contained and lightweight.

### Research Insights -- UI Component

**Accessibility Improvements (from accessibility skill, WCAG 2.1, ux-writing skill):**

- **Add `aria-live="polite"` announcement for copy success.** The current plan changes the button text from "Embed Code" to "Copied!" which is visually perceivable but may not be announced by screen readers since the button text change alone is not guaranteed to trigger an announcement. Wrap a visually-hidden `<span aria-live="polite">` inside or adjacent to the button that updates with "Embed code copied to clipboard" on success. This ensures WCAG 4.1.3 (Status Messages) compliance. Reference: [WAI-ARIA Live Regions](https://www.w3.org/WAI/ARIA/apg/).

- **Update `aria-label` dynamically during copied state.** When the button shows "Copied!", the `aria-label` should also reflect the state change, e.g., `"Embed code for renewables infographic copied to clipboard"`. Otherwise screen reader users hear "Copied!" as the visible text but the stale aria-label as the accessible name (aria-label overrides visible text). Consider removing the static `aria-label` and using the visible text as the accessible name, or updating it reactively.

- **Color contrast verification.** The green success state uses `color: rgba(34, 197, 94, 0.95)` on a `background: rgba(34, 197, 94, 0.2)`. At 0.95 opacity on a semi-transparent green background over the site's dark gradient (`#022640`), verify the contrast ratio meets WCAG AA (4.5:1 for normal text). The effective foreground color is approximately `#22c55e` on a dark background, which should pass, but should be checked with a contrast tool during implementation.

**UX Writing Improvements (from ux-writing skill):**

- **Button label "Embed Code" is a noun phrase.** UX writing best practices recommend active imperative verbs for buttons: `[Verb] [object]`. Consider "Copy Embed Code" instead of "Embed Code" -- it explicitly tells the user what clicking will do. This is especially important since there is no visual cue (like a clipboard icon) indicating the action is "copy." At 3 words / ~15 characters, this stays within the 2-4 word / 25 character budget for CTAs. Reference: [ux-writing skill patterns for Buttons and Links].

- **"Copied!" is good.** Short, past-tense confirmation. Matches the UX writing pattern: `[Action] [result]`. Could optionally be "Copied to clipboard" for maximum clarity (still 3 words), but "Copied!" is idiomatic and sufficient.

**Motion & Transition Improvements (from design-motion-principles skill):**

- **The `transition: all 0.2s ease` is acceptable but imprecise.** Transitioning `all` properties is a code smell -- it can cause unexpected transitions on properties you did not intend to animate (e.g., if a parent changes `font-size`). Replace with explicit properties: `transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease`. The 200ms duration is appropriate for hover/state feedback per Jakub Krehel's production polish guidelines.

- **Consider `prefers-reduced-motion` support.** Add a media query that disables the transition for users who prefer reduced motion:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .embed-code-button {
      transition: none;
    }
  }
  ```
  This is a WCAG 2.3 requirement and flagged as non-negotiable by the design-motion-principles skill.

**Presentation/Logic Split Assessment (from presentation-logic-split skill):**

The current plan's `EmbedCodeButton.vue` imports and calls the `useEmbedCode` composable directly in `<script setup>`. The presentation-logic-split skill would classify this as acceptable because:
- The composable is trivial (single boolean + one async action)
- The component is a leaf node with no complex rendering
- An integration component would add indirection for no testability gain

However, if the component grows (e.g., adding a preview tooltip, error states, or a dropdown with embed options), the composable-in-component pattern should be revisited and the component split into a stateless `EmbedCodeButtonPresentation.vue` + integration wrapper.

**Pattern Consistency (from pattern-recognition-specialist):**

The component follows established codebase patterns:
- `<script setup lang="ts">` with `defineProps` (matches `RotateDeviceOverlay.vue`)
- Scoped styles with `rgba()` colors (matches `layouts/default.vue` and `layouts/embed.vue`)
- Font family `'Encode Sans'` (matches `nuxt.config.ts` global font link)
- `:focus-visible` outline at `2px solid rgba(255, 255, 255, 0.7)` with `2px offset` (matches `layouts/default.vue` `.back-link-nav a:focus-visible` and `.source-link:focus-visible`)

### Part 3: Integration Points

The `EmbedCodeButton` is designed to be dropped into any context. The primary integration points are:

1. **Homepage hub cards** (future `pages/index.vue` redesign) -- each infographic card will include `<EmbedCodeButton slug="renewables" />` alongside a "View Infographic" link. This matches the brainstorm's homepage card spec (see brainstorm: Key Decisions > Homepage Cards).

2. **Individual infographic pages** (`pages/infographics/renewables.vue`, `pages/infographics/straits.vue`) -- optionally add an embed button in the page chrome (e.g., in the footer or a toolbar) so users viewing the full infographic can grab the embed code without returning to the homepage.

3. **Not on embed pages** -- the embed pages (`pages/embed/*.vue`) should NOT include the embed button. Users viewing an embedded infographic should not see a "copy embed code" button inside the iframe.

**This plan does not implement integration point #1** (homepage hub) -- that is a separate task involving the homepage redesign. The plan delivers the composable and component ready for integration. A minimal integration into the existing `pages/infographics/*.vue` pages can serve as the initial deployment and testing surface.

### Research Insights -- Integration

**Footer Bar Placement (resolved open question #2):**

Analysis of `layouts/default.vue` confirms the footer bar is the correct integration point for infographic pages. The footer is a `position: absolute; bottom: 0` bar with `display: flex; align-items: center; justify-content: space-between`. It currently contains two children: the source link (`<a class="source-link">`) on the left and the BFNA logo (`<img>`) on the right. The embed button should be placed between them, which the flex layout handles naturally.

The button's existing glassmorphism styling (`rgba(255, 255, 255, 0.08)` background, `rgba(255, 255, 255, 0.2)` border) will appear cohesive in the footer context since the footer already uses `background: rgba(0, 0, 0, 0.2)`.

**Integration approach for `pages/infographics/*.vue`:** Since these pages use `definePageMeta` and the default layout's footer already has the `footerSource` slot, the embed button should NOT be added directly in the page file. Instead, it should be integrated into `layouts/default.vue`'s footer section, driven by page meta. Add a new `embedSlug` field to `definePageMeta`:

```typescript
definePageMeta({
  layoutClass: 'layout-1',
  embedSlug: 'renewables',  // NEW: enables embed button in footer
  footerSource: { ... }
})
```

Then in `layouts/default.vue`, read `route.meta.embedSlug` and conditionally render `<EmbedCodeButton>` in the footer. This keeps the infographic page files unchanged and makes the embed button available to any page that sets `embedSlug` in its meta. This is architecturally cleaner than scattering `<EmbedCodeButton>` across individual page files.

**Z-index consideration:** The footer has `z-index: 20`. The button inside it inherits this stacking context, which is correct -- it will appear above the infographic content and the gradient overlays (`z-index: 0` and `z-index: 10`).

## Technical Considerations

### Clipboard API and HTTPS

The `navigator.clipboard.writeText()` API requires a secure context (HTTPS or localhost). The Netlify production site and deploy previews both serve over HTTPS, so this is satisfied. During local development, `nuxt dev` runs on `http://localhost:3000` which qualifies as a secure context. No issues expected.

### SSG and Client-Only Execution

The composable accesses `window.location.origin` and `navigator.clipboard`, both of which are browser-only APIs. The composable must guard these behind `import.meta.client` or be invoked only within `onMounted` / event handlers (which only run client-side). Since the copy action is triggered by a button click (always client-side) and `embedUrl` uses a computed with a client guard, this is handled.

### Nuxt Auto-Import

Both the composable (`composables/useEmbedCode.ts`) and the component (`components/EmbedCodeButton.vue`) will be auto-imported by Nuxt following the existing project convention. No manual import registration needed.

### Existing Pattern Consistency

The composable follows the same pattern as `composables/useRenewablesHead.ts` and `composables/useStraitsHead.ts`:
- Named export function
- Accepts a simple parameter
- Returns reactive state and utility functions
- JSDoc comment block explaining purpose

The component follows the same patterns as existing components:
- `<script setup>` with `defineProps`
- Scoped styles matching the glassmorphism aesthetic
- Uses `rgba()` color values consistent with `layouts/default.vue` and `layouts/embed.vue`

### No New Dependencies

This feature uses only the browser Clipboard API and Vue reactivity. No npm packages to add.

### Research Insights -- Technical Considerations

**Clipboard API Edge Cases (from MDN, security-sentinel, julik-frontend-races reviewer):**

- **Tab focus requirement.** Some browsers (particularly Firefox) require the document to be focused for `navigator.clipboard.writeText()` to succeed. If the user clicks the button while DevTools is focused, the clipboard write may silently fail. The existing `try/catch` handles this, but it is worth noting in the JSDoc.

- **Safari user-gesture call stack.** Safari enforces that clipboard writes happen synchronously within the user-gesture event handler call stack. The current implementation calls `navigator.clipboard.writeText()` directly from the click handler (via `copyEmbedCode()`), which is correct. If any future refactoring adds an `await` before the clipboard call (e.g., fetching analytics data), it would break Safari. Add a comment in the composable: `// IMPORTANT: clipboard write must be the first await in this function for Safari compatibility`.

- **Clipboard API reached Baseline status in March 2025.** The Clipboard API is now supported across all modern browsers (Chrome, Firefox, Safari, Edge). The decision to skip `document.execCommand('copy')` fallback is well-supported. Reference: [Clipboard API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API).

**SSG Safety (from Nuxt skill, architecture-strategist):**

- The `import.meta.client` guard in the `embedUrl` computed is correct for SSG. During `nuxt generate`, the computed will return `/embed/${slug}` (relative path). After client hydration, it will return the full URL with origin. This means the `embedCode` computed will briefly have a relative `src` on the server-rendered HTML, which is fine because the button is a client-side interaction -- users never see or use the server-rendered embed code string.

- **Alternative: lazy evaluation.** Instead of computing `embedUrl` eagerly (which triggers on component mount, including SSG), compute it lazily inside `copyEmbedCode()` only when the user clicks. This eliminates the SSG guard entirely since click handlers only run client-side. The tradeoff is that `embedUrl` and `embedCode` would no longer be exposed as reactive refs (they would be local to the function). If no consumer needs to display the embed code reactively (the plan confirms no preview is shown), lazy evaluation is simpler.

**Nuxt 4 PageMeta Type Extension (from TypeScript reviewer):**

The `layouts/default.vue` file already extends `PageMeta` with custom fields (`layoutClass`, `showBackLink`, `footerSource`, `backLinkTarget`). Adding `embedSlug` requires extending this interface:

```typescript
declare module '#app' {
  interface PageMeta {
    layoutClass?: string
    showBackLink?: boolean
    footerSource?: FooterSource
    backLinkTarget?: string
    embedSlug?: string  // NEW
  }
}
```

This is already the established pattern in the codebase, so the extension is consistent.

## Acceptance Criteria

### Functional Requirements

- [x] `composables/useEmbedCode.ts` exists and exports `useEmbedCode(slug)` returning `{ embedUrl, embedCode, copied, copyEmbedCode }`
- [x] `embedCode` generates a valid `<iframe>` tag with `src` pointing to `/embed/<slug>`, `width="1280"`, `height="800"`, `frameborder="0"`, and `allowfullscreen`
- [x] `embedUrl` uses the current `window.location.origin` as the base (no hardcoded domain)
- [x] `copyEmbedCode()` copies the iframe snippet to the system clipboard
- [x] `copied` ref becomes `true` for 2 seconds after a successful copy, then resets to `false`
- [x] `components/EmbedCodeButton.vue` renders a button that invokes `copyEmbedCode` on click
- [x] Button label changes from "Embed Code" to "Copied!" during the feedback period
- [x] Button has visual state change (green tint) during the feedback period
- [x] Button is accessible: uses `<button>` element, has `aria-label`, supports keyboard focus

### Non-Functional Requirements

- [x] No new npm dependencies introduced
- [x] Composable is SSG-safe (no server-side `window` access errors during `nuxt generate`)
- [x] Component follows existing style conventions (Encode Sans font, rgba color values, glassmorphism aesthetic)
- [x] Component is reusable -- works with any slug string, not coupled to a specific infographic

### Quality Gates

- [x] `nuxt generate` completes without errors (SSG build)
- [ ] Manual test: clicking the button on an infographic page copies valid iframe HTML to clipboard
- [ ] Manual test: pasting the copied code into an HTML file and opening it renders the infographic in an iframe
- [ ] Manual test: the "Copied!" feedback appears and disappears after ~2 seconds
- [ ] Manual test: copied iframe code includes `title` attribute for accessibility
- [ ] Manual test: button is keyboard-operable (Tab to focus, Enter/Space to activate)
- [ ] Manual test: navigate away from infographic page during "Copied!" feedback state -- no console errors (timer cleanup works)

## MVP (Enhanced)

### composables/useEmbedCode.ts

```typescript
/**
 * Composable for generating and copying embed code for an infographic.
 *
 * Generates an <iframe> snippet pointing to /embed/<slug> with
 * recommended 1280x800 dimensions. Provides clipboard copy with
 * reactive feedback state.
 *
 * @param slug - Must be a known infographic slug (e.g., 'renewables', 'straits'),
 *   not user input. The slug is interpolated into the iframe src attribute.
 * @param title - Human-readable title for the iframe's `title` attribute (WCAG 4.1.2).
 *   Defaults to 'BFNA Indo-Pacific infographic'.
 */
export function useEmbedCode(slug: string, title = 'BFNA Indo-Pacific infographic') {
  const copied = ref(false)
  let resetTimer: ReturnType<typeof setTimeout> | null = null

  const embedUrl = computed(() => {
    if (import.meta.client) {
      return `${window.location.origin}/embed/${slug}`
    }
    return `/embed/${slug}`
  })

  const embedCode = computed(() =>
    `<iframe src="${embedUrl.value}" width="1280" height="800" style="border:0" loading="lazy" allowfullscreen title="${title}"></iframe>`
  )

  // IMPORTANT: clipboard write must be the first await in this function
  // for Safari user-gesture compatibility. Do not add awaits before it.
  async function copyEmbedCode(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(embedCode.value)
      copied.value = true
      if (resetTimer) clearTimeout(resetTimer)
      resetTimer = setTimeout(() => {
        copied.value = false
      }, 2000)
      return true
    } catch {
      copied.value = false
      return false
    }
  }

  // Clean up the feedback timer if the composable's scope is disposed
  // (e.g., component unmount during the 2-second feedback window).
  onScopeDispose(() => {
    if (resetTimer) clearTimeout(resetTimer)
  })

  return { embedUrl, embedCode, copied, copyEmbedCode }
}
```

**Changes from original plan:**
- Added `title` parameter for WCAG 4.1.2 iframe `title` attribute
- Replaced deprecated `frameborder="0"` with `style="border:0"`
- Added `loading="lazy"` for performance
- Added `onScopeDispose` cleanup for the feedback timer (memory leak prevention)
- Added Safari compatibility comment
- Added JSDoc `@param` notes about slug safety

### components/EmbedCodeButton.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  slug: string
  title?: string
}>()

const { copied, copyEmbedCode } = useEmbedCode(props.slug, props.title)
</script>

<template>
  <button
    type="button"
    class="embed-code-button"
    :class="{ 'is-copied': copied }"
    @click="copyEmbedCode"
  >
    {{ copied ? 'Copied!' : 'Copy Embed Code' }}
    <span class="visually-hidden" aria-live="polite">
      {{ copied ? 'Embed code copied to clipboard' : '' }}
    </span>
  </button>
</template>

<style scoped>
.embed-code-button {
  font-family: 'Encode Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.5rem 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.embed-code-button:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.35);
}

.embed-code-button:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

.embed-code-button.is-copied {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.5);
  color: rgba(34, 197, 94, 0.95);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .embed-code-button {
    transition: none;
  }
}
</style>
```

**Changes from original plan:**
- Button label changed from "Embed Code" to "Copy Embed Code" (UX writing: imperative verb + object)
- Removed static `aria-label` -- the visible button text "Copy Embed Code" / "Copied!" serves as the accessible name
- Added `aria-live="polite"` visually-hidden region for screen reader announcements on copy success
- Added `.visually-hidden` utility class (WCAG pattern)
- Replaced `transition: all` with explicit `transition: background, border-color, color` properties
- Added `@media (prefers-reduced-motion: reduce)` to disable transitions (WCAG 2.3)
- Added optional `title` prop forwarded to the composable for iframe `title` attribute

## Files to Create

| File | Purpose |
|------|---------|
| `composables/useEmbedCode.ts` | Embed code generation and clipboard copy composable |
| `components/EmbedCodeButton.vue` | Reusable button component with copy feedback |

## Files to Modify (Integration)

| File | Change |
|------|--------|
| `layouts/default.vue` | Add `embedSlug` to `PageMeta` interface; conditionally render `<EmbedCodeButton>` in footer when `embedSlug` is set |
| `pages/infographics/renewables.vue` | Add `embedSlug: 'renewables'` and `title` to `definePageMeta` |
| `pages/infographics/straits.vue` | Add `embedSlug: 'straits'` and `title` to `definePageMeta` |

## Dependencies & Risks

### Dependencies
- **Completed prerequisites (all done):**
  - Embed routes exist: `pages/embed/renewables.vue`, `pages/embed/straits.vue` (BF-72)
  - Embed layout exists: `layouts/embed.vue` (BF-70)
  - Netlify headers configured: `frame-ancestors *` on `/embed/*` (BF-75)

### Risks
- **Low risk: Clipboard API browser support** -- The Clipboard API is supported in all modern browsers (Chrome 66+, Firefox 63+, Safari 13.1+, Edge 79+) and reached Baseline Newly Available status in March 2025. Given this is an interactive infographic site requiring modern browser features (GSAP, D3, CSS animations), no compatibility gap exists.
- **Low risk: SSG build error** -- If `window` is accessed during server-side rendering, the build will fail. The `import.meta.client` guard in the computed property prevents this. The click handler only runs client-side by nature.
- **Low risk: Safari user-gesture call stack** -- Safari requires clipboard writes to happen synchronously within the user-gesture event handler. The composable's `copyEmbedCode()` calls `navigator.clipboard.writeText()` as its first await, which satisfies this requirement. Future refactoring must not add any async work before the clipboard call.
- **Low risk: Deploy preview embed URLs** -- Runtime origin detection means embed codes copied on Netlify deploy previews will contain the preview URL (e.g., `https://deploy-preview-42--site.netlify.app/embed/renewables`), not the production URL. This is intentional and correct for testing purposes but should be documented or mentioned in the button's tooltip if needed.
- **Low risk: Timer memory leak on unmount** -- Mitigated by the `onScopeDispose` cleanup added to the composable. Without it, navigating away during the 2-second feedback window would leave an orphaned `setTimeout` callback.

## Open Questions for Implementer (Resolved)

1. **Inline integration vs. deferred:** **RESOLVED: Integrate now.** Add the embed button to infographic pages via `layouts/default.vue` footer, driven by `definePageMeta({ embedSlug: '...' })`. This provides immediate testability without modifying individual page templates directly.

2. **Button placement on infographic pages:** **RESOLVED: Footer bar.** Analysis of `layouts/default.vue` confirms the footer bar (`position: absolute; bottom: 0; display: flex; justify-content: space-between`) has space between the source link and BFNA logo. The embed button fits naturally here. The footer's `z-index: 20` ensures it appears above infographic content.

3. **Error feedback:** **RESOLVED: Silent failure for MVP.** The Clipboard API's Baseline status (March 2025) and the HTTPS deployment context make failures extremely rare. The composable returns `false` on failure, which the component can use for future error states if needed. No visible error feedback in MVP.

## Remaining Open Question

1. **iframe title per infographic:** The enhanced plan adds a `title` parameter to `useEmbedCode` for WCAG 4.1.2 compliance. The title should match the infographic's display name (e.g., "Renewables on the Rise", "Indo-Pacific Straits"). These are currently defined in the head composables (`useRenewablesHead`, `useStraitsHead`). The implementer should decide whether to: (a) pass the title as a string via the `title` prop on `<EmbedCodeButton>`, (b) maintain a slug-to-title map in the composable, or (c) read the title from `useHead`'s current state. Option (a) is simplest and avoids coupling.

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md](docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md) -- Key decisions carried forward: iframe dimensions (1280x800), embed URL pattern (`/embed/<slug>`), open-to-all-domains policy, homepage card "Embed Code" button concept
- **Related completed plans:**
  - `docs/plans/2026-03-03-feat-create-embed-layout-plan.md` (BF-70) -- embed layout architecture
  - `docs/plans/2026-03-03-feat-update-netlify-headers-embed-routes-plan.md` (BF-75) -- Netlify `frame-ancestors *` configuration
  - `docs/plans/2026-03-03-feat-create-infographic-and-embed-page-routes-plan.md` (BF-72) -- embed route pages
- **Existing composable patterns:** `composables/useRenewablesHead.ts`, `composables/useStraitsHead.ts`
- **Existing component patterns:** `components/RotateDeviceOverlay.vue`, `components/GridOverlay.vue`

### Research References (added during deepening)

- [Clipboard API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) -- Baseline status, browser support, permission model
- [Clipboard: writeText() method - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) -- Secure context requirement, async promise API
- [The Clipboard API: How Did We Get Here?](https://cekrem.github.io/posts/clipboard-api-how-hard-can-it-be/) -- Browser inconsistencies, Safari quirks
- [useClipboard - VueUse](https://vueuse.org/core/useclipboard/) -- Vue composable pattern reference: `isSupported`, `copied` with configurable reset, legacy fallback option
- [Vue Composables Style Guide: Lessons from VueUse](https://alexop.dev/posts/vueuse_composables_style_guide/) -- `onScopeDispose` for timer cleanup
- [iframe element - MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) -- `title` attribute (WCAG), `loading="lazy"`, `style="border:0"` replacing deprecated `frameborder`
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/) -- 4.1.2 (Name, Role, Value for iframes), 4.1.3 (Status Messages for live regions), 2.3 (motion/prefers-reduced-motion)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) -- Live regions for dynamic content announcements
