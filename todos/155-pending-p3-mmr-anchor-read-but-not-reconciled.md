---
severity: P3
status: resolved
autofix_class: advisory
owner: human
requires_verification: false
pre_existing: false
file: scripts/build-asean-minerals.mjs
line: 189 (ANCHOR_MMR_RARE_EARTHS), 437 (myanmarRareEarthsSharePct from mmrContext)
reviewer: ce-maintainability-reviewer / ce-correctness-reviewer (BF-58 code review, autofix mode)
created: 2026-05-18
ticket: BF-58
run_id: 20260518-164302-1810421c
---

# MMR rare-earths anchor is read and existence-guarded but its value is never reconciled

## Finding

`scripts/build-asean-minerals.mjs` reads the `myanmar_rare_earths_2025`
anchor into `ANCHOR_MMR_RARE_EARTHS` (line 189) and includes it in the
fail-loud existence guard (line 194):

```js
const ANCHOR_MMR_RARE_EARTHS = anchors.myanmar_rare_earths_2025
if (!ANCHOR_IDN_NICKEL_FLOW || !ANCHOR_NICKEL_GROWTH ||
    !ANCHOR_ASEAN_NICKEL_SHARE || !ANCHOR_MMR_RARE_EARTHS) {
  fail('thesis_b_minerals missing one of the required anchors')
}
```

But the value emitted into `MINERALS_ASEAN.myanmarRareEarthsSharePct`
(line 437) comes from the **parsed CSV** (`mmrContext` → `mmrRareEarths.sharePct`),
not from `ANCHOR_MMR_RARE_EARTHS`. The anchor is therefore only checked for
existence; its `.share_of_world_pct` (5.64) is never compared to the
CSV-derived figure.

Contrast with the Indonesia flow path, which both reads the anchor AND
hard-reconciles the rollup to it (lines 348-360) — a mismatch exits 1. The
MMR anchor read looks like an intended reconciliation guard that was not
wired to the same standard.

## Impact

P3 / advisory. Not a current defect: the CSV-derived MMR rare-earths share
(5.64) happens to equal the anchor value today, `npm run build` passes, and
the generated module is byte-identical on re-run. The risk is latent — if
the production CSV's MMR rare-earths share ever drifts from the headline
anchor, the ASEAN concentration context line would silently emit the CSV
value while the anchor (the cite-ready figure) says something different,
with no fail-loud signal. The dollar/flow anchors (the headline numbers)
are fully guarded; this is the one anchor that is read but not enforced.

## Why this is a todo and not an autofix

Adding a reconciliation assertion touches the generator's fail-loud
anchor-guard surface — the same class of change the task brief explicitly
routes to a todo rather than an autonomous edit ("anything touching the
reconciliation guard → write a todo instead of acting"). Removing the
dangling anchor read instead of strengthening it is also an editorial
call (it changes which anchors the generator declares it depends on).
Either direction is a behaviour-shaping decision for a human, not a
mechanical safe_auto fix.

## Suggested fix (deferred — pick one)

1. **Strengthen (preferred, mirrors the IDN pattern):** after
   `mmrRareEarths` is resolved (line ~429), add
   ```js
   if (Math.abs(round2(mmrRareEarths.sharePct) -
       round2(ANCHOR_MMR_RARE_EARTHS.share_of_world_pct)) > 0.01) {
     fail(`MMR rare-earths CSV share ${mmrRareEarths.sharePct} does not ` +
       `reconcile to myanmar_rare_earths_2025 anchor ` +
       `${ANCHOR_MMR_RARE_EARTHS.share_of_world_pct}`)
   }
   ```
   This makes the anchor read load-bearing and consistent with the IDN
   flow guard. Generated output stays byte-identical for current data.

2. **Simplify:** drop `ANCHOR_MMR_RARE_EARTHS` and its clause from the
   existence guard, sourcing the ASEAN context purely from the CSV. Loses
   the (currently inert) anchor cross-check but removes the misleading
   dangling read.

No action needed for this PR — the figure is correct today and all
headline dollar anchors are reconciled. Surface for human decision on the
next minerals-generator touch.

## Resolution

Chose **Suggested fix 1 (strengthen)** — the anchor read is now
load-bearing and consistent with the IDN flow guard.

Added a reconciliation guard in `scripts/build-asean-minerals.mjs`
immediately after `mmrRareEarths` is resolved (just below the
`expected an MMR Rare Earths 2025 production row` existence check). It
computes the MMR rare-earths share from the production CSV
(`mmrRareEarths.sharePct`) and asserts it equals
`ANCHOR_MMR_RARE_EARTHS.share_of_world_pct`, calling `fail()` (exit 1)
on drift — the same compute-from-CSV / assert-within-tolerance /
fail-loud shape as the existing Indonesia nickel-flow guard.

**MMR fully reconciles — not a weaker proxy.** The
`myanmar_rare_earths_2025` anchor and the `PROD_YEAR` (2025) MMR
"Rare Earths" production row measure exactly the same quantity (Myanmar's
share of world rare-earths mine production for 2025); both read 5.64, and
they are sourced from the same USGS MCS2026 cut. So this is a true
equality reconcile, not a presence/order-of-magnitude fallback.

**Tolerance rationale (mirrors the IDN guard's intent, not its literal
constant):** the IDN guard uses `round1` / `> 0.1` because it reconciles
USD-million totals where 1dp is the natural precision. The MMR figure is
a 2dp world-share percentage and `mmrRareEarths.sharePct` is already
`round2()`-rounded at parse time, so the analogous tolerance is `round2`
/ `> 0.01`. The IDN guard was not loosened or altered in any way.

**Verification:** re-ran `node scripts/build-asean-minerals.mjs` —
`data/asean/minerals.generated.ts` is byte-identical
(`git diff --quiet` clean). A drift-injection test (anchor temporarily
set to 9.99) confirmed the guard exits 1 with a clear message; the
anchor file was restored clean. `npm run build` passes.
