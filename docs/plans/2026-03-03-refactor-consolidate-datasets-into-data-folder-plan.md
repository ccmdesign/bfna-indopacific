---
title: "refactor: Consolidate datasets into data/ folder"
type: refactor
status: active
date: 2026-03-03
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
---

# refactor: Consolidate datasets into data/ folder

## Enhancement Summary

**Deepened on:** 2026-03-03
**Sections enhanced:** 9
**Research sources used:** Vite official docs (Context7 /vitejs/vite), Nuxt 4 official docs (Context7 /websites/nuxt_4_x), Nuxt skill (config, routing references), Vue best practices skill, Vue skill (components, composables references), d3-dsv API documentation, GitHub Nuxt issues/discussions on ?raw imports, Vite static asset handling docs, web searches on SSG data loading patterns, bundle size analysis, TypeScript module declarations

### Key Improvements
1. Discovered a **medium-risk compatibility issue** with `?raw` imports during `nuxt generate` -- documented reports show `?raw` works reliably in `nuxt dev` (Vite) but may encounter Rollup resolution issues during `nuxt generate` in certain contexts. Added a concrete fallback strategy and mandatory verification step.
2. Added an **alternative Option A2** approach using `@rollup/plugin-dsv` that provides native CSV-to-JSON transformation at build time, producing a typed array instead of a raw string -- eliminates the need for both `?raw` type declarations and runtime `d3.csvParse()` calls.
3. Identified that the **`onMounted` callback can be simplified** -- since the data is now synchronously available, the data transformation can be moved to `<script setup>` top level, removing the async wrapper and improving component readability.
4. Added a **concrete verification checklist** with pre/post-migration steps to prevent false completion claims, including visual regression checks and bundle analysis.
5. Discovered that **d3 tree-shaking is relevant** -- the current `import * as d3 from 'd3'` imports the entire 70+ KB d3 library. This migration is an opportunity to narrow the import to `import { csvParse } from 'd3-dsv'` for the parse step, though the component still needs other d3 modules for charting.

### New Risks Discovered
- **Medium risk: `?raw` import during `nuxt generate`** -- Multiple Nuxt GitHub issues report that `?raw` works in Vite dev mode but can fail during Rollup-based static generation. While most reported failures involve server routes (not client-side components), this must be verified. See Step 3 Research Insights.
- **Low risk: Data parse outside `onMounted`** -- Moving `d3.csvParse()` to `<script setup>` top level means it executes during SSR. Since `csvParse` is a pure function with no DOM dependency, this is safe, but it means the parsed data is included in the SSR payload. For 618 bytes this is negligible.
- **Low risk: `_process/` directory drift** -- Both `data/straits.json` and `_process/straits.json` are identical today (verified), but there is no mechanism to keep them in sync. Future data updates could cause drift if an editor modifies one but not the other.

---

## Overview

Move all dataset files into a unified `data/` directory organized by infographic (e.g., `data/renewables/`, `data/straits/`), and replace the runtime `d3.csv()` fetch in `RenewableEnergyChart.vue` with a build-time import. This aligns the renewables data loading pattern with the straits pattern already established in the codebase (see brainstorm: `docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md`, "Data Consolidation" section).

### Research Insights

**SSG Data Loading Best Practice (from Nuxt 4 docs and performance research):**
- For statically generated Nuxt sites (`nitro: { preset: 'static' }`), build-time data loading is strongly preferred. The Nuxt 4 documentation states: "Static site generation pre-renders all pages at build time, generating static HTML files." Runtime fetches in SSG sites add unnecessary latency and create a network dependency that build-time imports eliminate entirely.
- The Vite build system inlines `?raw` imports and JSON imports directly into the JavaScript bundle, meaning the data is available synchronously without any HTTP request. This is the correct pattern for datasets that do not change between deployments.

**D3 Modular Import Opportunity (from d3 bundle analysis):**
- The project currently uses `import * as d3 from 'd3'`, which pulls in the full d3 library (~70+ KB). While this migration does not require changing d3 imports (the charting code needs multiple d3 modules), the switch from `d3.csv()` to `d3.csvParse()` is a good moment to note this as a future optimization. The `d3-dsv` module alone is only ~7 KB.

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

### Research Insights

**Codebase Verification (confirmed during deepening):**
- `public/dataset.csv` and `assets/dataset.csv` are byte-identical (verified via `diff`). Safe to delete the `assets/` copy.
- `data/straits.json` and `_process/straits.json` are byte-identical (verified via `diff`). The `_process/` copy is a data preparation artifact, not a runtime dependency.
- The only reference to `d3.csv('/dataset.csv')` in the entire codebase is at `components/RenewableEnergyChart.vue:140`. No other files import or reference `dataset.csv`.
- No existing imports of `~/data/straits.json` exist in any `.vue` or `.ts` file yet (the straits infographic component has not been committed). This means Step 5 is a no-op for now but important for forward-compatibility.

**Current Component Analysis (from `RenewableEnergyChart.vue`):**
- The component is a single-file Vue component using `<script setup lang="ts">` with the Composition API.
- Line 140: `const rawData = await d3.csv('/dataset.csv');` is inside an `async` `onMounted` callback.
- The `rawData` result is used immediately on the next lines: `rawData.columns.slice(1)` and `rawData.map(...)`. Both of these APIs are available on the `DSVRowArray<string>` type returned by both `d3.csv()` and `d3.csvParse()`.

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

### Research Insights

**Convention for Future Infographics (from architecture perspective):**
- This structure establishes a clear convention: each infographic gets a subdirectory under `data/` named by its slug. When the third infographic is added, the developer knows to create `data/<new-slug>/` and place dataset files there.
- Consider adding a `data/README.md` (optional, not required for this task) explaining the convention:
  - One subdirectory per infographic
  - Files are imported at build time, never fetched at runtime
  - The `_process/` directory is for data preparation artifacts, not canonical data

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

##### Research Insights

**`_process/` Directory Drift Risk:**
- Both `data/straits.json` and `_process/straits.json` are currently identical (verified). However, without a mechanism to keep them in sync, future data updates could cause drift.
- **Recommendation:** Add a brief comment to the top of `_process/straits.json` (if JSON5 or a README alongside it) noting: "This is a working copy for data preparation. The canonical version lives at `data/straits/straits.json`."
- Alternatively, the `_process/` directory's existing `data-methodology-for-client.md` already serves as a documentation file. A one-line note about the relationship could be appended there. This is not blocking for this task.

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

##### Research Insights

**Critical: `?raw` Compatibility with `nuxt generate` (from Nuxt GitHub issues research):**

Multiple Nuxt GitHub issues ([#23158](https://github.com/nuxt/nuxt/issues/23158), [#21487](https://github.com/nuxt/nuxt/issues/21487), [Discussion #19694](https://github.com/nuxt/nuxt/discussions/19694)) report that `?raw` imports can behave differently between `nuxt dev` (Vite) and `nuxt generate` (Rollup). Key findings:

- **Server routes** are the primary failure point -- `?raw` imports in `server/` directories fail during Nitro builds with ENOENT errors.
- **Client-side Vue components** (like `RenewableEnergyChart.vue`) use Vite's client bundler, which handles `?raw` natively. These are lower risk.
- The Vite documentation confirms `?raw` as a first-class feature: "Import assets as strings using the `?raw` suffix."

**Mandatory verification:** The implementer MUST run `npm run generate` after making the change and confirm zero errors. If the `?raw` import fails during `nuxt generate`, fall back to **Option A2** below.

**Option A2 (Fallback): Use `@rollup/plugin-dsv`**

If `?raw` proves problematic with `nuxt generate`, the `@rollup/plugin-dsv` plugin provides native CSV import support for both Vite and Rollup:

```bash
npm i -D @rollup/plugin-dsv
```

```typescript
// nuxt.config.ts
import dsv from '@rollup/plugin-dsv'

export default defineNuxtConfig({
  vite: {
    plugins: [dsv()]
  }
})
```

```typescript
// components/RenewableEnergyChart.vue
import rawData from '~/data/renewables/dataset.csv';
// rawData is already a parsed array of objects -- no d3.csvParse() needed
```

This approach adds one dev dependency but eliminates both the `?raw` suffix and the `d3.csvParse()` call. The trade-off: the imported type is `Array<Record<string, string>>`, not `DSVRowArray<string>`, so the `.columns` property would not be available. The downstream code at line 143 (`rawData.columns.slice(1)`) would need adjustment:

```typescript
// With @rollup/plugin-dsv, columns must be derived from the first row
const columns = Object.keys(rawData[0]).slice(1);
```

**Decision:** Try Option A first. Only switch to A2 if `nuxt generate` fails.

**Option A Implementation Detail -- Data Parse Location:**

With `?raw`, the CSV string is available at module scope. The `d3.csvParse()` call can be placed either:
1. **Inside `onMounted`** (as the plan currently shows) -- safe, familiar, minimal diff
2. **At `<script setup>` top level** -- since `csvParse` is a pure function with no DOM dependency, this is safe even during SSR. The advantage: the parsed data is available immediately, and the `onMounted` callback no longer needs the data loading step.

**Recommendation:** Place the parse at `<script setup>` top level for clarity, but either approach works. The implementer should choose based on comfort level. If placed at top level, the `onMounted` callback can drop the `async` keyword since it no longer awaits anything:

```typescript
import csvString from '~/data/renewables/dataset.csv?raw';
import * as d3 from 'd3';

// Parse at module scope -- pure function, SSR-safe
const rawData = d3.csvParse(csvString);

onMounted(() => {
  // Data is already available, proceed directly to chart rendering
  const columns = rawData.columns.slice(1);
  // ...
});
```

**TypeScript Module Declaration (expanded guidance):**

Nuxt's auto-generated types do NOT include `?raw` import declarations. A manual declaration is required. The Vite documentation shows that including `vite/client` in `tsconfig.json` provides types for `?raw`, but Nuxt manages its own `tsconfig` references. Two approaches:

1. **Preferred: Create `types/csv-raw.d.ts`**
   ```typescript
   declare module '*.csv?raw' {
     const content: string;
     export default content;
   }
   ```
   This is explicit, self-documenting, and scoped to CSV files.

2. **Alternative: Use the broader Vite pattern**
   ```typescript
   /// <reference types="vite/client" />
   ```
   Add to a `.d.ts` file. This brings in all Vite client types including `?raw`, `?url`, `?worker`, etc. This may conflict with Nuxt's auto-generated types. Test before committing.

**Recommendation:** Use approach 1 (explicit `types/csv-raw.d.ts`). It is more targeted and avoids potential type conflicts.

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

##### Research Insights

**Component Structure Best Practices (from Vue best practices skill):**
- The current `RenewableEnergyChart.vue` has its SFC sections in the order: `<template>`, `<style>`, `<script setup>`. The Vue/Nuxt convention is `<script>`, `<template>`, `<style>`. This is a pre-existing issue not introduced by this migration, but worth noting as a follow-up cleanup. Do NOT change the section order in this task -- keep the diff minimal.
- The component currently has a large `onMounted` callback (~350 lines) containing the entire D3 chart rendering logic. This is a known code quality issue (the Vue best practices skill recommends splitting components with more than one responsibility). Not relevant for this task, but important context: the `draw()` function and data transformation could eventually be extracted to a composable.

**Error Handling (new consideration):**
- The current `d3.csv('/dataset.csv')` has no error handling -- if the fetch fails, the `onMounted` callback throws silently.
- With `?raw` imports, the data is guaranteed to be available (it is baked into the bundle at build time). This is actually an improvement: the runtime fetch failure mode is eliminated entirely.
- However, `d3.csvParse()` could theoretically fail if the CSV is malformed. Since the CSV content is a static asset verified at build time, this is extremely unlikely. No try/catch is needed.

**`onMounted` Simplification Opportunity:**
- After this migration, the `onMounted` callback at line 136 is declared `async` solely to `await d3.csv(...)`. Once the await is removed, the `async` keyword can be dropped:
  ```typescript
  // BEFORE
  onMounted(async () => {
  // AFTER
  onMounted(() => {
  ```
- This is a minor cleanup but removes an unnecessary microtask queue entry. The implementer may choose to keep `async` if they prefer minimal diff.

#### Step 5: Update straits import path (if already referenced)

Any existing import of `~/data/straits.json` must be updated to `~/data/straits/straits.json`. Per the BF-3 scaffolding plan, the straits data is imported as:

```typescript
import straitsData from '~/data/straits.json';
// becomes:
import straitsData from '~/data/straits/straits.json';
```

This may not yet be in a committed component (the straits infographic build is in progress), but any existing references must be found and updated.

##### Research Insights

**Current State Verification (confirmed during deepening):**
- A codebase-wide search for `straits` in `.vue` and `.ts` files returned zero results. No component currently imports `~/data/straits.json`. This step is a no-op for now.
- The BF-3 scaffolding epic (`docs/epics/BF-3-phase-1-scaffolding.md:22`) documents the planned import as `import straitsData from '~/data/straits.json'`. Any future work on BF-3 that happens after this refactor will need to use `~/data/straits/straits.json` instead. The implementer should update the BF-3 epic document to reflect the new path, OR note it as a known upcoming change.

## Technical Considerations

### Vite `?raw` import and TypeScript

Vite supports `?raw` imports natively -- no plugin needed. However, TypeScript may need a module declaration for `.csv?raw` imports. Add to a `*.d.ts` file (or the existing `env.d.ts` if present):

```typescript
// types/csv-raw.d.ts
declare module '*.csv?raw' {
  const content: string;
  export default content;
}
```

Alternatively, if using Nuxt's auto-generated types, this may already be handled. Verify during implementation.

#### Research Insights

**Nuxt Type Generation and `?raw` (from research):**
- Nuxt generates its own `tsconfig` references in `.nuxt/tsconfig.app.json`, `.nuxt/tsconfig.server.json`, and `.nuxt/tsconfig.shared.json`. These do NOT include Vite's `?raw` type declarations by default.
- The project currently has NO `.d.ts` files anywhere in the codebase (verified via glob search). Creating `types/csv-raw.d.ts` will be the first custom type declaration file.
- Ensure the `types/` directory is included in the TypeScript compilation. Nuxt's generated `tsconfig.json` at project root references `.nuxt/tsconfig.*.json` files. The `types/` directory should be automatically picked up if it contains `.d.ts` files, but verify by running `npx nuxi typecheck` after creating the file.
- If `nuxi typecheck` does not pick up the new file, add an explicit `include` or `files` entry to `tsconfig.json`:
  ```json
  {
    "files": [],
    "include": ["types/**/*.d.ts"],
    "references": [...]
  }
  ```

### d3.csvParse vs d3.csv

- `d3.csv(url)` -- async, fetches from URL, returns `DSVRowArray<string>`
- `d3.csvParse(string)` -- sync, parses a string, returns `DSVRowArray<string>`

Both return the same type with a `.columns` property. The downstream code that accesses `rawData.columns` and iterates rows will work identically with either.

#### Research Insights

**Type Compatibility Details (from d3-dsv documentation):**
- `d3.csv()` returns `Promise<DSVRowArray<string>>` (from `d3-fetch` module)
- `d3.csvParse()` returns `DSVRowArray<string>` (from `d3-dsv` module)
- `DSVRowArray<string>` extends `Array<DSVRowString<string>>` and adds a `columns: string[]` property.
- The downstream code pattern at lines 143-156 of `RenewableEnergyChart.vue` uses:
  - `rawData.columns.slice(1)` -- accesses the `.columns` property (available on `DSVRowArray`)
  - `rawData.map(d => {...})` -- iterates rows as objects with string keys (compatible)
  - `+d.Year!` and `+d[col]!` -- accesses named properties and converts to number (compatible)
- **Conclusion:** The switch is fully type-compatible. No downstream code changes needed.

### SSG behavior

With `nitro: { preset: 'static' }`, the site is pre-rendered. Using `?raw` imports means the CSV content is inlined into the JavaScript bundle at build time. For the renewables dataset (~618 bytes), this is negligible. For the straits JSON (~16KB), it is already bundled this way.

#### Research Insights

**Bundle Size Impact Analysis:**
- The renewables CSV is 618 bytes raw. After Vite's minification and gzip compression in the JavaScript bundle, the actual impact is likely 300-400 bytes -- negligible.
- The straits JSON is 16,720 bytes (~16 KB). It is already inlined via `import straitsData from '~/data/straits.json'`. Moving it to `data/straits/straits.json` does not change the bundle size.
- **Total bundle impact of this migration:** Net zero. The CSV data was previously loaded as an HTTP response body (618 bytes over the network). Now it is inlined in the JavaScript bundle (618 bytes in the bundle). The bytes are the same; only the delivery mechanism changes (bundle vs. fetch).
- For future infographics with larger datasets (100+ KB), consider keeping the data as a separate fetched asset rather than inlining. The `data/` convention should not be interpreted as "always inline" -- it means "canonical location." The loading strategy (inline vs. fetch) is a separate decision per dataset.

**SSR Payload Consideration:**
- If `d3.csvParse()` is called at `<script setup>` top level (not inside `onMounted`), the parsed data array will be serialized into the SSR payload. For 10 rows of renewable energy data, this adds approximately 1-2 KB to the HTML response. This is acceptable.
- If this becomes a concern for larger datasets, wrap the parse in `onMounted` or use `import.meta.client` to restrict it to client-side execution.

### No public/ serving needed for dataset.csv

After moving `dataset.csv` out of `public/`, the file will no longer be served at `/dataset.csv`. This is intentional -- the data is now bundled. If any external consumer relied on that URL (unlikely for an infographic site), it would break. No evidence of external consumers exists.

#### Research Insights

**Netlify Deployment Verification:**
- The `netlify.toml` has a catch-all redirect `/* -> /index.html` with status 200. This means even after `dataset.csv` is removed from `public/`, a request to `/dataset.csv` would return the `index.html` content (status 200) rather than a 404. This is misleading but not harmful -- no external consumer is known to access this URL.
- The `public/` directory will still contain `styles.css` and `assets/` after this migration. The `public/` directory is NOT emptied.

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

### Research-Enhanced Acceptance Criteria

- [ ] `types/csv-raw.d.ts` exists with the `*.csv?raw` module declaration
- [ ] No runtime network request for `dataset.csv` (verify via browser Network tab: filter for `dataset` -- should show zero requests)
- [ ] The `data/` directory has exactly two subdirectories: `renewables/` and `straits/`
- [ ] `npm run generate` completes with exit code 0 and `.output/public/index.html` contains the chart markup
- [ ] Browser DevTools console shows zero errors and zero warnings related to data loading
- [ ] If `?raw` fails during `nuxt generate`, the fallback to Option A2 (`@rollup/plugin-dsv`) is implemented and verified

## Verification Checklist

Before claiming this task is complete, the implementer MUST execute and verify each of the following:

### Pre-Migration Baseline
- [ ] Run `npm run dev` and confirm the renewables chart renders at `http://localhost:3000/`
- [ ] Open browser Network tab, filter for `dataset` -- confirm a fetch to `/dataset.csv` occurs
- [ ] Run `npm run generate` and confirm it succeeds (baseline)

### Post-Migration Verification
- [ ] Run `npm run dev` and confirm the chart renders identically
- [ ] Open browser Network tab, filter for `dataset` -- confirm NO fetch to `/dataset.csv` occurs
- [ ] Browser DevTools console shows zero errors related to CSV import or parsing
- [ ] Run `npm run generate` and confirm exit code 0
- [ ] Inspect `.output/public/` -- confirm `dataset.csv` does NOT exist (it should no longer be a static asset)
- [ ] The chart data is correct: verify at least one data point visually (e.g., European Union 2024 = 47.5%)
- [ ] TypeScript: run `npx nuxi typecheck` (if available) or confirm no red squiggles on the `import csvString from ...?raw` line in the editor

### Regression Check
- [ ] The straits JSON data is still importable at `~/data/straits/straits.json` (verify with a temporary import in any component, or wait for BF-3 to validate)
- [ ] No other files in the codebase reference the old paths (`public/dataset.csv`, `assets/dataset.csv`, `data/straits.json` at root)

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

### Research-Discovered Risks

- **Medium risk: `?raw` import during `nuxt generate`** -- Multiple Nuxt GitHub issues ([#23158](https://github.com/nuxt/nuxt/issues/23158), [#21487](https://github.com/nuxt/nuxt/issues/21487), [Discussion #19694](https://github.com/nuxt/nuxt/discussions/19694)) report that `?raw` imports can behave differently between Vite dev mode and Rollup static generation. Most failures involve server routes, not client-side components, but this must be verified. **Mitigation:** Run `npm run generate` immediately after implementing the `?raw` import. If it fails, switch to Option A2 (`@rollup/plugin-dsv`) or Option B (CSV-to-JSON conversion). See Step 3 Research Insights for full details.

- **Low risk: `_process/` directory data drift** -- `data/straits.json` and `_process/straits.json` are byte-identical today but have no sync mechanism. Future edits to one without the other will cause silent divergence. **Mitigation:** Add a note in `_process/data-methodology-for-client.md` indicating the canonical data location is `data/straits/`.

- **Low risk: SSR payload bloat for large datasets** -- If the `csvParse()` call is moved to `<script setup>` top level, the parsed data is included in the SSR payload. For 618 bytes this is negligible, but this pattern should not be blindly applied to future datasets exceeding 50 KB. **Mitigation:** Document the threshold recommendation in the `data/` convention.

- **Low risk: BF-3 epic references old path** -- The BF-3 scaffolding epic at `docs/epics/BF-3-phase-1-scaffolding.md:22` documents `import straitsData from '~/data/straits.json'`. After this migration, the correct path is `~/data/straits/straits.json`. **Mitigation:** Update the BF-3 epic document to reflect the new path, or add a note that the path changed due to BF-73.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md](docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md) -- Key decision carried forward: "Consolidate all datasets into `data/` with per-infographic organization... switching from runtime `d3.csv('/dataset.csv')` fetch to a build-time import, matching the pattern already used by the straits data."

### Internal References

- Existing straits data pattern: `data/straits.json` (build-time JSON import)
- BF-3 scaffolding epic: `docs/epics/BF-3-phase-1-scaffolding.md:22` -- documents the `import straitsData from '~/data/straits.json'` convention
- Runtime fetch to replace: `components/RenewableEnergyChart.vue:140` -- `await d3.csv('/dataset.csv')`
- Routing plan (dependency): `docs/plans/2026-03-03-feat-introduce-nuxt-file-based-routing-plan.md`
- Completed routing migration: BF-68 (status: completed) -- verified during deepening

### External References

- Vite static asset handling (`?raw`): https://vitejs.dev/guide/assets.html#importing-asset-as-string
- d3.csvParse API: https://d3js.org/d3-dsv#csvParse
- d3 bundle size analysis: https://bundlephobia.com/package/d3

### Research References (added during deepening)

- [Vite Features -- Static Asset Handling](https://vite.dev/guide/features) -- Confirms `?raw` as a first-class import feature
- [Nuxt 4 Static Hosting / Deployment](https://nuxt.com/docs/4.x/getting-started/deployment) -- SSG pre-rendering behavior
- [Nuxt GitHub Discussion #19694 -- ?raw imports supported?](https://github.com/nuxt/nuxt/discussions/19694) -- Known type definition gap
- [Nuxt GitHub Issue #23158 -- ENOENT with raw imports](https://github.com/nuxt/nuxt/issues/23158) -- Raw import failures in Nitro server builds
- [Nuxt GitHub Issue #21487 -- ?raw in server routes](https://github.com/nuxt/nuxt/issues/21487) -- Server-side ?raw failures
- [Vite GitHub Discussion #8271 -- CSV imports](https://github.com/vitejs/vite/discussions/8271) -- Community approaches to CSV import
- [@rollup/plugin-dsv](https://www.npmjs.com/package/@rollup/plugin-dsv) -- Rollup/Vite plugin for DSV file imports
- [Nuxt 4 Performance Optimization Guide](https://masteringnuxt.com/blog/nuxt-4-performance-optimization-complete-guide-to-faster-apps-in-2026) -- SSG best practices
- [d3-dsv NPM package](https://www.npmjs.com/package/d3-dsv) -- Standalone DSV parser module
