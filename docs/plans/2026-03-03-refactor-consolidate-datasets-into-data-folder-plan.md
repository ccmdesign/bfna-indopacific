---
title: "refactor: Consolidate datasets into data/ folder"
type: refactor
status: active
date: 2026-03-03
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
---

# refactor: Consolidate datasets into data/ folder

## Overview

Move all dataset files into a unified `data/` directory organized by infographic (e.g., `data/renewables/`, `data/straits/`), and replace the runtime `d3.csv()` fetch in `RenewableEnergyChart.vue` with a build-time import. This aligns the renewables data loading pattern with the straits pattern already established in the codebase (see brainstorm: `docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md`, "Data Consolidation" section).

## Problem Statement / Motivation

The project currently has datasets scattered across three locations with inconsistent loading strategies:

| File | Location | Loading pattern |
|------|----------|----------------|
| `dataset.csv` (renewables) | `public/dataset.csv` | Runtime fetch via `d3.csv('/dataset.csv')` |
| `dataset.csv` (renewables) | `assets/dataset.csv` | Duplicate -- unused copy |
| `straits.json` | `data/straits.json` | Build-time import via `import ... from '~/data/straits.json'` |
| `straits.json` | `_process/straits.json` | Process artifact -- identical copy |

Problems:
1. **Inconsistent patterns** -- Two infographics use two different data-loading strategies. The straits pattern (build-time import) is correct for an SSG site; the renewables pattern (runtime fetch) adds an unnecessary network request.
2. **No organizational convention** -- Datasets live in `public/`, `assets/`, `data/`, and `_process/` with no clear rule for where new infographic data should go.
3. **Duplicate files** -- `dataset.csv` exists in both `public/` and `assets/`. `straits.json` exists in both `data/` and `_process/`.
4. **SSG mismatch** -- For a statically generated site (`nitro: { preset: 'static' }`), runtime fetches add latency and a network dependency that build-time imports eliminate.

## Proposed Solution

Establish `data/<infographic-slug>/` as the single canonical location for all dataset files and use build-time imports exclusively.

### Target directory structure

```
data/
  renewables/
    dataset.csv          # moved from public/dataset.csv
  straits/
    straits.json         # moved from data/straits.json
```

### Migration steps

#### Step 1: Create directory structure and move files

```bash
mkdir -p data/renewables data/straits
mv public/dataset.csv data/renewables/dataset.csv
mv data/straits.json data/straits/straits.json
```

#### Step 2: Remove duplicate files

```bash
rm assets/dataset.csv    # duplicate of public/dataset.csv
```

The `_process/straits.json` file should be left in place -- it is a process artifact (data preparation workspace), not a runtime dependency. Its purpose is different from the canonical `data/` copy.

#### Step 3: Switch renewables CSV from runtime fetch to build-time import

**The core technical decision:** CSV files cannot be natively imported by Vite like JSON. There are three viable approaches:

**Option A (Recommended): Use Vite's `?raw` import + d3.csvParse()**

Import the CSV as a raw string at build time, then parse it with `d3.csvParse()` (synchronous, no network request). This approach:
- Requires zero new dependencies
- Uses d3's existing CSV parser (already in the bundle)
- Matches how the data is already consumed downstream
- Keeps the file as `.csv` (no format conversion needed)

```typescript
// components/RenewableEnergyChart.vue
import csvString from '~/data/renewables/dataset.csv?raw';
import * as d3 from 'd3';

// In onMounted or <script setup> top-level:
const rawData = d3.csvParse(csvString);
```

**Option B: Convert CSV to JSON**

Pre-convert `dataset.csv` to `dataset.json` and import natively. Downside: loses the CSV source-of-truth format and requires a conversion step when data updates.

**Option C: Add vite-plugin-csv**

A Vite plugin that enables direct CSV imports. Downside: adds a dependency for a single small file.

**Recommendation: Option A.** Zero dependencies, minimal code change, keeps CSV format.

#### Step 4: Update `RenewableEnergyChart.vue`

Replace the async runtime fetch:

```typescript
// BEFORE (runtime fetch -- components/RenewableEnergyChart.vue:140)
const rawData = await d3.csv('/dataset.csv');
```

With build-time import + synchronous parse:

```typescript
// AFTER (build-time import)
import csvString from '~/data/renewables/dataset.csv?raw';

// Inside onMounted:
const rawData = d3.csvParse(csvString);
```

The `onMounted` callback can remain `async` (other future work may need it), but the `await d3.csv(...)` call is replaced with the synchronous `d3.csvParse()`. The rest of the data transformation logic (`rawData.columns`, `.map()`, etc.) remains unchanged because `d3.csvParse()` returns the same `DSVRowArray` type as `d3.csv()`.

#### Step 5: Update straits import path (if already referenced)

Any existing import of `~/data/straits.json` must be updated to `~/data/straits/straits.json`. Per the BF-3 scaffolding plan, the straits data is imported as:

```typescript
import straitsData from '~/data/straits.json';
// becomes:
import straitsData from '~/data/straits/straits.json';
```

This may not yet be in a committed component (the straits infographic build is in progress), but any existing references must be found and updated.

## Technical Considerations

### Vite `?raw` import and TypeScript

Vite supports `?raw` imports natively -- no plugin needed. However, TypeScript may need a module declaration for `.csv?raw` imports. Add to a `*.d.ts` file (or the existing `env.d.ts` if present):

```typescript
// types/csv.d.ts (or env.d.ts)
declare module '*.csv?raw' {
  const content: string;
  export default content;
}
```

Alternatively, if using Nuxt's auto-generated types, this may already be handled. Verify during implementation.

### d3.csvParse vs d3.csv

- `d3.csv(url)` -- async, fetches from URL, returns `DSVRowArray<string>`
- `d3.csvParse(string)` -- sync, parses a string, returns `DSVRowArray<string>`

Both return the same type with a `.columns` property. The downstream code that accesses `rawData.columns` and iterates rows will work identically with either.

### SSG behavior

With `nitro: { preset: 'static' }`, the site is pre-rendered. Using `?raw` imports means the CSV content is inlined into the JavaScript bundle at build time. For the renewables dataset (~618 bytes), this is negligible. For the straits JSON (~16KB), it is already bundled this way.

### No public/ serving needed for dataset.csv

After moving `dataset.csv` out of `public/`, the file will no longer be served at `/dataset.csv`. This is intentional -- the data is now bundled. If any external consumer relied on that URL (unlikely for an infographic site), it would break. No evidence of external consumers exists.

## Acceptance Criteria

- [ ] `data/renewables/dataset.csv` exists and contains the renewables dataset
- [ ] `data/straits/straits.json` exists and contains the straits dataset
- [ ] `public/dataset.csv` is removed
- [ ] `assets/dataset.csv` is removed
- [ ] `RenewableEnergyChart.vue` imports CSV via `?raw` and uses `d3.csvParse()` instead of `d3.csv()`
- [ ] The renewables chart renders identically (same data, same visual output)
- [ ] Any existing `~/data/straits.json` imports are updated to `~/data/straits/straits.json`
- [ ] TypeScript compiles without errors (add `*.csv?raw` module declaration if needed)
- [ ] `nuxt generate` (static build) succeeds
- [ ] `nuxt dev` renders the renewables chart correctly

## Success Metrics

- Zero runtime fetches for dataset files (all data bundled at build time)
- Single canonical location for each dataset (`data/<slug>/`)
- No duplicate dataset files in the repository
- Pattern is clear and documented for future infographics (third planned infographic can follow the same convention)

## Dependencies & Risks

**Dependencies:**
- The routing migration (BF-68, `2026-03-03-feat-introduce-nuxt-file-based-routing-plan.md`) should land first or concurrently, as it restructures `app.vue` into `pages/index.vue`. The import path in `RenewableEnergyChart.vue` is unaffected (it is a component, not a page), but testing should happen against the routed structure.

**Risks:**
- **Low: TypeScript declaration** -- The `?raw` import suffix may require a type declaration. Well-documented Vite feature; straightforward fix.
- **Low: `_process/straits.json` confusion** -- Leaving this file in place may cause future confusion. Consider adding a README or comment in `_process/` explaining its purpose as a data preparation workspace. Not blocking for this task.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md](docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md) -- Key decision carried forward: "Consolidate all datasets into `data/` with per-infographic organization... switching from runtime `d3.csv('/dataset.csv')` fetch to a build-time import, matching the pattern already used by the straits data."

### Internal References

- Existing straits data pattern: `data/straits.json` (build-time JSON import)
- BF-3 scaffolding epic: `docs/epics/BF-3-phase-1-scaffolding.md:22` -- documents the `import straitsData from '~/data/straits.json'` convention
- Runtime fetch to replace: `components/RenewableEnergyChart.vue:140` -- `await d3.csv('/dataset.csv')`
- Routing plan (dependency): `docs/plans/2026-03-03-feat-introduce-nuxt-file-based-routing-plan.md`

### External References

- Vite static asset handling (`?raw`): https://vitejs.dev/guide/assets.html#importing-asset-as-string
- d3.csvParse API: https://d3js.org/d3-dsv#csvParse
