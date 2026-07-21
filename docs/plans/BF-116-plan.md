# BF-116 — ASEAN copy: client tagline verbatim + strip flagged commas

## Goal

Two independent copy changes from Claudio's red notes on BF-113. Data + template only, no logic.

1. **Restore** the comma before `and` in the opening tagline so it matches the client's
   supplied line character for character.
2. **Remove** the comma before `and` in five country paragraphs, rewording where a bare
   deletion would read badly.

These pull in opposite directions. They are done as separate, explicit edits — never a sweep.

## Files

- `components/infographics/AseanInfographic.vue` (L208) — tagline.
- `data/asean/country-profiles.ts` — Thailand (~L141), Vietnam (~L292), Philippines (~L337),
  Laos (~L480), Myanmar (~L529).

## Approach

### Part 1 — tagline

Target, verbatim from the client:

> Trade, Power, and Critical Mineral Supply Chains in an Era of Great Power Competition

Single occurrence in the repo (grep confirms only `AseanInfographic.vue:208`), so both
`/infographics/asean` and `/embed/asean` pick it up from the same component.

Also audited alongside it, per the brief: `ASEAN`, `The Strategic Pivot of the Indo-Pacific`
and the `Select a country…` blurb. No client variant was supplied for those in the brief and
they match what is on file, so they are left untouched — the standing "no Oxford comma" rule
applies to them.

### Part 2 — the five paragraphs

These are clause-joining commas, not serial ones. Deleting the comma alone leaves a run-on
or a dangling appositive, so each is reworded to the smallest edit that reads correctly:

| Country | Fix |
| --- | --- |
| Thailand | `growing …, and serves as` → `growing … and serving as` (parallel participles) |
| Vietnam | appositive `, sixth globally,` → em-dash pair, so no comma precedes `and` |
| Philippines | fold the services-sector clause into the verb phrase, drop the appositive commas |
| Laos | replace `, and` with `while` (subordinate clause, one sentence) |
| Myanmar | split the two independent clauses into two sentences |

Singapore (~L190), Vietnam's trade paragraph (~L290) and Cambodia (~L434) carry the same
construction but were not flagged. Left alone per the brief.

## Test strategy

- `git diff dev...HEAD` reviewed line by line; confirm the tagline comma is **added** and the
  five paragraph commas are **removed** in the same diff.
- `grep -n ", and " data/asean/country-profiles.ts` — expect exactly the three unflagged hits
  to remain (Singapore, Vietnam trade, Cambodia).
- Browser: dev server on 3100, read rendered text on `/infographics/asean` and `/embed/asean`;
  open the five country panels and read the paragraphs.
- `npm run build` / typecheck via CI.

## Risks

- **Sweep undoing part 1.** Mitigated: two separate edits in two separate files, verified in the
  final diff.
- **Rewording drifting from the client's meaning.** Mitigated: every before/after is quoted in
  the PR body for Aline to check.
- Nothing here touches logic, so no regression surface beyond text rendering/overflow.
