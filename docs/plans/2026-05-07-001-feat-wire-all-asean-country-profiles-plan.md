---
title: "feat: Wire all ASEAN countries with click-to-open profiles"
type: feat
status: active
date: 2026-05-07
---

# feat: Wire all ASEAN countries with click-to-open profiles

## Summary

Promote the four stretch-tier countries (Philippines, Brunei, Cambodia, Laos) to full-profile parity with the five inScope countries by adding placeholder `CountryProfile` entries and map labels. After this change, all 9 interactive ASEAN countries open a complete profile panel (big metrics, share bars, radar chart, caption) on click -- no more "limited V1 data" fallback message.

---

## Problem Frame

The ASEAN map currently has two tiers of interactive country: inScope (5 countries with full `CountryProfile` data and working panel flow) and stretch (4 countries that are clickable but show a fallback "limited V1 data" subhead with no metrics, share bars, or radar chart). The stretch countries also lack text labels on the map, making them harder to identify visually. The result is an inconsistent experience where clicking a highlighted country sometimes produces a rich panel and sometimes an empty stub.

---

## Requirements

- R1. All 4 stretch countries (Philippines, Brunei, Cambodia, Laos) have `CountryProfile` entries in `placeholder-data.ts` that match the exact `CountryProfile` interface shape used by the 5 inScope countries
- R2. Each stretch country's `shares[]` entries sum to 100 across `{us, cn, eu, other}` for every row (Trade, FDI inflow, Defense partners)
- R3. Each stretch country's `radar.layers` has exactly 2 layers with 5 values each, all in the 0..1 range, using the canonical `RADAR_AXES`
- R4. Stretch countries render text labels on the map, following the same `<text>` pattern used by inScope countries
- R5. Map labels for small countries (Brunei, Singapore) do not overlap with neighboring labels
- R6. Clicking any of the 9 interactive countries opens a full `CountryPanel` with big metrics, share bars, radar chart, and caption -- no fallback message
- R7. Escape key closes the panel regardless of which country is active
- R8. No changes to straits or renewables infographic files

---

## Scope Boundaries

- The 4 new profiles use placeholder data (thesis-neutral stubs), not real research numbers -- real data wires in May 2026
- Myanmar and Timor-Leste remain inert (no interaction, no profile)
- Context-tier countries (India, China, Australia) remain ghost fills
- The `country-tiers.ts` tier assignments stay unchanged -- stretch countries keep their `'stretch'` tier value; the change is purely additive data + labels
- No modifications to `AseanLayerToggle.vue`, `CountryRadar.vue`, `CountryShareBar.vue`, or `CountryPanel.vue` -- the existing components already handle rendering when profile data is present

### Deferred to Follow-Up Work

- Responsive/mobile layout adjustments for the panel: separate ticket
- Real data integration from `_process/asean/data-wrangled/*.csv`: blocked on May 2026 data drop

---

## Context & Research

### Relevant Code and Patterns

- `data/asean/placeholder-data.ts`: Contains the `CountryProfile` interface, `RADAR_AXES` constant, the `PROFILES` record (currently 5 entries), and the `profileBySlug()` lookup function. New entries go into the `PROFILES` record keyed by slug
- `data/asean/country-tiers.ts`: Defines `COUNTRIES` with `CountryDescriptor` entries for all 11 countries including the 4 stretch. Exports `STRETCH_SLUGS` array. No changes needed here
- `components/asean/AseanMap.vue`: Renders countries grouped by tier. The inScope group (lines 208-267) includes `<text>` labels at each feature's centroid. The stretch group (lines 169-206) has no `<text>` labels -- this is where labels need to be added
- `components/asean/CountryPanel.vue`: The `v-if="profile"` guard at line 34 controls whether the full panel renders or the fallback "limited V1 data" message shows. Once profiles exist in `PROFILES` for the stretch slugs, `profileBySlug()` returns data and the panel renders fully -- no component changes needed
- `components/infographics/AseanInfographic.vue`: Orchestrates map + panel. The `profile` computed (line 13) calls `profileBySlug(activeSlug)`. Already handles any slug -- no changes needed
- `data/asean/countries.geo.json`: All 4 stretch countries present with computed centroids available via `pathGen.centroid()`

### Existing Label Pattern (inScope)

The inScope label block in `AseanMap.vue` (lines 254-266) uses:
- `<text>` element positioned at `f.centroid[0]`, `f.centroid[1]`
- Dynamic fill, font-size, and font-weight based on active state
- `text-anchor="middle"`, `dominant-baseline="middle"`
- `pointer-events="none"` and `class="asean-map__label"`

The stretch labels should follow this same pattern exactly.

---

## Key Technical Decisions

- **Add profiles to `PROFILES` record, not a separate stretch data structure**: The `profileBySlug()` lookup is a simple key lookup on `PROFILES`. Adding entries there is the zero-change path -- `CountryPanel`, `AseanInfographic`, and all subcomponents work without modification
- **Use the same placeholder data shape as inScope**: Each stretch profile gets 3 share rows (Trade, FDI inflow, Defense partners), 2 radar layers (2020, 2025), and the same caption/subhead structure. This ensures the rendering path is identical
- **Labels use centroid positioning with manual offsets only for Brunei**: The GeoJSON centroid works well for Philippines, Cambodia, and Laos (they have enough landmass). Brunei is tiny and sits adjacent to Malaysia -- its label needs a small dy offset to avoid overlap. Singapore already has an inScope label that renders at its centroid; no new label needed there
- **Stretch label styling matches inScope exactly**: Same `<text>` pattern, same CSS class, same font/color/size transitions. No visual distinction between the two tiers in the rendered map

---

## Open Questions

### Resolved During Planning

- **Should stretch countries keep their `tier: 'stretch'` in `country-tiers.ts`?**: Yes. The tier field is a metadata classification, not a rendering gate. The panel rendering is gated by whether `profileBySlug()` returns data, and the map click handler in `onSelect()` already permits both `inScope` and `stretch` tiers. Changing tier assignments is out of scope
- **Do existing components need modification to render stretch profiles?**: No. `CountryPanel.vue` uses a `v-if="profile"` guard. When `profileBySlug()` returns a `CountryProfile`, the full panel renders. The radar, share bars, and metrics all take their data from the profile object -- no tier-specific branching exists in those components

### Deferred to Implementation

- **Exact Brunei label offset values**: The dy offset to prevent overlap with Malaysia's coastline depends on the projected centroid position. The implementer should visually verify after adding the label and adjust the offset as needed

---

## Implementation Units

- U1. **Add placeholder profiles for 4 stretch countries**

**Goal:** Add `CountryProfile` entries for Philippines, Brunei, Cambodia, and Laos to the `PROFILES` record so that `profileBySlug()` returns data for all 9 interactive countries.

**Requirements:** R1, R2, R3, R6

**Dependencies:** None

**Files:**
- Modify: `data/asean/placeholder-data.ts`

**Approach:**
- Add 4 new entries to the `PROFILES` object, keyed by slug (`philippines`, `brunei`, `cambodia`, `laos`)
- Each entry follows the exact shape of the existing Indonesia/Thailand/etc. entries: `slug`, `subhead`, `bigMetric`, `bigSecondary`, `shares[]` (3 rows), `radar` (5 axes, 2 layers), `caption`
- Use thesis-neutral placeholder values: approximate trade figures that are directionally reasonable but clearly marked as placeholders via the subhead text
- Every `shares` row must sum to exactly 100 across `us + cn + eu + other`
- Every radar value must be in the 0..1 range
- Use the existing `RADAR_AXES` constant (already imported by radar chart)

**Patterns to follow:**
- The 5 existing profiles in `data/asean/placeholder-data.ts` -- mirror the exact data shape, subhead text pattern ("Placeholder profile. Real data wires May 2026."), and caption pattern

**Test scenarios:**
- Happy path: `profileBySlug('philippines')` returns a valid `CountryProfile` object with all required fields
- Happy path: `profileBySlug('brunei')` returns a valid `CountryProfile` object
- Happy path: `profileBySlug('cambodia')` returns a valid `CountryProfile` object
- Happy path: `profileBySlug('laos')` returns a valid `CountryProfile` object
- Edge case: Each new profile's `shares` rows sum to exactly 100 (us + cn + eu + other === 100 for every row)
- Edge case: Each new profile's `radar.layers` has exactly 2 entries, each with exactly 5 values, all between 0 and 1 inclusive
- Edge case: Each new profile's `radar.axes` references `RADAR_AXES` (5 axes)
- Integration: After adding profiles, the `PROFILES` record contains exactly 9 entries total (5 existing + 4 new)

**Verification:**
- `profileBySlug(slug)` returns a defined `CountryProfile` for all 4 stretch slugs
- TypeScript compilation passes with no errors on the modified file
- All share rows sum to 100; all radar values are in [0, 1]

---

- U2. **Add map labels for stretch-tier countries**

**Goal:** Render text labels on the map for Philippines, Brunei, Cambodia, and Laos so users can identify them before clicking.

**Requirements:** R4, R5

**Dependencies:** None (independent of U1 -- labels render regardless of profile data)

**Files:**
- Modify: `components/asean/AseanMap.vue`

**Approach:**
- Add a `<text>` element inside the existing stretch country `<g>` loop (the `v-for="f in groupedByTier.stretch"` block, lines 173-206)
- Place the `<text>` after the `<path>` element, mirroring the inScope label pattern exactly
- Use `f.centroid[0]` / `f.centroid[1]` for position, with dynamic fill/font-size/font-weight based on `activeSlug` matching, and `class="asean-map__label"`
- For Brunei specifically: add a small `dy` offset (e.g., `dy="-12"` or similar) to push the label above the tiny country polygon and away from Malaysia's label. The exact value should be tuned visually
- The existing `.asean-map__label` CSS class already handles font-family, letter-spacing, text-transform, text-shadow, and transitions -- no new CSS needed
- Singapore already has a label in the inScope group; verify it does not collide with Brunei's new label
- Update the stretch `<g>` element's `aria-label` from `"${name} (limited V1 data)"` to `"${name}, click to view profile"` to match the inScope pattern, since profiles now exist for all stretch countries

**Patterns to follow:**
- The inScope `<text>` label block at lines 254-266 of `components/asean/AseanMap.vue`

**Test scenarios:**
- Happy path: All 4 stretch countries render visible text labels on the map
- Happy path: Labels use uppercase text, Encode Sans font, and white/alpha fill matching inScope labels
- Edge case: Brunei label does not overlap with Malaysia or Singapore labels at default viewport size
- Edge case: Labels respond to active state (brighter fill, larger font-size when the country is selected)
- Happy path: Labels have `pointer-events="none"` so they do not interfere with click targets on the country paths
- Happy path: Stretch country `<g>` elements have `aria-label` matching inScope pattern ("click to view profile") instead of "(limited V1 data)"

**Verification:**
- Visual inspection confirms all 9 interactive countries have visible text labels
- No label overlap at the default 1280x720 viewBox
- Labels animate on selection (fill, font-size, font-weight transitions)

---

## System-Wide Impact

- **Interaction graph:** No new interactions introduced. The existing flow is: `AseanMap` emits `select` -> `AseanInfographic` sets `activeSlug` -> `profileBySlug()` resolves the profile -> `CountryPanel` renders with profile data. This flow already works for stretch slugs; the missing piece was the profile data itself
- **Error propagation:** `profileBySlug()` returns `undefined` for unknown slugs, which triggers the fallback message in `CountryPanel`. After this change, the 4 stretch slugs return defined profiles, so the fallback path is only hit for slugs not in `PROFILES` (which are not clickable anyway)
- **State lifecycle risks:** None. The profiles are static compile-time data. No async loading, no caching, no partial states
- **Unchanged invariants:** The `CountryTier` type system, the `COUNTRIES` record in `country-tiers.ts`, the `onSelect()` click handler, and the `CountryPanel`/`CountryRadar`/`CountryShareBar` component interfaces are all unchanged. The tier assignments remain `'stretch'` for all 4 countries

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Brunei label overlaps with Malaysia or Singapore at certain viewport sizes | Use a manual `dy` offset on Brunei's `<text>` element; visually verify at 1280x720 viewBox and common embed widths |
| Placeholder share values accidentally don't sum to 100 | Verify arithmetic for every `shares` row during implementation; add a comment noting the constraint |
| Stretch countries' aria-label still says "limited V1 data" after profiles exist | Addressed in U2: update the aria-label to match inScope pattern |

---

## Sources & References

- Related code: `data/asean/placeholder-data.ts`, `data/asean/country-tiers.ts`, `components/asean/AseanMap.vue`, `components/asean/CountryPanel.vue`, `components/infographics/AseanInfographic.vue`
