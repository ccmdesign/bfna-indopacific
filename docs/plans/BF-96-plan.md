# BF-96 — Key Facts block on Description tab + remove China-trade hero

## Approach

1. **Data**: extend `CountryProfile` in `data/asean/country-profiles.ts` with a
   `keyFacts` field: `{ indicators: KeyFactRow[]; agreements: KeyFactRow[] }`
   where `KeyFactRow = { label: string; value: string }`. 4 indicator rows +
   3 agreement rows per country (7 total), sourced from the Feedback 2 table
   in the ticket. Remove the `hero` field entirely, drop the
   `import { COUNTRY_HERO } from './country-hero.generated'`, and update the
   file's provenance doc-comment block.
2. **Delete dead files**: `data/asean/country-hero.generated.ts`,
   `scripts/build-asean-country-hero.mjs`, and the `gen:country-hero` npm
   script — no consumers remain once `hero` is gone.
3. **Remove hero rendering** from `components/infographics/AseanInfographic.vue`:
   the `useScramble` wiring (`heroValue`/`playHero`/`setHero`, the
   `activeSlug` watcher that scrambles it) and the
   `.asean-infographic__title-hero` block + its CSS. `composables/useScramble.ts`
   itself is left in place (generic, reusable rAF utility, not hero-specific)
   even though this leaves it with zero current callers — flagged as a
   judgment call in the PR rather than deleted, since it's outside the
   ticket's explicit dead-code scope.
4. **Delete orphaned dependent component**: `components/asean/CountryNarrativeCard.vue`
   reads `profile.hero.value`/`.label` but has zero consumers anywhere in the
   repo (confirmed via grep — no `<CountryNarrativeCard`, no import). It would
   fail typecheck once `hero` is removed from `CountryProfile`. Since it's
   already dead, delete rather than fix.
5. **New component** `components/infographics/CountryKeyFacts.vue`: renders
   the 7 rows (4 indicators, then 3 agreements) plus a footnote line, styled
   to match the sidebar's existing Encode Sans / translucent-white system
   (`StraitQualPanel.vue`'s `.plane-facts` list is a styling reference only,
   not reused directly — different visual context, dark map sidebar vs. glass
   plane). Props: `keyFacts: CountryKeyFacts`. Mounted inside
   `AseanInfographic.vue`'s Description tabpanel, below the existing prose
   `<Transition>` block.
6. **Footnote**: one line under the block — "GDP growth (2026): IMF WEO. GDP
   per capita PPP, trade-to-GDP and FDI net inflows (2024): World Bank." —
   mirrors the `.asean-infographic__source` treatment used elsewhere.

## Files touched

- `data/asean/country-profiles.ts` (extend interface + all 11 profiles, drop `hero`)
- `data/asean/country-hero.generated.ts` (delete)
- `scripts/build-asean-country-hero.mjs` (delete)
- `package.json` (drop `gen:country-hero` script)
- `components/infographics/AseanInfographic.vue` (remove hero markup/script/css, mount `CountryKeyFacts`)
- `components/infographics/CountryKeyFacts.vue` (new)
- `components/asean/CountryNarrativeCard.vue` (delete — orphaned, hero-dependent)

## keyFacts type shape

```ts
export interface KeyFactRow {
  label: string
  value: string
}

export interface CountryKeyFacts {
  indicators: KeyFactRow[]
  agreements: KeyFactRow[]
}
```

## Unit-normalization judgment calls (flagged for PR body)

- **Myanmar FDI**: source gives "1,095.32 million" → normalized to **$1.10B**
  for scale-consistency with the other >$1B figures (Thailand $14.3B, Cambodia
  $4.39B, etc.). Brunei ($29.06M), Laos ($988.46M) and Timor-Leste ($225.47M)
  stay in millions since they're sub-$1B.
- **Malaysia FDI** ($15.59B) and **Laos trade-to-GDP** (75%) carry an off-year
  parenthetical — (2022) and (2016) respectively — per the source table,
  since the standard indicator year (2024) wasn't available for those two.
- **Myanmar trade-to-GDP**: source says "not available" — rendered as the
  literal string "Not available" rather than omitting the row (keeps all 11
  countries at 7 rows per the acceptance criteria).
- **Myanmar / Timor-Leste trade agreements**: "EU — Everything But Arms only"
  read as an override of the EU baseline row (not an addition to it) — the
  word "only" is explicit. US TIFA is kept but annotated "suspended"
  (Myanmar) / "not yet signed" (Timor-Leste) rather than dropped, since TIFA
  is still the named US instrument in both cases.

## Risks

- 11 countries × 7 rows is a lot of hand-transcribed data — self-review
  (STEP 3) will cross-check every value against the ticket table.
- Removing `hero` is a breaking type change for `CountryProfile` — must catch
  every consumer (confirmed: `AseanInfographic.vue` +
  `CountryNarrativeCard.vue`, the latter deleted).
- No automated tests in this repo beyond a stray `browser-test-bf67.spec.ts`
  (unrelated) — verification is manual browser testing (STEP 6) + `nuxt build`
  or a TS check for compile safety.
