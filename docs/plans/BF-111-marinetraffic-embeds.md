# BF-111: Replace Particle System with MarineTraffic Live Embeds

## Enhancement Summary

**Deepened on:** 2026-03-12
**Sections enhanced:** 7
**Research sources:** MarineTraffic embed docs, MDN iframe security/lazy-loading, Safari WebKit bug tracker, Nuxt 3 SSR patterns, OWASP CSP guidelines, iOS Safari iframe scroll issues

### Key Improvements
1. Added CSP `frame-src` directive requirement to `netlify.toml` and standalone HTML `Content-Security-Policy` meta tag -- the current plan would fail silently without this
2. Safari circular clipping fix: `border-radius: 50%` + `overflow: hidden` on iframes is a known WebKit bug; added required `-webkit-mask-image` workaround
3. Added iframe `load` event fade-in pattern to solve the blank-flash UX gap between particle system (instant) and iframe (network-dependent)
4. Identified race condition: rapid strait switching can orphan iframes mid-load; added iframe src-nulling cleanup pattern
5. Resolved Open Question #1: background images should move to `marinetraffic-config.ts` alongside embed URLs (single source of truth, avoids keeping deprecated flow-configs imported)

### New Considerations Discovered
- MarineTraffic embed.js injects its own iframe internally, creating a nested iframe situation that affects touch event propagation on iOS
- The existing `netlify.toml` has `Content-Security-Policy: frame-ancestors 'none'` on `/*` which would block the embed HTML files from being iframed by the site itself unless the `/embeds/*` path is excluded
- Taiwan strait flow config currently uses `luzon.jpg` as its backgroundImage -- this is likely a bug that should be fixed when migrating image paths

---

## Overview

Replace the custom particle animation system and static strait detail view with live MarineTraffic embedded maps for each of the six chokepoints. Users get real-time vessel traffic data instead of simulated particles.

---

## Architecture Decision: iframe Approach (Option 1)

**Chosen approach:** Host standalone HTML files in `public/embeds/` and load them via `<iframe>` in a new Vue component.

**Rationale:**
- MarineTraffic's embed API works by setting global variables (`width`, `height`, `latitude`, etc.) before loading their `embed.js` script. This pattern is incompatible with Vue SFCs and SSR.
- iframes provide full isolation: no SSR hydration issues, no global variable leakage between strait embeds, no conflicts with Nuxt's script handling.
- `useHead()` / `useScript()` would require careful teardown of globals between strait switches and risk cross-contamination. Not worth the complexity.
- `<ClientOnly>` with dynamic script injection is fragile: script removal/re-injection on strait change is error-prone with MarineTraffic's embed.js (no documented cleanup API).

### Research Insights

**Best Practices (iframe isolation):**
- The iframe approach is well-validated for third-party embeds that rely on global variables. MarineTraffic's `embed.js` creates its own internal iframe (a map tile viewer), so this is actually a double-nested iframe: your page > your embed HTML > MarineTraffic's generated iframe. This is important for understanding touch event propagation and CSP requirements.
- Nuxt Scripts (`nuxt-scripts` module) provides facade components for third-party scripts, but MarineTraffic's global-variable pattern is not compatible with their proxy API. The iframe approach remains correct.

**Alternative considered and rejected -- `useScript()` with cleanup:**
- Even with `onUnmounted` cleanup, MarineTraffic's `embed.js` does not expose a destroy/cleanup API. Once loaded, it appends DOM nodes and sets up intervals that cannot be cleanly removed. The iframe boundary is the only reliable cleanup mechanism (navigating away or removing the iframe destroys all internal state).

**References:**
- [MarineTraffic Embed Map Guide](https://www.marinetraffic.com/en/p/embed-map)
- [MarineTraffic Help: Embed the Live Map](https://help.marinetraffic.com/hc/en-us/articles/204112038-Embed-the-MarineTraffic-Live-Map)
- [Nuxt Scripts: Third-Party Scripts](https://scripts.nuxt.com/)

---

## Strait Configuration Data

| Strait ID       | Latitude | Longitude | Zoom | HTML File                           | Background Image |
|------------------|----------|-----------|------|-------------------------------------|------------------|
| `malacca`        | 2.5      | 101.0     | 7    | `public/embeds/mt-malacca.html`     | `/assets/images/straits/malacca.jpg` |
| `taiwan`         | 24.0     | 119.0     | 7    | `public/embeds/mt-taiwan.html`      | `/assets/images/straits/taiwan.jpg` |
| `hormuz`         | 26.3     | 56.3      | 8    | `public/embeds/mt-hormuz.html`      | `/assets/images/straits/hormuz.jpg` |
| `luzon`          | 20.0     | 121.0     | 7    | `public/embeds/mt-luzon.html`       | `/assets/images/straits/luzon.jpg` |
| `lombok`         | -8.5     | 115.7     | 9    | `public/embeds/mt-lombok.html`      | `/assets/images/straits/lombok.jpg` |
| `bab-el-mandeb`  | 12.6     | 43.3      | 8    | `public/embeds/mt-bab-el-mandeb.html` | `/assets/images/straits/bab-el-mandeb.jpg` |

### Research Insights

**Data issue found:** The current `taiwan-flow.ts` uses `backgroundImage: '/assets/images/straits/luzon.jpg'` -- this appears to be a copy-paste bug. When migrating background images to the new config, use the correct `taiwan.jpg` path (verify the file exists first; if not, create/source the correct satellite image for Taiwan Strait).

---

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `public/embeds/mt-malacca.html` | Standalone HTML with MarineTraffic embed for Malacca |
| `public/embeds/mt-taiwan.html` | Same for Taiwan Strait |
| `public/embeds/mt-hormuz.html` | Same for Strait of Hormuz |
| `public/embeds/mt-luzon.html` | Same for Luzon Strait |
| `public/embeds/mt-lombok.html` | Same for Lombok Strait |
| `public/embeds/mt-bab-el-mandeb.html` | Same for Bab el-Mandeb |
| `components/straits/MarineTrafficEmbed.vue` | Reusable component wrapping `<iframe>` with load detection and fallback |
| `data/straits/marinetraffic-config.ts` | Centralized config map: straitId -> embed params + background image |

### Modified Files

| File | Change |
|------|--------|
| `components/straits/StraitCircle.vue` | Replace `<StraitParticles>` with `<MarineTrafficEmbed>` when selected |
| `components/StraitMap.vue` | Remove `flowConfigs` import and `useHead()` preload; add preload from new config |
| `components/straits/StraitMobileDetail.vue` | Add MarineTraffic embed section to mobile detail view |
| `netlify.toml` | Add CSP `frame-src` directive and adjust `/embeds/*` headers |

### Files to Deprecate (Not Delete Yet)

| File | Reason |
|------|--------|
| `components/straits/StraitParticleCanvas.vue` | Replaced by MarineTraffic embed |
| `components/straits/StraitParticles.vue` | Replaced by MarineTraffic embed |
| `composables/useParticleFlow.ts` | No longer needed in production |
| `utils/particleEngine.ts` | No longer needed in production |
| `utils/particleTweakpane.ts` | Debug tooling for particles |
| `data/straits/flow-configs.ts` | Particle flow configs |
| `data/straits/*-flow.ts` | Per-strait flow configs (6 files) |
| `data/straits/*-polygon.json` | Per-strait polygon data (6 files) |
| `pages/test/[strait]/index.vue` | Test pages for particle debug (6 pages) |

**Important:** Do NOT delete these in Phase 1. Mark them with `@deprecated` comments and add a `// BF-111: safe to remove once MarineTraffic embed is validated` note. They remain useful as fallback if MarineTraffic embeds are unavailable. Delete in a follow-up PR after production validation.

---

## Step-by-Step Implementation

### Phase 1: Create Embed Infrastructure

**Step 1.0: Update `netlify.toml` CSP headers**

The current `netlify.toml` has `Content-Security-Policy: frame-ancestors 'none'` on `/*`, which would block the site from iframing its own `/embeds/*.html` files. Additionally, the site needs a `frame-src` directive to allow loading MarineTraffic content.

Add a new header block for `/embeds/*` BEFORE the `/*` catch-all, and update the catch-all to include `frame-src`:

```toml
# Embed HTML files: allow being iframed by this site only
[[headers]]
  for = "/embeds/*"
  [headers.values]
    # These files ARE the iframe content -- they must allow being framed by our own origin
    Content-Security-Policy = "frame-ancestors 'self'; script-src 'unsafe-inline' https://www.marinetraffic.com"
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Cache-Control = "public, max-age=3600"

# All other routes: update CSP to allow framing MarineTraffic content
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    Content-Security-Policy = "frame-ancestors 'none'; frame-src 'self' https://www.marinetraffic.com"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), fullscreen=(self)"
```

### Research Insights (CSP)

**Critical: `frame-src` is required.** Without `frame-src 'self'` in the parent page's CSP, the browser will block loading the `/embeds/*.html` iframes. Without `frame-src https://www.marinetraffic.com`, MarineTraffic's internally-generated iframe (inside embed.js) will be blocked.

**The `/embeds/*` files need `script-src 'unsafe-inline'`** because the MarineTraffic embed pattern uses inline `<script>` tags to set global variables. The `script-src` directive must also allow `https://www.marinetraffic.com` for the external `embed.js` script.

**`Cache-Control` on embed files:** Since these are static HTML files that rarely change, a moderate cache (1 hour) prevents unnecessary re-fetches on strait switching while keeping updates reasonably fresh.

**References:**
- [MDN: Content-Security-Policy frame-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-src)
- [Secure and Make Your Iframe Compliant in 2025](https://www.feroot.com/blog/how-to-secure-iframe-compliance-2025/)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

---

**Step 1.1: Create standalone HTML files**

Create `public/embeds/mt-[straitId].html` for each strait. Template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-inline' https://www.marinetraffic.com; frame-src https://www.marinetraffic.com">
  <title>MarineTraffic - [Strait Name]</title>
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; background: #1a2744; }
  </style>
</head>
<body>
<script type="text/javascript">
  width='100%';
  height='100%';
  border='0';
  shownames='false';
  latitude='[LAT]';
  longitude='[LNG]';
  zoom='[ZOOM]';
  maptype='0';
  trackvessel='0';
  fleet='';
</script>
<script type="text/javascript" src="https://www.marinetraffic.com/js/embed.js"></script>
</body>
</html>
```

Note: Use `height='100%'` (not `'450'`) since the iframe will control sizing. Use `https://` (not protocol-relative `//`) to avoid mixed-content issues.

### Research Insights (HTML files)

**Add a CSP `<meta>` tag** inside each HTML file as a defense-in-depth measure. This ensures security even if the Netlify headers are misconfigured or if the files are served from a different host during development.

**`overflow: hidden` in the body style is critical.** MarineTraffic's embed.js creates its own iframe that may cause scrollbars to appear inside the parent document. The `overflow: hidden` prevents this from causing visual artifacts when clipped to a circle.

**Consider adding a `<noscript>` fallback:** If JavaScript is disabled, the embed will show nothing. A simple `<noscript><p style="color:#fff;text-align:center;padding:2rem">Enable JavaScript to view live vessel traffic</p></noscript>` provides user feedback.

---

**Step 1.2: Create config data file**

Create `data/straits/marinetraffic-config.ts`:

```ts
export interface MarineTrafficConfig {
  straitId: string
  embedUrl: string        // path to the HTML file in /embeds/
  backgroundImage: string // satellite image path (migrated from flow configs)
  latitude: number
  longitude: number
  zoom: number
}

export const marineTrafficConfigs: Record<string, MarineTrafficConfig> = {
  malacca:         { straitId: 'malacca',       embedUrl: '/embeds/mt-malacca.html',       backgroundImage: '/assets/images/straits/malacca.jpg',       latitude: 2.5,  longitude: 101.0, zoom: 7 },
  taiwan:          { straitId: 'taiwan',        embedUrl: '/embeds/mt-taiwan.html',        backgroundImage: '/assets/images/straits/taiwan.jpg',        latitude: 24.0, longitude: 119.0, zoom: 7 },
  hormuz:          { straitId: 'hormuz',        embedUrl: '/embeds/mt-hormuz.html',        backgroundImage: '/assets/images/straits/hormuz.jpg',        latitude: 26.3, longitude: 56.3,  zoom: 8 },
  luzon:           { straitId: 'luzon',         embedUrl: '/embeds/mt-luzon.html',         backgroundImage: '/assets/images/straits/luzon.jpg',         latitude: 20.0, longitude: 121.0, zoom: 7 },
  lombok:          { straitId: 'lombok',        embedUrl: '/embeds/mt-lombok.html',        backgroundImage: '/assets/images/straits/lombok.jpg',        latitude: -8.5, longitude: 115.7, zoom: 9 },
  'bab-el-mandeb': { straitId: 'bab-el-mandeb', embedUrl: '/embeds/mt-bab-el-mandeb.html', backgroundImage: '/assets/images/straits/bab-el-mandeb.jpg', latitude: 12.6, longitude: 43.3, zoom: 8 },
}
```

### Research Insights (config)

**Resolved Open Question #1:** Background images should live in this config file alongside embed URLs. This creates a single source of truth for all per-strait visual assets and avoids keeping the deprecated `flow-configs.ts` imported just for image paths. The `StraitCircle.vue` and `StraitMap.vue` components should import from this file instead.

**Type safety improvement:** Consider using a `const` assertion with `satisfies` for compile-time key validation:

```ts
export const marineTrafficConfigs = {
  malacca: { ... },
  // ...
} as const satisfies Record<string, MarineTrafficConfig>
```

This ensures all config objects match the interface while preserving literal types for keys.

---

**Step 1.3: Create `MarineTrafficEmbed.vue` component**

```vue
<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { marineTrafficConfigs } from '~/data/straits/marinetraffic-config'

const props = defineProps<{
  straitId: string
}>()

const config = computed(() => marineTrafficConfigs[props.straitId] ?? null)
const iframeRef = ref<HTMLIFrameElement | null>(null)
const loaded = ref(false)
const errored = ref(false)

let loadTimeout: ReturnType<typeof setTimeout> | null = null
const LOAD_TIMEOUT_MS = 15_000

function onIframeLoad() {
  loaded.value = true
  errored.value = false
  if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null }
}

function startLoadTimeout() {
  if (loadTimeout) clearTimeout(loadTimeout)
  loadTimeout = setTimeout(() => {
    if (!loaded.value) errored.value = true
  }, LOAD_TIMEOUT_MS)
}

// Reset state when strait changes
watch(() => props.straitId, () => {
  loaded.value = false
  errored.value = false
  startLoadTimeout()
})

// Start timeout on mount
startLoadTimeout()

onBeforeUnmount(() => {
  // Null out iframe src to abort any in-flight network requests
  if (iframeRef.value) iframeRef.value.src = 'about:blank'
  if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null }
})
</script>

<template>
  <div v-if="config" class="mt-embed">
    <iframe
      ref="iframeRef"
      :src="config.embedUrl"
      :title="`Live vessel traffic - ${straitId}`"
      class="mt-embed__iframe"
      :class="{ 'mt-embed__iframe--loaded': loaded }"
      loading="lazy"
      allow="fullscreen"
      referrerpolicy="no-referrer"
      sandbox="allow-scripts allow-same-origin"
      @load="onIframeLoad"
    />
    <div v-if="errored" class="mt-embed__fallback" aria-label="Embed unavailable">
      <span class="mt-embed__fallback-text">Live traffic unavailable</span>
    </div>
  </div>
</template>

<style scoped>
.mt-embed {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  z-index: 1;
  /* Safari fix: border-radius + overflow:hidden on iframes requires mask */
  -webkit-mask-image: -webkit-radial-gradient(white, black);
}

.mt-embed__iframe {
  width: 100%;
  height: 100%;
  border: none;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.mt-embed__iframe--loaded {
  opacity: 1;
}

.mt-embed__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mt-embed__fallback-text {
  color: rgba(255, 255, 255, 0.45);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
</style>
```

### Research Insights (component)

**Safari circular clipping fix (critical):**
`border-radius: 50%` + `overflow: hidden` does NOT reliably clip iframe content in Safari/WebKit. This is a [long-standing WebKit bug](https://bugs.webkit.org/show_bug.cgi?id=77572). The fix is to add `-webkit-mask-image: -webkit-radial-gradient(white, black)` to the clipping container, which forces Safari to use a compositing layer that respects the clip.

**iframe `load` event fade-in (resolves Open Question #2):**
The iframe starts at `opacity: 0` and transitions to `opacity: 1` when the `load` event fires. The satellite background image (already rendered by `StraitCircle`) shows through during loading, providing a seamless visual experience. This eliminates the blank white flash that would otherwise occur.

**`sandbox` attribute for security:**
Adding `sandbox="allow-scripts allow-same-origin"` restricts what the embedded content can do:
- `allow-scripts`: needed for MarineTraffic's JavaScript
- `allow-same-origin`: needed for the embed to make network requests to MarineTraffic servers
- Omitting `allow-popups`, `allow-forms`, `allow-top-navigation` prevents the embed from opening new windows, submitting forms, or redirecting the parent page

**Cleanup on unmount:**
Setting `iframeRef.value.src = 'about:blank'` before unmount is essential. Without this, the iframe's network connections and JavaScript timers continue running even after the DOM node is removed, until garbage collection eventually cleans them up. This is especially important for rapid strait switching.

**Load timeout for error detection (resolves Open Question #4):**
A 15-second timeout detects when MarineTraffic is unreachable (corporate firewalls, network issues, MarineTraffic downtime). When triggered, the `errored` state shows a subtle fallback message. The satellite background image remains visible underneath.

**`loading="lazy"` caveat:**
The `loading="lazy"` attribute on iframes tells the browser to defer loading until the iframe is near the viewport. Since the iframe is inside a `v-if="selected"` conditional, it only mounts when a strait is selected. The `loading="lazy"` adds a second layer of protection but may cause a slight additional delay on first load. If this is noticeable, consider removing it since the `v-if` already controls mounting.

**References:**
- [Safari border-radius + overflow: hidden fix](https://gist.github.com/ayamflow/b602ab436ac9f05660d9c15190f4fd7b)
- [WebKit Bug 77572: content not clipped to border-radius](https://bugs.webkit.org/show_bug.cgi?id=77572)
- [MDN: iframe sandbox attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox)
- [web.dev: Lazy load images and iframe elements](https://web.dev/learn/performance/lazy-load-images-and-iframe-elements)

---

### Phase 2: Integrate into StraitCircle

**Step 2.1: Replace particles with embed in `StraitCircle.vue`**

In `components/straits/StraitCircle.vue`, replace:

```vue
<StraitParticles
  v-if="showParticles"
  :config="flowConfig as any"
/>
```

With:

```vue
<ClientOnly>
  <MarineTrafficEmbed
    v-if="selected"
    :strait-id="straitId!"
  />
</ClientOnly>
```

Remove:
- The `flowConfig` computed property
- The `showParticles` computed property
- The `flowConfigs` import

Update:
- Change `bgImageSrc` to source from `marineTrafficConfigs` instead of `flowConfigs`:

```ts
import { marineTrafficConfigs } from '~/data/straits/marinetraffic-config'

const bgImageSrc = computed(() =>
  props.straitId ? marineTrafficConfigs[props.straitId]?.backgroundImage ?? null : null
)
```

Keep:
- The `bgImageSrc` computed and `<img>` element (the background satellite image still shows during zoom animation, before the embed loads)

### Research Insights (StraitCircle integration)

**Race condition on rapid switching:**
When the user rapidly clicks between straits, Vue's reactivity system will unmount the old `MarineTrafficEmbed` and mount a new one. The `onBeforeUnmount` hook (which nulls the iframe src) handles cleanup. However, there is a subtle timing issue: if Vue reuses the component instance (via `v-if` toggling on the same element), the `watch` on `straitId` handles the reset. Both paths are now covered in the component design above.

**`ClientOnly` is necessary:** Even though the iframe itself is safe for SSR (it would just render as an empty iframe tag), the `load` event listener and timeout logic reference `window`/`setTimeout` which are not available during SSR. `<ClientOnly>` avoids hydration mismatches.

**The `as any` cast on `flowConfig` is removed:** This was a type safety escape hatch for the particle system. The new MarineTrafficEmbed component is fully typed.

---

**Step 2.2: Add embed to mobile detail**

In `StraitMobileDetail.vue`, add a `<MarineTrafficEmbed>` section below the hero circle (after the hero section, before the description). On mobile, render it as a rectangular embed (not circle-clipped):

```vue
<div class="mt-mobile-embed">
  <ClientOnly>
    <MarineTrafficEmbed :strait-id="strait.id" />
  </ClientOnly>
</div>
```

Override the circular clip for mobile:

```css
.mt-mobile-embed :deep(.mt-embed) {
  position: relative;
  border-radius: 8px;
  aspect-ratio: 16/9;
  height: auto;
  -webkit-mask-image: none; /* disable circular mask on mobile */
}
```

### Research Insights (mobile)

**iOS Safari iframe scroll conflict (critical):**
On iOS Safari, iframes have historically been problematic for scrolling. The MarineTraffic map inside the iframe is interactive (pan/zoom), which will conflict with the parent page's scroll and the swipe navigation in `useSwipeNavigation`. Mitigations:

1. **`touch-action: pan-x pan-y` on the iframe wrapper** allows the browser to handle touch gestures normally, but the iframe will capture touches when the user interacts with the map.

2. **The swipe navigation (`useSwipeNavigation`)** should detect when the touch originates inside the iframe and suppress swipe gestures in that case. Since iframe content is cross-origin, `pointerdown` events from inside the iframe do not bubble to the parent. This actually helps -- swipe gestures on the iframe will not trigger navigation. However, touches on the iframe wrapper/margin will.

3. **Consider adding a "tap to interact" overlay** on the mobile embed that prevents accidental iframe interactions during scroll. The user taps once to enable iframe interaction, similar to how Google Maps embeds work on mobile.

**Placement decision:** The embed should go AFTER the hero section rather than inside the hero circle on mobile. The hero circle on mobile is already sized with `clamp(160px, 65vw, 288px)` -- too small for a useful MarineTraffic map. A separate rectangular embed below gives users a larger, more usable map area.

**References:**
- [CSS-Tricks: Scrolling iframe on iPad](https://css-tricks.com/forums/topic/scrolling-iframe-on-ipad/)
- [WebKit Bug 149264: IFrames not scrollable on iOS](https://bugs.webkit.org/show_bug.cgi?id=149264)

---

### Phase 3: Remove Particle System References

**Step 3.1: Remove particle preloading from StraitMap**

In `components/StraitMap.vue` (lines 6-16), remove:
- `import { flowConfigs } from '~/data/straits/flow-configs'`
- The `useHead()` call that preloads particle background images

Replace with preloading from the new config:

```ts
import { marineTrafficConfigs } from '~/data/straits/marinetraffic-config'

useHead({
  link: Object.values(marineTrafficConfigs)
    .map((c) => c.backgroundImage)
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((href) => ({ rel: 'preload', as: 'image', href })),
})
```

**Step 3.2: Deprecate particle files**

Add `@deprecated` JSDoc comments to the top of each file listed in "Files to Deprecate" above.

### Research Insights (deprecation)

**Tree-shaking verification:** After removing the `flowConfigs` import from `StraitMap.vue` and `StraitCircle.vue`, verify that the deprecated particle files are no longer included in the production bundle. Run `npx nuxi analyze` or check the build output to confirm the particle engine, polygon JSON files, and per-strait flow configs are tree-shaken out.

**Do not remove the `pages/test/[strait]` routes from `nuxt.config.ts` `ignore`:** The test pages are already excluded from production builds via `ignore: process.env.NODE_ENV === 'production' ? ['pages/test/**'] : []`. They will continue to work in development for particle system debugging if needed during the transition period.

---

### Phase 4: Grid Layout Compliance

The MarineTraffic embed sits inside `StraitCircle`, which is inside `StraitData`, which lives inside `.map-inner` in `StraitMap.vue`. This is all inside the existing grid structure:

- `.straits-infographic` uses `display: contents` (children participate in master grid)
- `.strait-map` uses `display: grid; grid-template-columns: subgrid; grid-template-rows: subgrid`
- `.map-inner` is `position: absolute` within the grid cell
- `StraitData` circles are absolutely positioned within `.map-inner`

The MarineTraffic embed replaces the canvas overlay inside `StraitCircle`, using the same `position: absolute; inset: 0` slot. **No grid changes needed.** The iframe is contained entirely within the circle's clipping context.

Verification checklist:
- [ ] `.straits-infographic` remains `display: contents`
- [ ] No new children added directly to the master grid
- [ ] `.strait-map` subgrid structure unchanged
- [ ] Panels (StraitQuantPanel, StraitQualPanel) continue to render in grid columns 1-3 and 10-13
- [ ] The iframe does not cause layout reflow (it is absolutely positioned within the circle)

### Research Insights (grid)

**The iframe MUST NOT have `position: relative` or any display property that could affect parent layout.** Since it is inside a `position: absolute; inset: 0` container (`.mt-embed`), which is inside the `position: relative` `.strait-circle`, the iframe is completely isolated from the grid. This is safe.

**The `<ClientOnly>` wrapper adds an extra DOM element** but since it is inside the absolutely positioned circle, it has no grid impact. Verify in DevTools that no unexpected wrapper elements affect the circle's internal layout.

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| MarineTraffic embed.js changes or is unavailable | Medium | High | Keep particle system code (deprecated, not deleted) as fallback. Add error handling / timeout in iframe with fallback to static satellite image. The 15-second timeout in the component detects unavailability. |
| iframe blocks or CSP issues on Netlify | **High** | High | **This is now the #1 risk.** The current `netlify.toml` blocks all iframes (`frame-ancestors 'none'`). Must update CSP with `frame-src 'self' https://www.marinetraffic.com` AND add `/embeds/*` header override. Test CSP in staging before merging. |
| Performance: 6 iframes loaded simultaneously on overview | Low | Medium | iframes only load when `selected` is true (one at a time). `loading="lazy"` adds further protection. |
| Mixed content (HTTP embed on HTTPS site) | Low | Medium | Use `https://` in embed script src (not protocol-relative `//`). |
| Circular clipping breaks on Safari | **Medium** | **Medium** | Known WebKit bug. The `-webkit-mask-image` workaround is included in the component CSS. Must verify on Safari 17+ and iOS Safari. |
| Mobile: iframe scroll interaction conflicts with swipe navigation | Medium | Medium | The iframe captures its own touch events (cross-origin boundary prevents bubbling). Test on iOS Safari 17+. Consider "tap to interact" overlay. |
| MarineTraffic rate limiting or API key requirement | Low | High | Current embed snippets are free/public. If they start requiring API keys, the config structure supports adding params. |
| Rapid strait switching: orphaned iframe connections | Medium | Low | `onBeforeUnmount` sets iframe src to `about:blank`, aborting in-flight requests. Timeout is cleared on unmount. |
| Double-nested iframe performance | Low | Medium | MarineTraffic's embed.js creates its own iframe internally. Two levels of iframe nesting have minimal performance impact on modern browsers but increase memory usage slightly. Monitor with Chrome DevTools Performance panel. |

### Research Insights (risks)

**Elevated risk: CSP configuration.** This is the most likely showstopper. The existing `netlify.toml` actively blocks iframe embedding. This must be the FIRST thing tested -- deploy the CSP changes to a Netlify preview deploy and verify iframe loading before writing any Vue component code.

**New risk: `sandbox` attribute compatibility.** The `sandbox="allow-scripts allow-same-origin"` attribute may interfere with MarineTraffic's embed.js if it tries to use features not explicitly allowed (e.g., `allow-popups` for "View on MarineTraffic" links). Test with and without `sandbox` to determine the minimum required permissions.

---

## Testing Approach

### Manual Testing

1. **CSP Validation (do this FIRST):**
   - Deploy the `netlify.toml` changes to a Netlify preview
   - Open browser DevTools Console and Network tabs
   - Navigate to `/embeds/mt-hormuz.html` directly -- it should load the MarineTraffic map
   - Check Console for CSP violation errors
   - If violations occur, adjust `frame-src`, `script-src`, and `connect-src` directives

2. **Desktop -- All six straits:**
   - Click each strait circle; verify MarineTraffic embed loads inside the circle
   - Verify zoom animation still works (satellite bg shows during transition, embed fades in after zoom completes)
   - Verify panels (StraitQuantPanel, StraitQualPanel) still appear correctly alongside the embed
   - Click background or close button to deselect; verify embed unmounts cleanly (check DevTools Network tab for aborted requests)
   - Rapid switching between straits: no orphaned iframes or memory leaks (check DevTools Memory tab)
   - Verify the iframe is correctly clipped to a circle (no rectangular edges visible)

3. **Mobile -- All six straits:**
   - Navigate to each strait detail view
   - Verify embed renders in rectangular format below the hero circle
   - Verify swipe navigation between straits works without iframe interference
   - Verify the MarineTraffic map is interactive (pan/zoom) when touched directly
   - Verify back button works
   - Test on iOS Safari 17+ specifically for touch event and clipping issues

4. **Breakpoints:**
   - Test at 1920px, 1440px, 1280px, 1024px, 768px, 375px
   - Verify `width='100%'` makes iframe responsive within its container

5. **SSR / Production Build:**
   - Run `nuxt build && nuxt preview`
   - Verify no hydration mismatch warnings
   - Verify embeds load correctly in production mode
   - Verify deprecated particle files are NOT in the production bundle (`npx nuxi analyze`)

6. **Grid Layout Integrity:**
   - Verify master grid is not broken at any breakpoint
   - Verify panels, header, and map background all render correctly
   - Inspect with browser DevTools grid overlay

7. **Error/Fallback Testing:**
   - Block `www.marinetraffic.com` in DevTools Network tab
   - Verify the 15-second timeout fires and shows "Live traffic unavailable"
   - Verify the satellite background image remains visible underneath

8. **Safari-Specific:**
   - Test circular clipping on Safari desktop and iOS Safari
   - Verify `-webkit-mask-image` workaround renders correctly
   - Test iframe scroll behavior inside the clipped circle

### Automated (if applicable)

- Update any existing browser-test specs that reference particle canvases
- Add a basic test: navigate to `/infographics/straits#hormuz`, wait for iframe to appear, check it has the correct src
- Add a CSP smoke test: verify no CSP violations in the browser console after page load

---

## Open Questions for Implementer

1. ~~**Background image source after particle deprecation:**~~ **RESOLVED.** Background images should be added to `marineTrafficConfigs` in `data/straits/marinetraffic-config.ts`. Fix the Taiwan strait image (currently points to `luzon.jpg`). See Step 1.2.

2. ~~**Embed loading indicator:**~~ **RESOLVED.** Use the iframe `load` event to fade in the embed. The satellite background image serves as the loading placeholder. See Step 1.3 component design.

3. **MarineTraffic attribution:** Does MarineTraffic require visible attribution when using their free embed? Check their terms of service. The embed itself likely includes their branding. **Research note:** The free embed from MarineTraffic includes their logo watermark on the map. No additional attribution appears to be required, but verify against their current [terms of service](https://www.marinetraffic.com/en/p/terms).

4. ~~**Offline / error fallback:**~~ **RESOLVED.** A 15-second load timeout detects unavailability and shows a subtle "Live traffic unavailable" message. The satellite image remains visible underneath. See Step 1.3 component design.

5. **Test pages (`/test/[strait]`)**: These are particle-debug pages. Recommendation: leave them as-is with the deprecated particle system. They are already excluded from production builds via `nuxt.config.ts`. They can be useful during the transition period for A/B comparison. Delete in the follow-up cleanup PR.

6. **NEW: `sandbox` attribute permissions.** Test whether `sandbox="allow-scripts allow-same-origin"` is sufficient for MarineTraffic's embed.js. If the embed includes "View on MarineTraffic" links, `allow-popups` may also be needed. Determine the minimum required sandbox permissions during Phase 1.

7. **NEW: MarineTraffic embed.js `connect-src` requirements.** MarineTraffic's tile server may use a different domain than `www.marinetraffic.com` for loading map tiles (e.g., `tiles.marinetraffic.com` or a CDN). If the `/embeds/*` CSP meta tag is too restrictive, the map tiles may fail to load. Test with the browser DevTools Console open to catch any CSP violations from tile requests and add the necessary domains.
