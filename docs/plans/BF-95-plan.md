# BF-95 — Content pass: revised country prose, new intro, no-Oxford-comma sweep

## Approach

1. Save the pre-extracted "Input Short Texts" tab as `_data/sources/marshall-infographic-copy-2026-07-17.md`
   (same pattern as the 2026-06-30 file), with provenance + a diff-against-June-30 note.
2. Diffed the new doc against the current `data/asean/country-profiles.ts` prose paragraph by
   paragraph for all 11 countries. Finding: the underlying Marshall prose is materially unchanged
   from the June 30 doc (same facts/numbers in all 11 profiles) — this is a re-export, not a rewrite.
   So the "diff and update" step resolves to three deliberate, ticket-specified deviations rather than
   a wholesale rewrite:
   - **Indonesia**: nickel figure 62% (2024) → **66.7% (2025, USGS MCS2026)**, overriding the doc
     (most-recent-data-wins per the brief).
   - **Philippines**: the new doc still opens with "Despite its relatively small size…" — confirmed
     the in-repo prose already dropped "small," but tightened both Description and Critical Minerals
     paragraphs to drop the residual "Despite its size" framing entirely (client correction: PH is
     mid-sized, not small).
   - **Laos**: the Key Facts "(2016) 75%" total-trade/GDP figure currently lives only in a
     mismatched `sources.description` footnote (attached to the Description tab, which never
     mentions it) — not in any visible prose. Fix: fold the figure into the **Trade** paragraph
     itself with the 2016 caveat inline, and drop the stray footnote from `sources.description`.
3. New idle-intro copy replaces the four text nodes in `AseanInfographic.vue`'s
   `.asean-infographic__intro` block (h1 title / h1 title-sub / subtitle `<p>` / blurb `<p>`) —
   reusing the existing DOM structure and CSS classes, no new markup/components.
4. Oxford-comma sweep: grepped `data/asean/*.ts`, `components/infographics/AseanInfographic.vue`,
   and `components/asean/*.vue` for serial-list commas before "and". The only genuine 3+-item
   Oxford commas found were in the current `AseanInfographic.vue` idle intro (being replaced in
   step 3 anyway). Everything else that matched `, and ` in country-profiles.ts is a
   comma-before-conjunction joining two independent/parenthetical clauses (not a list) — correct
   as-is, left untouched. `RenewablesInfographic.vue` has one Oxford comma but is a different
   infographic (out of scope per the ticket, which scopes to ASEAN-facing copy only).

## Files

- `_data/sources/marshall-infographic-copy-2026-07-17.md` (new)
- `data/asean/country-profiles.ts` (Indonesia, Philippines, Laos paragraphs + sources)
- `components/infographics/AseanInfographic.vue` (idle intro block only)

## Test strategy

- `grep -n ", and " data/asean/country-profiles.ts components/infographics/AseanInfographic.vue`
  to confirm no serial Oxford commas remain in the touched copy.
- `npm run dev` (or `generate`), visually check idle intro renders new copy, and open Indonesia /
  Philippines / Laos panels to confirm updated text.
- `git diff dev...HEAD` self-review for mangled strings / TS syntax.

## Risks

- Apostrophe/quote escaping in TS single-quoted strings (existing file uses curly `'` inside
  double-quoted... actually single-quoted strings with `’` typographic apostrophes — must match
  existing convention, not straight `'`, to avoid breaking the string literal).
- Low risk otherwise — pure content, no logic/component changes.
