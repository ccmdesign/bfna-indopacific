---
title: "refactor: Revert straits infographic to particles only, remove live data embed"
type: refactor
status: active
date: 2026-03-16
linear: BF-112
---

## Enhancement Summary

**Deepened on:** 2026-03-16
**Sections enhanced:** 8 (all implementation steps + risk + acceptance criteria)
**Review perspectives applied:** architecture, simplicity, performance, security, deployment

### Key Improvements
1. Added missing Step 5.5: delete `public/embeds/mt-embed.html` (omitted from original plan)
2. Added Step 8: close or mark obsolete 6 todo files that become dead references after this work
3. Identified a contradiction in Step 1 regarding `bgImageSrc` import removal -- clarified that the marineTrafficConfigs import must be **kept** in StraitCircle if Option A is chosen
4. Added Step 4 research insight: the `embedUrl` field and `embedUrl()` helper function inside `marinetraffic-config.ts` can be cleaned up since only `latitude`/`longitude`/`zoom`/`backgroundImage` are still consumed
5. Expanded risk assessment with three new edge cases discovered via codebase analysis

### New Considerations Discovered
- `StraitParticles.vue` is only used in test pages (`pages/test/*/index.vue`) -- safe to keep but should not block this PR
- Six todo files (140-148) reference MarineTrafficEmbed code that will no longer exist; they should be closed or deleted to avoid confusion
- The `marinetraffic-config.ts` type interface exports `embedUrl: string` which becomes dead weight; a follow-up cleanup could slim the type

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
- **Keep** `import { marineTrafficConfigs }` -- it is still needed for `bgImageSrc` (see Step 4)
- **Keep** `bgImageSrc` computed property as-is

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
- Remove: `const mtLoaded = ref(false)`
- Remove: `watch(() => props.straitId, () => { mtLoaded.value = false })`
- Remove unused imports: `ref` and `watch` can be removed from the vue import if no other refs/watchers remain (verify -- `computed` is still needed for `bgImageSrc`)
- **Keep:** `import { marineTrafficConfigs }` (still used by `bgImageSrc` computed)

### Research Insights (Step 1)

**Contradiction resolved:** The original plan said to "Remove `import { marineTrafficConfigs }`" in Step 1 and then in Step 4 recommended Option A (keep the config file). These conflict -- if you keep Option A, the import in StraitCircle must stay because `bgImageSrc` reads from it. The corrected plan above keeps the import.

**Vue cleanup:** After removing `mtLoaded`, the `ref` import may become unused (check if any other `ref()` calls remain in the `<script setup>`). Similarly, `watch` is only used for the `mtLoaded` reset -- removing that watcher means `watch` can also be dropped from the import. The final import should be:
```ts
import { computed } from 'vue'
```

**Edge case -- rapid strait switching:** Currently, the `watch` on `straitId` resets `mtLoaded` to prevent stale iframe state. After removal, particles restart via `StraitParticleCanvas` being re-mounted (Vue's `v-if` + `:strait-id` binding triggers composable restart). No additional reset logic is needed.

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

### Research Insights (Step 2)

**Content layout shift:** Removing the embed block changes the vertical flow of the mobile detail page. The embed occupied `aspect-ratio: 16/9` worth of vertical space between the hero and description sections. After removal, the description text will sit directly below the hero circle + name/share line. This is the desired behavior -- verify visually that the spacing looks correct. The `margin-bottom: 20px` on `.mt-mobile-embed` disappears, so the gap between hero and description may tighten. Check if `.strait-mobile-detail__desc` already has sufficient `margin-top` or if the existing `padding: 1rem 0 1.5rem` on the hero section provides enough spacing.

**Stagger delay class impact:** The embed block used `contentClassMap[2]` for its stagger animation. After removal, the description (line 199) already uses `contentClassMap[3]`, so the stagger sequence has a "gap" at delay-2 for the quant panel side. This is cosmetic only and not a bug -- content still animates in correctly, just with slightly different perceived timing. No action needed.

### Step 3: StraitMap.vue -- Remove marinetraffic-config preload

**File:** `components/StraitMap.vue`

- Remove: `import { marineTrafficConfigs }` (line 6)
- Remove: The entire `useHead({ link: ... })` block (lines 11-16) that preloads background images from marineTrafficConfigs
- Background images are still referenced by StraitCircle, but they don't need network preloading since they're only shown on click

### Research Insights (Step 3)

**Performance trade-off (preload removal):** The `useHead` preload injected `<link rel="preload" as="image">` tags for all 6 strait background images (~6 HTTP requests on page load). Removing this means:
- **Benefit:** Saves ~6 network requests and associated bandwidth on initial page load for users who never click a strait.
- **Cost:** When a user clicks a strait for the first time, the background image loads on-demand (cold fetch). On modern connections this is ~100-300ms for a JPEG. The particle animation renders instantly and the background image fades in underneath via the `.strait-bg-image` CSS transition (0.6s), which naturally masks the load delay.
- **Conclusion:** The removal is net-positive. The particle canvas provides immediate visual feedback while the background image loads lazily. No additional loading state needed.

### Step 4: Simplify marinetraffic-config.ts -- Keep only what StraitQuantPanel needs

**File:** `data/straits/marinetraffic-config.ts`

The StraitQuantPanel (line 37-41) builds a URL from `latitude`, `longitude`, and `zoom`. StraitCircle also reads `backgroundImage` from this config.

**Option A (minimal change):** Keep the file as-is. It's small, and StraitQuantPanel + StraitCircle both use it. Just rename to something clearer if desired.

**Option B (clean break):** Move background image paths into `data/straits/straits.json` (add an `imageUrl` field to each strait entry) and keep `marinetraffic-config.ts` only for the external link URL generation used by StraitQuantPanel. This is cleaner but touches more files.

**Recommended: Option A** -- keep file as-is for now. The config is 25 lines and serves two clear purposes. Renaming is optional.

### Research Insights (Step 4)

**Dead code within the kept file:** Even with Option A, the `embedUrl` field on each config entry and the `embedUrl()` helper function (lines 13-15) are now dead code -- nothing consumes the embed URL after removing `MarineTrafficEmbed.vue`. Similarly, the `MarineTrafficConfig` interface's `embedUrl: string` field is dead. Consider a lightweight cleanup:

```ts
// BEFORE (line 1-8)
export interface MarineTrafficConfig {
  straitId: string
  embedUrl: string        // <-- dead after this PR
  backgroundImage: string
  latitude: number
  longitude: number
  zoom: number
}

// AFTER (optional cleanup within this PR scope)
export interface MarineTrafficConfig {
  straitId: string
  backgroundImage: string
  latitude: number
  longitude: number
  zoom: number
}
```

And remove the `embedUrl()` function and `embedUrl` fields from each entry. This keeps the file truly minimal. The StraitQuantPanel builds its own URL from `latitude`/`longitude`/`zoom` directly (line 38-41 of StraitQuantPanel.vue), so the `embedUrl` field was never used by StraitQuantPanel.

**Recommendation:** Do this cleanup in this PR since it's directly caused by the embed removal. It prevents future confusion about why embed URLs exist in a file when no embeds are rendered.

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

### Research Insights (Step 5)

**CSP tightening opportunity:** After removing the MT frame-src allowance, consider whether `frame-src 'self'` is still needed. If the site doesn't iframe its own content on non-embed pages, you could tighten to `frame-src 'none'` on the `/*` catch-all. However, keep `frame-src 'self'` if there's any chance of self-referencing iframes (e.g., the `/embed/*` routes could theoretically be loaded in iframes from the main site). Safer to keep `'self'` as-is.

**X-Frame-Options header:** The `/*` block already has `X-Frame-Options = "DENY"` which is the correct setting and doesn't need changes.

### Step 5.5: Delete public/embeds/mt-embed.html

**File:** `public/embeds/mt-embed.html`

This file is a standalone HTML page used as an intermediary iframe host for MarineTraffic's embed.js script. It was served at `/embeds/mt-embed.html` and referenced in the now-deleted `MarineTrafficEmbed.vue` component's earlier iterations. With the embed removed, this file serves no purpose and will be deployed as dead weight.

**Action:** Delete `public/embeds/mt-embed.html`. If the `public/embeds/` directory becomes empty after deletion, remove the directory as well.

**Note:** This was missing from the original plan. The file was discovered during codebase analysis. The `/embeds/*` header block removal in Step 5 already handles the Netlify config side.

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

### Research Insights (Step 7)

**StraitParticles.vue usage:** Confirmed via grep that `StraitParticles.vue` is referenced only from test pages (`pages/test/malacca/index.vue`, `pages/test/hormuz/index.vue`, etc.). These test pages are excluded from production builds via `nuxt.config.ts` ignore rules. Removing the `@deprecated` tag is correct. Deleting the component is out of scope for this PR since it would break test pages used during particle tuning.

**Wording update for @deprecated lines:** The current annotation reads `@deprecated BF-111: safe to remove once MarineTraffic embed is validated`. After this PR, the annotation should simply be removed entirely (not updated to say something new). The particle system is no longer deprecated -- it is the primary visual.

### Step 8: Close obsolete todo files

The following todo files in `todos/` reference MarineTrafficEmbed code, iframe behavior, or embed HTML that will no longer exist after this PR. They should be deleted or moved to `_archive/` to prevent confusion:

| File | Reason |
|------|--------|
| `todos/141-pending-p2-sandbox-allow-scripts-allow-same-origin.md` | References `MarineTrafficEmbed.vue` sandbox attribute -- file deleted |
| `todos/142-pending-p2-iframe-load-fires-on-about-blank.md` | References `MarineTrafficEmbed.vue` iframe lifecycle -- file deleted |
| `todos/143-pending-p2-mobile-embed-always-loads-no-user-intent.md` | References mobile embed behavior -- embed removed |
| `todos/145-pending-p2-loading-lazy-redundant-with-vif.md` | References `MarineTrafficEmbed.vue` loading attribute -- file deleted |
| `todos/146-pending-p3-embed-html-duplication.md` | References `mt-embed.html` and `marinetraffic-config.ts` embed URLs -- embed deleted |
| `todos/147-pending-p3-hardcoded-colors-fallback-text.md` | References `MarineTrafficEmbed.vue` fallback styles -- file deleted |
| `todos/148-pending-p3-maptype-magic-number-undocumented.md` | References `mt-embed.html` maptype variable -- file deleted |

**Action:** Delete these 7 files. Todo `140-pending-p1-hash-routing-no-validation.md` references MarineTraffic tangentially but is about route validation -- review separately; do not delete in this PR.

---

## Acceptance Criteria

- [ ] Selecting a strait on desktop shows particles permanently inside the circle (no fade to iframe)
- [ ] No "Loading Live Data" overlay appears
- [ ] No iframe network requests to marinetraffic.com
- [ ] The "Live Marine Traffic" external link button in StraitQuantPanel still works and opens the correct MT page
- [ ] Mobile detail page shows strait circle with particles (no "Tap to view live traffic" placeholder)
- [ ] Background images still display behind particles when a strait is selected
- [ ] `MarineTrafficEmbed.vue` and `StraitLoadingOverlay.vue` are deleted
- [ ] `public/embeds/mt-embed.html` is deleted
- [ ] No `@deprecated` tags remain on particle system files
- [ ] CSP in `netlify.toml` no longer references `marinetraffic.com`
- [ ] No preconnect/dns-prefetch hints for `marinetraffic.com` in `nuxt.config.ts`
- [ ] Obsolete todo files (141-143, 145-148) are deleted
- [ ] Build passes (`npm run generate`)

### Verification Checklist

After implementation, run these checks:

1. **Desktop flow:** Navigate to `/infographics/straits`, click each of the 6 straits. Verify particles animate continuously with no loading overlay or iframe flash. Verify background image fades in behind particles.
2. **Mobile flow:** Navigate to a strait detail page (e.g., `/infographics/straits/malacca`). Verify no "Tap to view live traffic" placeholder. Verify particles render in the hero circle.
3. **External link:** On desktop, click a strait, verify the "Live Marine Traffic" link in the left panel opens `marinetraffic.com` in a new tab with correct coordinates.
4. **Network tab:** Open DevTools Network tab, click a strait, confirm zero requests to `*.marinetraffic.com`.
5. **Build:** Run `npm run generate` and confirm it completes without errors.
6. **Reduced motion:** Enable `prefers-reduced-motion: reduce` in OS settings. Click a strait. Verify particles render as a static snapshot (no animation), no loading overlay.

## Files Changed Summary

| File | Action |
|------|--------|
| `components/straits/StraitCircle.vue` | Modify: remove MT embed + loading overlay, make particles permanent, clean up unused imports |
| `components/straits/StraitMobileDetail.vue` | Modify: remove mobile embed section + CSS + embedLoaded ref |
| `components/StraitMap.vue` | Modify: remove MT config import and useHead preload |
| `nuxt.config.ts` | Modify: remove MT preconnect/dns-prefetch hints |
| `netlify.toml` | Modify: remove `/embeds/*` header block, simplify CSP rules |
| `public/embeds/mt-embed.html` | Delete |
| `components/straits/MarineTrafficEmbed.vue` | Delete |
| `components/straits/StraitLoadingOverlay.vue` | Delete |
| `data/straits/marinetraffic-config.ts` | Modify: remove `embedUrl` field/function (optional cleanup) |
| `composables/useParticleFlow.ts` | Modify: remove @deprecated |
| `utils/particleEngine.ts` | Modify: remove @deprecated |
| `utils/particleTweakpane.ts` | Modify: remove @deprecated |
| `data/straits/flow-configs.ts` | Modify: remove @deprecated |
| `data/straits/*-flow.ts` (6 files) | Modify: remove @deprecated |
| `components/straits/StraitParticles.vue` | Modify: remove @deprecated |
| `todos/141-*.md` through `todos/148-*.md` (7 files) | Delete (obsolete references to removed embed code) |

## Risk Assessment

**Low risk.** This is a removal/simplification -- no new features, no architectural changes. The particle system already works and was the original implementation before BF-111 added the iframe layer.

### Edge Cases & Gotchas

1. **bgImageSrc still reads from marineTrafficConfigs.** If `marinetraffic-config.ts` is kept (recommended), this just works. If someone later deletes that file without checking, the background images break silently (computed returns `null`, `v-if` hides the `<img>`). Mitigated by keeping the file and removing only the `embedUrl` dead code.

2. **Nuxt auto-import of deleted components.** Because `nuxt.config.ts` registers `~/components/straits` for auto-import (line 43), deleting `MarineTrafficEmbed.vue` and `StraitLoadingOverlay.vue` will trigger a Nuxt module reload in dev mode. This is expected and harmless. Verify that no other file references these component names in templates -- the grep above confirms they are only used in `StraitCircle.vue` and `StraitMobileDetail.vue` (both modified in this PR).

3. **`contentClassMap[2]` stagger gap on mobile.** After removing the embed block that used delay class `2`, the mobile detail page jumps from delay `1` (hero name) to delay `3` (description). The 100ms gap in the stagger sequence is imperceptible. No action needed.

4. **`public/embeds/` directory after deletion.** If `mt-embed.html` is the only file, deleting it leaves an empty `public/embeds/` directory. Git does not track empty directories, so this cleans itself up automatically on commit.

5. **Taiwan background image.** The config currently maps Taiwan to `luzon.jpg` (line 19 of `marinetraffic-config.ts`). This is a pre-existing issue from BF-111 and is not introduced by this PR, but worth noting for a follow-up fix.
