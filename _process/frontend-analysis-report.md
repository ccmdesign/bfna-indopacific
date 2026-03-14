# Frontend Analysis Report: Performance & Refactoring Opportunities

**Date:** 2026-03-10
**Scope:** Full frontend codebase — components, composables, utilities, styles, data layer

---

## Executive Summary

The codebase is a Nuxt 4 SSG project with ~2,600 lines of application code across 29 Vue components, 9 composables, and 4 utility modules. Code quality is generally high — Composition API used consistently, TypeScript throughout, good separation of concerns. However, there are clear opportunities around **duplicated formatting/display logic**, **D3 bundle size**, **repeated structural patterns across detail panels**, and **composable complexity** in the particle system.

---

## Part 1: Performance Improvements

### P1. D3 Full Bundle Import (HIGH impact)

**File:** [RenewableEnergyChart.vue:3](components/RenewableEnergyChart.vue#L3)

```ts
import * as d3 from 'd3';
```

This imports the **entire D3 library** (~250KB minified). The other two D3 consumers (`StraitMap.vue`, `StraitHistoryChart.vue`) correctly use granular imports (`d3-scale`, `d3-array`, `d3-shape`).

**Fix:** Replace with granular imports:
```ts
import { scaleTime, scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'
import { axisBottom, axisLeft } from 'd3-axis'
import { extent } from 'd3-array'
import { select } from 'd3-selection'
```

**Estimated savings:** ~200KB from the client bundle (tree-shaking can't eliminate unused D3 modules with `import *`).

---

### P2. Particle Engine Grid Allocation on Every Strait Switch (MEDIUM impact)

**File:** [particleEngine.ts](utils/particleEngine.ts) — `init()` method

Each strait switch triggers:
- `rasterizePolygon()` — O(270×270) grid allocation (~150KB `Uint8Array`)
- `buildDistanceField()` — BFS over the grid (~290KB `Float32Array`)

These are allocated fresh each time. For 6 straits, the polygons and grids are deterministic.

**Opportunity:** Cache rasterized grids and distance fields per strait ID. Since polygon data is static, the grid can be computed once and reused across switches. This eliminates ~50-300ms of compute on each strait transition.

---

### P3. Canvas DPR Scaling Without Budget Cap (MEDIUM impact)

**Files:** [useParticleFlow.ts](composables/useParticleFlow.ts), [useFisheyeCanvas.ts](composables/useFisheyeCanvas.ts)

Both composables multiply canvas dimensions by `devicePixelRatio`. On Retina/4K displays (DPR 2-3), canvas pixel counts quadruple or more. The fisheye composable caps at 2048px, but the particle flow canvas does not have an explicit cap.

**Opportunity:** Add a max canvas dimension cap (e.g., 2048px) to `useParticleFlow.ts` as well, and consider capping DPR at 2 for the particle canvas — the visual difference between DPR 2 and 3 for small dots is negligible, but the rendering cost is significant.

---

### P4. `will-change: transform` Left Permanently On (LOW impact)

**Files:** [StraitQuantPanel.vue:125](components/straits/StraitQuantPanel.vue#L125), StraitCircle styles

`will-change: transform` is set in CSS permanently. This promotes the element to its own compositing layer, consuming GPU memory even when not animating. Best practice is to apply it only during active animations.

**Opportunity:** Apply `will-change` via class toggle only when the 3D tilt effect is active, or remove it entirely since modern browsers handle compositing well for CSS transitions.

---

### P5. ResizeObserver Callback Patterns (LOW impact)

**Files:** 5 separate ResizeObserver implementations across the codebase

All use the correct RAF-coalescing pattern, but each reimplements it independently. No functional issue, but a shared utility would reduce boilerplate (see Refactoring section R3).

---

### P6. Prefers-Reduced-Motion: Upfront Particle Spawn (LOW impact)

**File:** [useParticleFlow.ts](composables/useParticleFlow.ts)

When reduced motion is active, the code spawns 240+ ticks upfront in a synchronous loop (~50ms). This is a blocking operation on the main thread.

**Opportunity:** Either pre-compute a static snapshot at build time, or defer this to an idle callback (`requestIdleCallback`) to avoid blocking during page load.

---

### P7. Dynamic Import on Every Strait Switch (LOW impact)

**File:** [useParticleFlow.ts](composables/useParticleFlow.ts) — polygon loading

```ts
const polygonModule = await import(`~/data/straits/${straitId}-polygon.json`)
```

ES module caching means subsequent imports are fast, but the first import of each polygon triggers a network request. Since there are only 6 straits, all polygon JSONs could be bundled into `flow-configs.ts` or preloaded.

**Opportunity:** Static import all 6 polygon files in `flow-configs.ts` (they're small JSON files). This eliminates the async waterfall on first strait selection.

---

## Part 2: Refactoring Opportunities

### R1. Duplicated Formatting Functions (HIGH priority)

**Problem:** `fmtUsd()` and `fmtNum()` are defined in **three places**:
1. [utils/straitFormatters.ts](utils/straitFormatters.ts) — the canonical utility
2. [StraitQuantPanel.vue:26-34](components/straits/StraitQuantPanel.vue#L26-L34) — local copy
3. [StraitSnapshot.vue:60-75](components/straits/StraitSnapshot.vue#L60-L75) — local copy with extra `fmtMt()`

`StraitDetailPanel.vue` and `StraitMobileDetail.vue` correctly import from `straitFormatters.ts`, but the other two components have inline copies.

**Fix:**
- Move `fmtMt()` from `StraitSnapshot.vue` into `straitFormatters.ts`
- Delete the local `fmtUsd`/`fmtNum` definitions from `StraitQuantPanel.vue` and `StraitSnapshot.vue`
- Import from `~/utils/straitFormatters` consistently everywhere

---

### R2. Duplicated Vessel Segment Computation (HIGH priority)

**Problem:** `computeVesselSegments()` exists in the shared utility, but `StraitQuantPanel.vue` has an inline reimplementation (lines 14-24) that computes the same vessel breakdown with slightly different variable names.

**Fix:** Replace the inline computed in `StraitQuantPanel.vue` with:
```ts
import { computeVesselSegments } from '~/utils/straitFormatters'
const vesselSegments = computed(() => {
  const d = yearData.value
  if (!d) return []
  return computeVesselSegments(d.vessels)
})
```

This is already the pattern used by `StraitDetailPanel.vue` and `StraitMobileDetail.vue`.

---

### R3. Repeated Detail Panel Structure (MEDIUM priority)

**Problem:** Four components render nearly identical strait detail data with different layouts:

| Component | Layout | Metrics | Vessel Bar | Industries | Threats | Facts | Chart |
|-----------|--------|---------|-----------|-----------|---------|-------|-------|
| `StraitDetailPanel.vue` | Desktop sidebar | Yes | Yes | Yes | Yes | Yes | Yes |
| `StraitQuantPanel.vue` | Desktop 3D plane | Yes | Yes | No | No | No | Yes |
| `StraitQualPanel.vue` | Desktop 3D plane | No | No | Yes | Yes | Yes | No |
| `StraitMobileDetail.vue` | Mobile full-screen | Yes | Yes | Yes | Yes | Yes | Yes |

The template sections (hero stat, metrics grid, vessel bar, tags, facts) are structurally identical across components — only styling differs.

**Opportunity:** Extract shared subcomponents:
- `StraitHeroStat.vue` — hero value + label
- `StraitMetricsGrid.vue` — oil/LNG/cargo/vessels grid
- `StraitVesselBar.vue` — stacked bar + legend
- `StraitTagList.vue` — industries/threats tag display
- `StraitFactList.vue` — key facts list

Each detail panel would compose these subcomponents with its own layout and styling. This eliminates ~150 lines of duplicated template code and ensures data formatting is consistent.

---

### R4. Stacked Bar Styles Duplicated (MEDIUM priority)

**Problem:** Stacked bar CSS (`.stacked-bar`, `.stacked-bar__track`, `.stacked-bar__segment`, etc.) is defined in:
1. [public/styles.css](public/styles.css) — global styles
2. [StraitQuantPanel.vue](components/straits/StraitQuantPanel.vue) — scoped duplicate (lines 231-287)

The scoped version in StraitQuantPanel has slight variations (bar height 3px vs global, no border-radius, different legend spacing) but shares the same class names.

**Fix:** Consolidate into `public/styles.css` with CSS custom properties for the variant dimensions, or use a dedicated `StraitVesselBar.vue` component with its own scoped styles (pairs with R3).

---

### R5. ResizeObserver Boilerplate (MEDIUM priority)

**Problem:** The RAF-coalesced ResizeObserver pattern is reimplemented 5 times across:
- `useFisheyeCanvas.ts` (lines 343-370)
- `useParticleFlow.ts` (lines 148-165)
- `StraitMap.vue` (lines 198-230)
- `StraitMobileDetail.vue` (lines 82-95)
- `RenewableEnergyChart.vue` (lines 351-360)

Each has the same structure: create observer → RAF-coalesce → cleanup on unmount.

**Opportunity:** Extract a `useResizeObserver(elRef, callback)` composable that encapsulates the pattern. This is ~15 lines and would replace 5 separate implementations. (VueUse offers this, but adding a dependency just for this may not be worth it — a local composable is sufficient.)

---

### R6. Module-Level Singleton Pattern Inconsistency (LOW priority)

**Problem:** `useStraitTransition.ts` and `useSwipeNavigation.ts` both use module-level singletons for shared state, but with different patterns:
- `useStraitTransition` uses `ref()` at module scope + HMR cleanup via `import.meta.hot`
- `useSwipeNavigation` uses a mix of `ref()` and plain `boolean` at module scope

**Opportunity:** Standardize on one pattern. Both could use a single exported reactive store object, or use the Nuxt `useState()` composable for SSR-safe shared state.

---

### R7. Historical Data Type Repeated Inline (LOW priority)

**Problem:** The historical data type is written out inline in props across 4 components:

```ts
historical: Record<string, { capacityMt: number; vessels: { total: number; container: number; dryBulk: number; tanker: number }; capacityByType: { container: number; dryBulk: number; tanker: number } }>
```

This exact type appears in:
- `StraitQuantPanel.vue` (line 6)
- `StraitDetailPanel.vue` (line 7)
- `StraitMobileDetail.vue` (implied)
- `StraitHistoryChart.vue` (implied)

**Fix:** The `StraitHistoricalEntry` type already exists in `types/strait.ts`. Replace inline types with:
```ts
historical: Record<string, StraitHistoricalEntry>
```

---

### R8. StraitMobileDetail.vue Size (LOW priority)

**File:** [StraitMobileDetail.vue](components/straits/StraitMobileDetail.vue) — 515 lines

This is the largest component at 515 lines. It handles:
- Shared element transition (FLIP animation)
- Swipe navigation
- ResizeObserver for hero circle sizing
- History state management (back button interception)
- All detail rendering (metrics, bars, industries, threats, facts)
- Staggered content fade-in animation

The rendering portion (template + styles) could be split from the interaction logic by extracting the detail content into subcomponents (overlaps with R3).

---

### R9. Test Page Duplication (LOW priority)

**Problem:** The 6 test pages under `pages/test/` (bab-el-mandeb, hormuz, lombok, luzon, malacca, taiwan) are likely near-identical, each rendering a single strait for isolated testing.

**Opportunity:** If they share the same structure, consolidate into a single `pages/test/[straitId].vue` dynamic route page.

---

## Part 3: Architecture Notes

### Things Working Well

1. **Type safety** — `types/strait.ts` provides good contracts; most components are fully typed
2. **Composable extraction** — Complex logic (particles, fisheye, tilt, transitions) is properly extracted into composables
3. **SSR safety** — Consistent `import.meta.client` guards and `ClientOnly` wrappers
4. **Grid architecture** — The `display: contents` pattern for grid participation is well-documented and respected
5. **Cleanup discipline** — All event listeners, observers, and RAF handles are properly cleaned up
6. **Reduced motion** — Consistent `prefers-reduced-motion` support throughout
7. **Data layer** — Clean separation between raw data (`straits.json`) and access layer (`straitsData.ts`)

### Dependency Health

| Dependency | Size Impact | Usage | Notes |
|-----------|------------|-------|-------|
| `d3` | ~250KB | 3 components | Should use granular imports everywhere (see P1) |
| `gsap` | ~30KB | Listed in deps | Not found in any imports — **may be unused** |
| `tweakpane` | ~50KB | Dev only | Correctly in devDependencies |

**GSAP check needed:** GSAP is listed in `package.json` dependencies but was not found imported in any component or composable. If it's truly unused, removing it would save ~30KB from the production bundle.

---

## Priority Matrix

| ID | Category | Impact | Effort | Priority |
|----|----------|--------|--------|----------|
| P1 | Performance | HIGH | Low | **Do first** |
| R1 | Refactor | HIGH | Low | **Do first** |
| R2 | Refactor | HIGH | Low | **Do first** |
| P2 | Performance | MEDIUM | Medium | Next sprint |
| R3 | Refactor | MEDIUM | Medium | Next sprint |
| R4 | Refactor | MEDIUM | Low | Next sprint |
| R5 | Refactor | MEDIUM | Low | Next sprint |
| P3 | Performance | MEDIUM | Low | Next sprint |
| P7 | Performance | LOW | Low | Backlog |
| R7 | Refactor | LOW | Low | Backlog |
| R6 | Refactor | LOW | Low | Backlog |
| R8 | Refactor | LOW | Medium | Backlog |
| R9 | Refactor | LOW | Low | Backlog |
| P4 | Performance | LOW | Low | Backlog |
| P5 | Performance | LOW | Low | Backlog |
| P6 | Performance | LOW | Low | Backlog |

---

## Quick Wins (< 30 min each)

1. **P1** — Change `import * as d3` to granular imports in `RenewableEnergyChart.vue`
2. **R1** — Move `fmtMt` to `straitFormatters.ts`, delete local copies from StraitQuantPanel and StraitSnapshot
3. **R2** — Replace inline `vesselSegments` in StraitQuantPanel with `computeVesselSegments` import
4. **R7** — Replace inline historical types with `Record<string, StraitHistoricalEntry>`
5. **GSAP audit** — Verify if GSAP is used anywhere; remove from deps if not
