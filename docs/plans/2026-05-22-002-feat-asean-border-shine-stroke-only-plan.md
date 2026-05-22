---
title: "feat: Confine ASEAN map shine sweep to country borders (stroke-only)"
type: feat
status: active
created: 2026-05-22
ticket: BF-68
depth: lightweight
---

# feat: Confine ASEAN map shine sweep to country borders (stroke-only)

## Summary

The ASEAN Infographic map runs a slow diagonal "shine" sweep across every interactive country. Today the sweep paints the **filled interior** of each country (a semi-opaque white fill) plus its stroke, so the highlight reads as glowing blobs. This plan reworks the effect so the same diagonal sweep illuminates **only the country outlines** — the shine travels through the borders (strokes) of the country vectors, not across their filled areas, producing a cleaner neon-outline tracer look.

The animation mechanism is unchanged: the existing `#reveal-grad` animated linear gradient still drives `#reveal-mask`, and the masked reveal group still sits in the same place in the render tree. The only thing that changes is **what gets painted** under the mask — fill becomes `none`, the stroke is kept/boosted, and the existing `#country-glow` filter is optionally applied to the reveal group for a soft glow.

This is a single-component CSS/SVG change. No data, props, events, or animation timing change.

---

## Problem Frame

- **File:** `components/asean/AseanMap.vue` (single component, scoped `<style>` plus a one-attribute template tweak).
- **Current effect:** the `<g class="asean-map__reveal" mask="url(#reveal-mask)">` group (template lines ~248-256) renders one `<path class="asean-map__fill">` per interactive country. `.asean-map__fill` (style lines ~369-375) is styled `fill: rgba(255,255,255,0.55)` + `stroke: rgba(255,255,255,0.85)` + `stroke-width: 1` + `vector-effect: non-scaling-stroke`. The animated diagonal gradient `#reveal-grad` (defs lines ~216-230) feeds `#reveal-mask` (defs lines ~232-234), so the bright band of the mask sweeps diagonally and reveals the white fills.
- **Desired effect:** keep the diagonal sweep timing and the mask plumbing exactly as-is; the revealed paint should be the **outline only**. Set `.asean-map__fill` to `fill: none`, keep/boost the stroke so it stays visible, and optionally apply `filter="url(#country-glow)"` on the reveal `<g>` for a soft neon glow as the band passes.
- **Constraint:** `vector-effect: non-scaling-stroke` must stay so the stroke width is constant under the plate's CSS zoom transform (the plate scales between idle and docked states, lines ~112-125 / ~353-357).
- **Constraint:** the `@media (prefers-reduced-motion: reduce)` block (style lines ~466-473) must continue to behave correctly; it currently lists `.asean-map__fill` (transition: none) and `.asean-map__plate`.
- **Out of scope:** the active overlay (`.asean-map__active-*`), the hover overlay (`.asean-map__hover-*`), the hit-test layer, gradient timing/keyframes, the mask definition, and any JS logic.

---

## Key Technical Decisions

- **Reuse `#reveal-grad` and `#reveal-mask` unchanged.** Per the ticket, only the painted target changes. The sweep band, direction, duration (`16s`), and `repeatCount` stay identical — this preserves the established rhythm and avoids re-tuning animation values.
- **`fill: none` + visible stroke on `.asean-map__fill`.** Removing the interior fill is what confines the reveal to the borders. The stroke must remain non-transparent (and likely a touch heavier than the current `stroke-width: 1`) so the outline is legible on its own without the fill behind it. The implementer tunes the exact stroke color/opacity/width by eye against the dark `#020a14` background — see Open Decisions.
- **Apply `#country-glow` to the reveal group, not per-path.** The existing active/hover overlays apply `filter="url(#country-glow)"` to a single glow path. For the reveal group there are N paths, so applying the filter once on the wrapping `<g class="asean-map__reveal">` is cheaper and matches the "soft glow on the whole sweep" intent. This is the pattern to mirror, adapted from per-path to per-group. Treat the glow as optional/tunable — if it muddies the outline or costs too much, it can be dropped without affecting the core stroke-only behavior.
- **Keep `vector-effect: non-scaling-stroke`.** Non-negotiable constraint from the ticket; without it the outline thickens/thins as the plate zooms between idle and docked framing.
- **Keep `pointer-events: none`.** The reveal layer is visual only; the separate `.asean-map__hits` layer owns interaction. Unchanged.

---

## Implementation Units

### U1. Convert the reveal paint from fill to stroke-only

**Goal:** Make the swept reveal illuminate country outlines only, removing the interior fill while keeping a visible, non-scaling stroke.

**Requirements:** BF-68 — shine travels only through country borders, not filled areas.

**Dependencies:** none.

**Files:**
- `components/asean/AseanMap.vue` — scoped `<style>` rule `.asean-map__fill` (lines ~369-375).

**Approach:**
- In `.asean-map__fill`, change `fill` from `rgba(255, 255, 255, 0.55)` to `none`.
- Keep `stroke` visible; boost legibility now that there is no fill behind it. Start from the current `stroke: rgba(255, 255, 255, 0.85)` and a slightly heavier `stroke-width` (e.g. ~1.25-1.5) and tune by eye.
- Keep `vector-effect: non-scaling-stroke;` and `pointer-events: none;` exactly as-is.
- Do not touch `#reveal-grad`, `#reveal-mask`, or the template `mask="url(#reveal-mask)"` binding — the sweep still drives the mask, which now reveals strokes instead of fills.

**Patterns to follow:** the stroke-only treatment mirrors how `.asean-map__active-glow` / `.asean-map__hover-glow` (style lines ~393-414) already use translucent strokes with `vector-effect: non-scaling-stroke` on the dark background.

**Test scenarios:** Test expectation: none — pure presentational CSS change with no behavioral logic. Verify visually (see Verification).

**Verification:**
- Run the dev server, open the ASEAN infographic, and watch the sweep: the diagonal band lights up the **outlines** of in-scope/stretch countries; interiors stay transparent (the base map raster shows through).
- Confirm the sweep timing/direction is unchanged from before.
- Toggle the plate between idle and docked (select a country) and confirm stroke width stays visually constant (non-scaling-stroke working).

---

### U2. Add the soft glow to the reveal group (optional, tunable)

**Goal:** Give the swept outline a soft neon glow as the band passes, using the existing `#country-glow` filter.

**Requirements:** BF-68 — "optionally apply the existing `#country-glow` filter to the reveal group for a soft neon glow."

**Dependencies:** U1.

**Files:**
- `components/asean/AseanMap.vue` — template `<g class="asean-map__reveal" mask="url(#reveal-mask)">` (lines ~248-256).

**Approach:**
- Add `filter="url(#country-glow)"` to the `<g class="asean-map__reveal">` element so the whole revealed-stroke layer gets the gaussian-blur-plus-merge glow.
- `#country-glow` already exists in `<defs>` (lines ~207-213) and is used by the active/hover glow paths; no new filter definition is needed.
- This unit is explicitly optional. If the glow over-softens the outline or the result looks muddy against the raster, drop the attribute — U1 alone satisfies the core requirement. Decide by eye during implementation.

**Patterns to follow:** `filter="url(#country-glow)"` usage on `.asean-map__active-glow` (template line ~293) and `.asean-map__hover-glow` (template line ~315) — same filter, applied here at the group level instead of per-path.

**Test scenarios:** Test expectation: none — presentational SVG attribute, no behavioral logic. Verify visually (see Verification).

**Verification:**
- With the glow applied, the swept outline shows a soft halo as the band crosses; without it, the outline is crisp. Pick whichever reads best against `#020a14` and matches the existing active/hover glow aesthetic.
- Confirm no noticeable jank/perf regression during the 16s loop (the filter now covers more paths than the single-path active/hover usage).

---

### U3. Confirm reduced-motion behavior

**Goal:** Ensure the `prefers-reduced-motion: reduce` path still behaves correctly after the fill→stroke change.

**Requirements:** BF-68 — "Respect the existing `@media (prefers-reduced-motion: reduce)` block."

**Dependencies:** U1, U2.

**Files:**
- `components/asean/AseanMap.vue` — `@media (prefers-reduced-motion: reduce)` block (style lines ~466-473).

**Approach:**
- The existing block sets `transition: none` on `.asean-map__fill` and `.asean-map__plate`. The selectors remain valid after U1 (the class name is unchanged). Confirm no stale property reference needs cleanup.
- Note: the sweep itself is driven by SVG `<animateTransform>` (the gradient), not by a CSS transition, so reduced-motion does not currently stop the gradient animation — that is pre-existing behavior and **out of scope** for this ticket (the ticket says "respect the existing block," not "extend reduced-motion handling"). Do not add new animation-disabling logic unless the implementer/reviewer explicitly decides to; if noticed, record it as a follow-up rather than expanding scope here.

**Test scenarios:** Test expectation: none — verification is a manual reduced-motion check; no behavioral logic added.

**Verification:**
- Enable "Reduce motion" at the OS level (macOS: System Settings → Accessibility → Display → Reduce motion) and reload; confirm the component renders without errors and behaves exactly as it did before this change in that mode (no regression introduced by the fill→stroke edit).

---

## Scope Boundaries

**In scope**
- `.asean-map__fill` style rule: `fill: none`, kept/boosted stroke, retained `vector-effect: non-scaling-stroke`.
- Optional `filter="url(#country-glow)"` on the `.asean-map__reveal` group.
- Confirming the reduced-motion block still applies cleanly.

**Out of scope (do not touch)**
- The active overlay (`.asean-map__active-fill` / `.asean-map__active-glow`) and hover overlay (`.asean-map__hover-fill` / `.asean-map__hover-glow`) — they keep their fills intentionally.
- `#reveal-grad` gradient stops, animation `values`/`dur`/`keyTimes`, and the `#reveal-mask` definition.
- The hit-test layer, JS logic (props, emits, computed, watchers), and the frame/dock transform.

### Deferred to Follow-Up Work
- Extending reduced-motion handling to actually pause the SVG `<animateTransform>` sweep (e.g. via `svgEl.pauseAnimations()` gated on a `prefers-reduced-motion` match). The component already calls `pauseAnimations()` on hover/active (lines ~148-154); a reduced-motion-driven pause would be a natural companion but is a behavior change beyond this ticket's CSS/SVG scope.

---

## System-Wide Impact

Confined to `components/asean/AseanMap.vue`. The component is consumed by the ASEAN infographic (e.g. `components/infographics/AseanInfographic.vue`); since the public surface (props `frameTx`/`frameTy`/`frameScale`/`activeSlug`, events `select`/`update:activeSlug`) is untouched, no consumer changes are required. Purely visual change to the idle sweep treatment.

---

## Open Decisions (for the implementer)

1. **Exact stroke styling.** With the fill gone, what stroke color / opacity / width best reads as a "shine tracer" against `#020a14`? Start from the current white `rgba(255,255,255,0.85)` and `stroke-width` ~1.25-1.5, tune by eye. (Low risk — purely cosmetic.)
2. **Keep or drop the glow (U2).** Apply `#country-glow` to the reveal group only if it improves the look without muddying the outline or hurting perf. Either outcome satisfies the ticket.
3. **Reduced-motion sweep pause.** Confirmed out of scope here (see Deferred to Follow-Up Work); flag to the reviewer if it should become its own ticket.
