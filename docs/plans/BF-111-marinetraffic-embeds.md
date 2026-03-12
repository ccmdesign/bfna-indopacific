# BF-111: Replace Particle System with MarineTraffic Live Embeds

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

---

## Strait Configuration Data

| Strait ID       | Latitude | Longitude | Zoom | HTML File                           |
|------------------|----------|-----------|------|-------------------------------------|
| `malacca`        | 2.5      | 101.0     | 7    | `public/embeds/mt-malacca.html`     |
| `taiwan`         | 24.0     | 119.0     | 7    | `public/embeds/mt-taiwan.html`      |
| `hormuz`         | 26.3     | 56.3      | 8    | `public/embeds/mt-hormuz.html`      |
| `luzon`          | 20.0     | 121.0     | 7    | `public/embeds/mt-luzon.html`       |
| `lombok`         | -8.5     | 115.7     | 9    | `public/embeds/mt-lombok.html`      |
| `bab-el-mandeb`  | 12.6     | 43.3      | 8    | `public/embeds/mt-bab-el-mandeb.html` |

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
| `components/straits/MarineTrafficEmbed.vue` | Reusable component wrapping `<iframe>` |
| `data/straits/marinetraffic-config.ts` | Centralized config map: straitId -> embed params |

### Modified Files

| File | Change |
|------|--------|
| `components/straits/StraitCircle.vue` | Replace `<StraitParticles>` with `<MarineTrafficEmbed>` when selected |
| `components/StraitMap.vue` | Minor: pass embed-related state if needed; potentially adjust circle-slot sizing |
| `components/straits/StraitMobileDetail.vue` | Add MarineTraffic embed section to mobile detail view |

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

**Step 1.1: Create standalone HTML files**

Create `public/embeds/mt-[straitId].html` for each strait. Template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

**Step 1.2: Create config data file**

Create `data/straits/marinetraffic-config.ts`:

```ts
export interface MarineTrafficConfig {
  straitId: string
  embedUrl: string  // path to the HTML file in /embeds/
  latitude: number
  longitude: number
  zoom: number
}

export const marineTrafficConfigs: Record<string, MarineTrafficConfig> = {
  malacca:       { straitId: 'malacca',       embedUrl: '/embeds/mt-malacca.html',       latitude: 2.5,  longitude: 101.0, zoom: 7 },
  taiwan:        { straitId: 'taiwan',        embedUrl: '/embeds/mt-taiwan.html',        latitude: 24.0, longitude: 119.0, zoom: 7 },
  hormuz:        { straitId: 'hormuz',        embedUrl: '/embeds/mt-hormuz.html',        latitude: 26.3, longitude: 56.3,  zoom: 8 },
  luzon:         { straitId: 'luzon',         embedUrl: '/embeds/mt-luzon.html',         latitude: 20.0, longitude: 121.0, zoom: 7 },
  lombok:        { straitId: 'lombok',        embedUrl: '/embeds/mt-lombok.html',        latitude: -8.5, longitude: 115.7, zoom: 9 },
  'bab-el-mandeb': { straitId: 'bab-el-mandeb', embedUrl: '/embeds/mt-bab-el-mandeb.html', latitude: 12.6, longitude: 43.3, zoom: 8 },
}
```

**Step 1.3: Create `MarineTrafficEmbed.vue` component**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { marineTrafficConfigs } from '~/data/straits/marinetraffic-config'

const props = defineProps<{
  straitId: string
}>()

const config = computed(() => marineTrafficConfigs[props.straitId] ?? null)
</script>

<template>
  <div v-if="config" class="mt-embed">
    <iframe
      :src="config.embedUrl"
      :title="`Live vessel traffic - ${straitId}`"
      class="mt-embed__iframe"
      loading="lazy"
      allow="fullscreen"
      referrerpolicy="no-referrer"
    />
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
}

.mt-embed__iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
```

Key decisions:
- `loading="lazy"` prevents loading until the strait is selected.
- `border-radius: 50%` + `overflow: hidden` clips the map to the circle shape (matching the current particle canvas approach).
- `position: absolute; inset: 0` matches the exact positioning used by `StraitParticleCanvas`.

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

Keep:
- The `bgImageSrc` computed and `<img>` element (the background satellite image still shows during zoom animation, before the embed loads)

**Step 2.2: Add embed to mobile detail**

In `StraitMobileDetail.vue`, add a `<MarineTrafficEmbed>` section above or below the existing detail content. On mobile, render it as a rectangular embed (not circle-clipped):

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
}
```

### Phase 3: Remove Particle System References

**Step 3.1: Remove particle preloading from StraitMap**

In `components/StraitMap.vue` (line 6-16), remove:
- `import { flowConfigs } from '~/data/straits/flow-configs'`
- The `useHead()` call that preloads particle background images

The background images for the circles (`flowConfig.backgroundImage`) are still used by `StraitCircle.vue` to show the satellite view during zoom. Keep those image refs but source them from a simpler mapping (or inline them in the strait data) rather than depending on the particle flow config structure.

**Step 3.2: Deprecate particle files**

Add `@deprecated` JSDoc comments to the top of each file listed in "Files to Deprecate" above.

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

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| MarineTraffic embed.js changes or is unavailable | Medium | High | Keep particle system code (deprecated, not deleted) as fallback. Add error handling / timeout in iframe with fallback to static satellite image. |
| iframe blocks or CSP issues on Netlify | Low | High | Test in production build early. Update `netlify.toml` headers if needed to allow framing from marinetraffic.com. |
| Performance: 6 iframes loaded simultaneously on overview | Low | Medium | iframes only load when `selected` is true (one at a time). `loading="lazy"` adds further protection. |
| Mixed content (HTTP embed on HTTPS site) | Low | Medium | Use `https://` in embed script src (not protocol-relative `//`). |
| Circular clipping breaks on some browsers | Low | Low | `border-radius: 50%; overflow: hidden` is well-supported. Test on Safari, Firefox, Chrome. |
| Mobile: iframe scroll interaction conflicts with swipe navigation | Medium | Medium | Add `touch-action: none` or `pointer-events: none` on the iframe during swipe gestures. Test on iOS Safari. |
| MarineTraffic rate limiting or API key requirement | Low | High | Current embed snippets are free/public. If they start requiring API keys, the config structure supports adding params. |

---

## Testing Approach

### Manual Testing

1. **Desktop — All six straits:**
   - Click each strait circle; verify MarineTraffic embed loads inside the circle
   - Verify zoom animation still works (satellite bg shows during transition, embed appears after zoom completes)
   - Verify panels (StraitQuantPanel, StraitQualPanel) still appear correctly alongside the embed
   - Click background or close button to deselect; verify embed unmounts cleanly
   - Rapid switching between straits: no orphaned iframes or memory leaks

2. **Mobile — All six straits:**
   - Navigate to each strait detail view
   - Verify embed renders in rectangular format
   - Verify swipe navigation between straits works without iframe interference
   - Verify back button works

3. **Breakpoints:**
   - Test at 1920px, 1440px, 1280px, 1024px, 768px, 375px
   - Verify `width='100%'` makes iframe responsive within its container

4. **SSR / Production Build:**
   - Run `nuxt build && nuxt preview`
   - Verify no hydration mismatch warnings
   - Verify embeds load correctly in production mode

5. **Grid Layout Integrity:**
   - Verify master grid is not broken at any breakpoint
   - Verify panels, header, and map background all render correctly
   - Inspect with browser DevTools grid overlay

### Automated (if applicable)

- Update any existing browser-test specs that reference particle canvases
- Add a basic test: navigate to `/infographics/straits#hormuz`, wait for iframe to appear, check it has the correct src

---

## Open Questions for Implementer

1. **Background image source after particle deprecation:** The `flowConfigs` currently provide `backgroundImage` for the satellite view in the circle. After deprecating flow configs, where should these image paths live? Options: (a) add to straits.json data, (b) create a simple `straitBackgroundImages` map, (c) keep importing from flow-configs until full deletion.

2. **Embed loading indicator:** Should we show a spinner or skeleton while the MarineTraffic iframe loads? The current particle system shows immediately. An iframe will have a noticeable load delay (network fetch + MarineTraffic tile loading). Recommendation: show the satellite background image as placeholder and fade the iframe in once loaded (listen for iframe `load` event).

3. **MarineTraffic attribution:** Does MarineTraffic require visible attribution when using their free embed? Check their terms of service. The embed itself likely includes their branding.

4. **Offline / error fallback:** If MarineTraffic is unreachable (corporate firewall, network issue), the iframe will show nothing. Should we detect this and fall back to the static satellite image? An `onerror` on the iframe or a timeout-based approach could work.

5. **Test pages (`/test/[strait]`)**: These are particle-debug pages. Should they be updated to show the embed instead, removed entirely, or left as-is with the deprecated particle system?
