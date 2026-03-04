---
title: "feat: Build embed code copy functionality"
type: feat
status: active
date: 2026-03-03
linear: BF-67
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
---

# feat: Build embed code copy functionality

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

### Part 3: Integration Points

The `EmbedCodeButton` is designed to be dropped into any context. The primary integration points are:

1. **Homepage hub cards** (future `pages/index.vue` redesign) -- each infographic card will include `<EmbedCodeButton slug="renewables" />` alongside a "View Infographic" link. This matches the brainstorm's homepage card spec (see brainstorm: Key Decisions > Homepage Cards).

2. **Individual infographic pages** (`pages/infographics/renewables.vue`, `pages/infographics/straits.vue`) -- optionally add an embed button in the page chrome (e.g., in the footer or a toolbar) so users viewing the full infographic can grab the embed code without returning to the homepage.

3. **Not on embed pages** -- the embed pages (`pages/embed/*.vue`) should NOT include the embed button. Users viewing an embedded infographic should not see a "copy embed code" button inside the iframe.

**This plan does not implement integration point #1** (homepage hub) -- that is a separate task involving the homepage redesign. The plan delivers the composable and component ready for integration. A minimal integration into the existing `pages/infographics/*.vue` pages can serve as the initial deployment and testing surface.

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

## Acceptance Criteria

### Functional Requirements

- [ ] `composables/useEmbedCode.ts` exists and exports `useEmbedCode(slug)` returning `{ embedUrl, embedCode, copied, copyEmbedCode }`
- [ ] `embedCode` generates a valid `<iframe>` tag with `src` pointing to `/embed/<slug>`, `width="1280"`, `height="800"`, `frameborder="0"`, and `allowfullscreen`
- [ ] `embedUrl` uses the current `window.location.origin` as the base (no hardcoded domain)
- [ ] `copyEmbedCode()` copies the iframe snippet to the system clipboard
- [ ] `copied` ref becomes `true` for 2 seconds after a successful copy, then resets to `false`
- [ ] `components/EmbedCodeButton.vue` renders a button that invokes `copyEmbedCode` on click
- [ ] Button label changes from "Embed Code" to "Copied!" during the feedback period
- [ ] Button has visual state change (green tint) during the feedback period
- [ ] Button is accessible: uses `<button>` element, has `aria-label`, supports keyboard focus

### Non-Functional Requirements

- [ ] No new npm dependencies introduced
- [ ] Composable is SSG-safe (no server-side `window` access errors during `nuxt generate`)
- [ ] Component follows existing style conventions (Encode Sans font, rgba color values, glassmorphism aesthetic)
- [ ] Component is reusable -- works with any slug string, not coupled to a specific infographic

### Quality Gates

- [ ] `nuxt generate` completes without errors (SSG build)
- [ ] Manual test: clicking the button on an infographic page copies valid iframe HTML to clipboard
- [ ] Manual test: pasting the copied code into an HTML file and opening it renders the infographic in an iframe
- [ ] Manual test: the "Copied!" feedback appears and disappears after ~2 seconds

## MVP

### composables/useEmbedCode.ts

```typescript
/**
 * Composable for generating and copying embed code for an infographic.
 *
 * Generates an <iframe> snippet pointing to /embed/<slug> with
 * recommended 1280x800 dimensions. Provides clipboard copy with
 * reactive feedback state.
 */
export function useEmbedCode(slug: string) {
  const copied = ref(false)
  let resetTimer: ReturnType<typeof setTimeout> | null = null

  const embedUrl = computed(() => {
    if (import.meta.client) {
      return `${window.location.origin}/embed/${slug}`
    }
    return `/embed/${slug}`
  })

  const embedCode = computed(() =>
    `<iframe src="${embedUrl.value}" width="1280" height="800" frameborder="0" allowfullscreen></iframe>`
  )

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

  return { embedUrl, embedCode, copied, copyEmbedCode }
}
```

### components/EmbedCodeButton.vue

```vue
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

## Files to Create

| File | Purpose |
|------|---------|
| `composables/useEmbedCode.ts` | Embed code generation and clipboard copy composable |
| `components/EmbedCodeButton.vue` | Reusable button component with copy feedback |

## Files to Modify (Optional Integration)

| File | Change |
|------|--------|
| `pages/infographics/renewables.vue` | Add `<EmbedCodeButton slug="renewables" />` for testing/initial deployment |
| `pages/infographics/straits.vue` | Add `<EmbedCodeButton slug="straits" />` for testing/initial deployment |

## Dependencies & Risks

### Dependencies
- **Completed prerequisites (all done):**
  - Embed routes exist: `pages/embed/renewables.vue`, `pages/embed/straits.vue` (BF-72)
  - Embed layout exists: `layouts/embed.vue` (BF-70)
  - Netlify headers configured: `frame-ancestors *` on `/embed/*` (BF-75)

### Risks
- **Low risk: Clipboard API browser support** -- The Clipboard API is supported in all modern browsers (Chrome 66+, Firefox 63+, Safari 13.1+, Edge 79+). Given this is an interactive infographic site requiring modern browser features (GSAP, D3, CSS animations), no compatibility gap exists.
- **Low risk: SSG build error** -- If `window` is accessed during server-side rendering, the build will fail. The `import.meta.client` guard in the computed property prevents this. The click handler only runs client-side by nature.

## Open Questions for Implementer

1. **Inline integration vs. deferred:** Should the embed button be added to `pages/infographics/*.vue` as part of this task, or should the component only be created and integration deferred to the homepage hub task? (Recommendation: add to infographic pages now for immediate testability.)

2. **Button placement on infographic pages:** If integrating into existing infographic pages, where should the button appear? Options: (a) inside the back-link nav bar area (top-left), (b) in the footer bar next to the source link, (c) as a floating button. The footer bar seems most natural since it already has available horizontal space and is visible without obscuring infographic content.

3. **Error feedback:** The current plan silently returns `false` on clipboard failure. Should there be visible error feedback (e.g., "Copy failed" label with red tint) or is silent failure acceptable? (Recommendation: silent failure is fine for MVP -- clipboard failures are extremely rare in the target browser set and deployment context.)

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md](docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md) -- Key decisions carried forward: iframe dimensions (1280x800), embed URL pattern (`/embed/<slug>`), open-to-all-domains policy, homepage card "Embed Code" button concept
- **Related completed plans:**
  - `docs/plans/2026-03-03-feat-create-embed-layout-plan.md` (BF-70) -- embed layout architecture
  - `docs/plans/2026-03-03-feat-update-netlify-headers-embed-routes-plan.md` (BF-75) -- Netlify `frame-ancestors *` configuration
  - `docs/plans/2026-03-03-feat-create-infographic-and-embed-page-routes-plan.md` (BF-72) -- embed route pages
- **Existing composable patterns:** `composables/useRenewablesHead.ts`, `composables/useStraitsHead.ts`
- **Existing component patterns:** `components/RotateDeviceOverlay.vue`, `components/GridOverlay.vue`
