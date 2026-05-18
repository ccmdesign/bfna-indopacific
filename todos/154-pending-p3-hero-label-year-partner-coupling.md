---
severity: P3
status: resolved
autofix_class: advisory
owner: human
requires_verification: false
pre_existing: false
file: scripts/build-asean-country-hero.mjs
line: 76 (HERO_LABEL), 160 (fail message)
reviewer: ce-maintainability-reviewer (BF-57 code review, autofix mode)
created: 2026-05-18
ticket: BF-57
run_id: 20260518-160934-1a69f40b
---

# Hero label hardcodes year+partner separately from HERO_YEAR / HERO_PARTNER

## Finding

`scripts/build-asean-country-hero.mjs` parameterises the partner and year as
named constants:

- `const HERO_PARTNER = 'CHN'` (line 36)
- `const HERO_YEAR = 2024` (line 39)

but the emitted label is a fully hardcoded string literal:

- `const HERO_LABEL = 'Two-way trade with China, 2024'` (line 76)

and the per-slug fail message also hardcodes the year text:

- `` `no 2024 ${HERO_PARTNER} ${METRIC} rows aggregated for slug "${slug}"` ``
  (line ~160) — interpolates `HERO_PARTNER` but the `2024` is a literal.

The generator's own header comment advertises that adding an alternate
partner/year is "a one-line change here." It is not: changing `HERO_YEAR`
to `2025` or `HERO_PARTNER` to `'USA'` would silently emit a label that
still reads "Two-way trade with China, 2024", and a fail message whose year
text no longer matches the filter. The figure would be correct; the label
and diagnostic would lie.

## Impact

P3 / advisory. Not a current defect — with `HERO_PARTNER='CHN'` and
`HERO_YEAR=2024` every emitted string is correct and `npm run build`
passes. This is a latent maintainability trap that only bites a future
edit. No data-integrity impact on the current PR.

## Why this is a todo and not an autofix

Per the BF-57 plan, the generator's scope was deliberately frozen to mirror
the BF-56 `build-asean-trade-stacked.mjs` pattern (D6/U2). Templating the
label (e.g. deriving it from a partner-display-name map + `HERO_YEAR`)
changes the generator's shape beyond the mandated BF-56 mirror and is a
behaviour-shaping edit the autonomous autofix pass intentionally does not
make. It does not touch the deferred `topExports`/`topImports` arrays or
any paragraph wording. Surface for human decision.

## Suggested fix (deferred)

When/if a partner or year alternate is actually wired (currently out of
scope, see plan Scope Boundaries), derive the label and the fail-message
year from `HERO_YEAR` / a `PARTNER_DISPLAY[HERO_PARTNER]` map instead of
hardcoding `'Two-way trade with China, 2024'` and the literal `2024` in the
fail string. No action needed until that alternate is requested.

## Resolution (BF-57)

Applied the suggested fix:

- Added a `PARTNER_DISPLAY` map (`{ CHN: 'China' }`) and derived
  `HERO_LABEL` as `` `Two-way trade with ${PARTNER_DISPLAY[HERO_PARTNER]}, ${HERO_YEAR}` ``.
- Replaced the literal `2024` in the per-slug fail message with `${HERO_YEAR}`.
- Added a loud guard that fails if `HERO_PARTNER` has no `PARTNER_DISPLAY`
  entry (prevents a "Two-way trade with undefined, ..." label on a future
  partner change).

Generated output `data/asean/country-hero.generated.ts` is byte-identical
for the current values (HERO_YEAR=2024, partner=CHN → label still reads
exactly `Two-way trade with China, 2024`); `git diff --quiet` confirms no
change and `npm run build` passes.
