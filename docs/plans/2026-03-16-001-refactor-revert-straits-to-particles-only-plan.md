---
title: "refactor: Revert straits infographic to particles only, remove live data embed"
type: refactor
status: active
date: 2026-03-16
linear: BF-112
---

# Revert Straits Infographic to Particles Only

## Overview

Remove the MarineTraffic live iframe embed from the straits infographic. The particle animation -- previously a loading screen while the iframe loaded -- becomes the permanent visual for selected straits. The external link button ("Live Marine Traffic") in the StraitQuantPanel is **kept** so users can still explore the dataset on MarineTraffic's website.

## Motivation

The MarineTraffic iframe adds load time, bandwidth cost, and a dependency on a third-party service. The particle animation already provides an effective visual representation of shipping traffic through each strait. Reverting simplifies the UX, improves performance, and removes the "Loading Live Data" wait state.

## Proposed Solution

A surgical removal of all iframe-related code while promoting the particle system from "temporary loading visual" to "permanent visual." The work breaks into four logical steps.

---

## Implementation Plan

### Step 1: StraitCircle.vue -- Make particles permanent, remove embed

**File:** `components/straits/StraitCircle.vue`

Current behavior (lines 56-69):
- `StraitParticleCanvas` renders only when `selected && !mtLoaded`
- `StraitLoadingOverlay` renders only when `selected && !mtLoaded`
- `MarineTrafficEmbed` renders when `selected`, emits `loaded` which sets `mtLoaded = true`

Target behavior:
- `StraitParticleCanvas` renders when `selected` (always, no mtLoaded gate)
- Remove `StraitLoadingOverlay` entirely
- Remove `MarineTrafficEmbed` entirely
- Remove `mtLoaded` ref and its watcher
- Remove `import { marineTrafficConfigs }` (used only for `bgImageSrc`)
- **Keep** `bgImageSrc` but source background images from a simpler data structure (see Step 4)

**Changes:**
```vue
<!-- BEFORE -->
<ClientOnly>
  <StraitParticleCanvas v-if="selected && !mtLoaded" ... />
  <StraitLoadingOverlay v-if="selected && !mtLoaded" />
  <MarineTrafficEmbed v-if="selected" :strait-id="straitId!" @loaded="mtLoaded = true" />
</ClientOnly>

<!-- AFTER -->
<ClientOnly>
  <StraitParticleCanvas v-if="selected" ... />
</ClientOnly>
```

Script changes:
- Remove: `import { marineTrafficConfigs }` line
- Remove: `const mtLoaded = ref(false)`
- Remove: `watch(() => props.straitId, () => { mtLoaded.value = false })`
- Update `bgImageSrc` to read from straits data directly (see Step 4)

### Step 2: StraitMobileDetail.vue -- Remove mobile embed section

**File:** `components/straits/StraitMobileDetail.vue`

Remove the entire "Live MarineTraffic embed" block (lines 188-196):
```vue
<!-- REMOVE this entire block -->
<div :class="contentClassMap[2]" class="mt-mobile-embed">
  <ClientOnly>
    <div v-if="!embedLoaded" class="mt-mobile-embed__placeholder" @click="embedLoaded = true">
      <span class="mt-mobile-embed__tap-label">Tap to view live traffic</span>
    </div>
    <MarineTrafficEmbed v-else :strait-id="strait.id" />
  </ClientOnly>
</div>
```

Script changes:
- Remove: `const embedLoaded = ref(false)` (line 135)

Style changes:
- Remove all `.mt-mobile-embed*` CSS rules (lines 449-482)

### Step 3: StraitMap.vue -- Remove marinetraffic-config preload

**File:** `components/StraitMap.vue`

- Remove: `import { marineTrafficConfigs }` (line 6)
- Remove: The entire `useHead({ link: ... })` block (lines 11-16) that preloads background images from marineTrafficConfigs
- Background images are still referenced by StraitCircle, but they don't need network preloading since they're only shown on click

### Step 4: Simplify marinetraffic-config.ts -- Keep only what StraitQuantPanel needs

**File:** `data/straits/marinetraffic-config.ts`

The StraitQuantPanel (line 37-41) builds a URL from `latitude`, `longitude`, and `zoom`. StraitCircle also reads `backgroundImage` from this config.

**Option A (minimal change):** Keep the file as-is. It's small, and StraitQuantPanel + StraitCircle both use it. Just rename to something clearer if desired.

**Option B (clean break):** Move background image paths into `data/straits/straits.json` (add an `imageUrl` field to each strait entry) and keep `marinetraffic-config.ts` only for the external link URL generation used by StraitQuantPanel. This is cleaner but touches more files.

**Recommended: Option A** -- keep file as-is for now. The config is 25 lines and serves two clear purposes. Renaming is optional.

### Step 5: Config cleanup -- Remove MT network hints and CSP rules

**File:** `nuxt.config.ts`
- Remove lines 59-60:
  ```ts
  { rel: 'preconnect', href: 'https://www.marinetraffic.com' },
  { rel: 'dns-prefetch', href: 'https://www.marinetraffic.com' },
  ```

**File:** `netlify.toml`
- Remove the `/embeds/*` header block (lines 21-28) -- no longer hosting MT embed HTML files
- Simplify the `/*` CSP (line 35): remove `frame-src ... https://www.marinetraffic.com` since we no longer iframe MT content
  ```toml
  # BEFORE
  Content-Security-Policy = "frame-ancestors 'none'; frame-src 'self' https://www.marinetraffic.com"
  # AFTER
  Content-Security-Policy = "frame-ancestors 'none'; frame-src 'self'"
  ```

### Step 6: Delete unused components

Delete these files:
- `components/straits/MarineTrafficEmbed.vue` -- no longer used anywhere
- `components/straits/StraitLoadingOverlay.vue` -- no longer used anywhere

### Step 7: Remove @deprecated tags from particle system

The particle system was marked deprecated in BF-111 anticipating removal after MT embed validation. Since particles are now the permanent visual, remove all `@deprecated` annotations:

- `composables/useParticleFlow.ts` -- line 2
- `utils/particleEngine.ts` -- line 2
- `utils/particleTweakpane.ts` -- line 2
- `data/straits/flow-configs.ts` -- line 1
- `data/straits/malacca-flow.ts` -- line 1
- `data/straits/hormuz-flow.ts` -- line 1
- `data/straits/lombok-flow.ts` -- line 1
- `data/straits/luzon-flow.ts` -- line 1
- `data/straits/taiwan-flow.ts` -- line 1
- `data/straits/bab-el-mandeb-flow.ts` -- line 1
- `components/straits/StraitParticles.vue` -- line 1 (note: this component appears to be a debug/standalone version, not used in production. Consider deleting if unused, but that's a separate cleanup.)

---

## Acceptance Criteria

- [ ] Selecting a strait on desktop shows particles permanently inside the circle (no fade to iframe)
- [ ] No "Loading Live Data" overlay appears
- [ ] No iframe network requests to marinetraffic.com
- [ ] The "Live Marine Traffic" external link button in StraitQuantPanel still works and opens the correct MT page
- [ ] Mobile detail page shows strait circle with particles (no "Tap to view live traffic" placeholder)
- [ ] Background images still display behind particles when a strait is selected
- [ ] `MarineTrafficEmbed.vue` and `StraitLoadingOverlay.vue` are deleted
- [ ] No `@deprecated` tags remain on particle system files
- [ ] CSP in `netlify.toml` no longer references `marinetraffic.com`
- [ ] No preconnect/dns-prefetch hints for `marinetraffic.com` in `nuxt.config.ts`
- [ ] Build passes (`npm run generate`)

## Files Changed Summary

| File | Action |
|------|--------|
| `components/straits/StraitCircle.vue` | Modify: remove MT embed, make particles permanent |
| `components/straits/StraitMobileDetail.vue` | Modify: remove mobile embed section |
| `components/StraitMap.vue` | Modify: remove MT config import and preload |
| `nuxt.config.ts` | Modify: remove MT preconnect hints |
| `netlify.toml` | Modify: simplify CSP rules |
| `components/straits/MarineTrafficEmbed.vue` | Delete |
| `components/straits/StraitLoadingOverlay.vue` | Delete |
| `composables/useParticleFlow.ts` | Modify: remove @deprecated |
| `utils/particleEngine.ts` | Modify: remove @deprecated |
| `utils/particleTweakpane.ts` | Modify: remove @deprecated |
| `data/straits/flow-configs.ts` | Modify: remove @deprecated |
| `data/straits/*-flow.ts` (6 files) | Modify: remove @deprecated |
| `components/straits/StraitParticles.vue` | Modify: remove @deprecated |
| `data/straits/marinetraffic-config.ts` | Keep as-is (used by StraitQuantPanel link + StraitCircle bg images) |

## Risk Assessment

**Low risk.** This is a removal/simplification -- no new features, no architectural changes. The particle system already works and was the original implementation before BF-111 added the iframe layer.

**Potential gotcha:** StraitCircle's `bgImageSrc` still reads from `marineTrafficConfigs`. If `marinetraffic-config.ts` is kept (recommended), this just works. If someone later deletes that file without checking, the background images break silently (computed returns `null`, `v-if` hides the `<img>`).
