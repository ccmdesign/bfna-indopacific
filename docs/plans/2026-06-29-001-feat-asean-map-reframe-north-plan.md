---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
title: "feat: Reframe ASEAN map north (frame transform, no new raster)"
date: 2026-06-29
ticket: BF-78
---

# feat: Reframe ASEAN map north (A4 — frame transform, no new raster)

## Summary

Retune **only** the three default frame-transform values (`frameTx`, `frameTy`,
`frameScale`) in `components/asean/AseanMap.vue` so the unselected ("idle") map
view pans north and zooms in: Southeast Asia + southern China fill the default
frame, Myanmar sits comfortably in view, and Australia drops mostly out of frame.
The locked equirectangular plate (image + W/E/N/S bounds) and the country-vector
registration are **untouched**, so no recalibration is required and country
overlays/clicks keep registering correctly.

This is a **visual eye-tuning** change. The values in this plan are a
geometry-reasoned **first pass** and must be confirmed by a human in the browser
(via DialKit or direct inspection) before merge — which is exactly why the
BF-78 pipeline merge policy is stop-at-PR.

---

## Problem Frame

Per the Jun 25 Marshall review, the ASEAN map's default framing shows too much
Australia and not enough Southeast Asia / southern China. The decision (6/29) is
to **reframe only — no new image**: the existing plate
`public/assets/map-asean-wide-2x.webp` (bounds W 5°, E 185°, N 55°, S −46.25°)
already spans the requested geographic extent, so the fix is purely a default
viewport pan + zoom, not a re-crop or new raster.

The idle frame is produced entirely by the component's prop **defaults** — no
parent (`components/infographics/AseanInfographic.vue`) passes `frameTx` /
`frameTy` / `frameScale` overrides — so editing the three `withDefaults` values
is both necessary and sufficient to move the idle view.

---

## Requirements

- **R1** — Default (unselected) map view centers SE Asia + southern China.
- **R2** — Myanmar is comfortably within the default frame.
- **R3** — Australia is mostly out of the default frame.
- **R4** — Country overlays and clicks still register correctly (plate stays locked; no vector recalibration).
- **R5** — Per-country dock/zoom still frames each country correctly after the new idle defaults.
- **R6** — No change to the `PLATE` constant (W/E/N/S/imageHref) and no new raster asset.

---

## Key Technical Decisions

**KTD1 — Edit only the three `withDefaults` values; leave everything else alone.**
The idle transform is applied in `frameStyle` as
`translate(${props.frameTx}px, ${props.frameTy}px) scale(${props.frameScale})`
when no country is active. Because no consumer overrides these props, retuning
the defaults is the complete fix. The active-country branch of `frameStyle`
computes its own transform from each feature's bbox (`QUADRANT_PAD`,
`MIN_DOCK_ZOOM`, `MAX_DOCK_ZOOM`) and is independent of the idle defaults, so
R5 holds for free — the dock math does not read `frameTx/frameTy/frameScale`.

**KTD2 — First-pass values derived from plate geometry, not guessed.**
The plate is equirectangular (plate carrée): lon→x and lat→y are linear over a
1920×1080 viewBox. Degrees-per-pixel = 180°/1920 (lon) and 101.25°/1080 (lat),
both ≈ 0.09375 px⁻¹·deg. A plate point `(lon,lat)` maps to base coords
`px = ((lon−5)/180)·1920`, `py = ((55−lat)/101.25)·1080`. The on-screen position
is `screen = frameTx + frameScale·px` (and analogously for y). To center a chosen
`(lon,lat)` at the viewBox center `(960, 540)`:
`frameTx = 960 − frameScale·px`, `frameTy = 540 − frameScale·py`.

Chosen idle center: **≈108°E, 14°N** (over the South China Sea / Vietnam coast),
scale **2.0**. This yields:

- `frameTx ≈ −1237`, `frameTy ≈ −335`, `frameScale = 2.0`
- Visible window ≈ **lon 63°E–153°E, lat 39°N–−11°N**

Against the requirements:
- Myanmar (~92–101°E, 10–28°N) → well inside the left half of the frame (R2 ✓).
- Southern China (down to ~22–25°N) → top edge at ~39°N, comfortably in view (R1 ✓).
- Australia (mainland top ~10–11°S, Darwin ~12.5°S) → bottom edge at ~−11°N, so
  only the very northern tip could graze the bottom; Australia is mostly out (R3 ✓).

These are a **first pass**. The exact center and zoom are an "I'll know it when I
see it" judgment — a human should confirm/nudge in the browser before merge.

**KTD3 — Keep the explanatory comment honest.**
The existing comment at the FRAME TRANSFORM block says *"Defaults center Malaysia
(~109.5°E, 4.2°N)"*. Update that one line to reflect the new idle center
(~108°E, 14°N — SE Asia + southern China, Australia mostly out) so the code
comment does not drift from behavior. No other prose changes.

---

## Implementation Units

### U1. Retune the idle frame-transform defaults

**Goal:** Pan the idle map north and zoom in so SE Asia + southern China fill the
default view and Australia drops mostly out, without touching the plate or vectors.

**Requirements:** R1, R2, R3, R6 (and R4/R5 preserved by construction).

**Dependencies:** none.

**Files:**
- `components/asean/AseanMap.vue` (modify — `withDefaults` block ~lines 44–50 and the FRAME TRANSFORM comment ~lines 20–24)

**Approach:**
- Change the three default values in the `withDefaults(defineProps<…>(), { … })`
  call:
  - `frameTx: -1224` → `frameTx: -1237`
  - `frameTy: -482` → `frameTy: -335`
  - `frameScale: 1.701` → `frameScale: 2.0`
- Update the FRAME TRANSFORM block comment line that currently reads
  "Defaults center Malaysia (~109.5°E, 4.2°N) in the viewBox." to describe the
  new idle center (SE Asia + southern China; Australia mostly out).
- Do **not** edit the `PLATE` constant, the `projection`, `pathGen`,
  `renderedFeatures`, `QUADRANT_PAD`, `MIN_DOCK_ZOOM`, `MAX_DOCK_ZOOM`, or the
  active-country branch of `frameStyle`.

**Patterns to follow:** The values stay in the same numeric form already used for
the defaults (plain px translate + unitless scale). No new props, no new tokens.

**Test scenarios:** `Test expectation: none — this is a visual default-value
change with no automated test surface in the repo.` Verification is by browser
inspection (see Verification). The component's existing behavior (idle render,
hover typewriter, click-to-dock) is exercised unchanged.

**Verification:**
- Build/typecheck succeeds (no signature change, so this should be a no-op risk).
- In the browser on the ASEAN map page: the **default** (nothing clicked) view is
  centered on SE Asia + southern China; Myanmar is clearly in frame; Australia is
  mostly/entirely out of the bottom of the frame.
- Clicking an in-scope country still docks it into the top-left quadrant correctly
  (plate locked, overlay aligned to the country shape) — confirming R4 + R5.
- **Human DialKit/eyeball confirmation of the exact center/zoom is required before
  merge.**

---

## Scope Boundaries

**In scope:** the three `frameTx` / `frameTy` / `frameScale` defaults and the one
adjacent explanatory comment in `components/asean/AseanMap.vue`.

**Out of scope (do not touch):**
- The `PLATE` constant (W/E/N/S, imageHref) and the raster asset — no new image, no re-crop.
- Country-vector registration / `countries.geo.json` / the `projection` + `pathGen` pipeline.
- The active-country dock math (`QUADRANT_PAD`, `MIN_DOCK_ZOOM`, `MAX_DOCK_ZOOM`, the active branch of `frameStyle`).
- Any parent component (`AseanInfographic.vue`) — it passes no frame overrides and needs no change.

### Deferred to Follow-Up Work
- None.

---

## Risks & Dependencies

- **Visual subjectivity (primary risk).** The exact "right" center/zoom is a
  judgment call. Mitigation: values are geometry-derived as a first pass and the
  PR is explicitly held for human browser confirmation (stop-at-PR merge policy).
- **Over/under-zoom edge.** If scale 2.0 reads as too tight (clipping Myanmar's
  west edge) or too loose (too much Australia), the fix is a small nudge to
  `frameScale` and a recompute of `frameTx/frameTy` via the KTD2 formula — no
  structural change. Mitigation: the geometry formula in KTD2 makes re-tuning a
  one-line arithmetic exercise.
- **No regression risk to interactivity.** Because the active-dock branch is
  independent of the idle defaults and the plate/vectors are untouched, click
  registration and per-country framing are unaffected by construction.

---

## Definition of Done

- `components/asean/AseanMap.vue` idle defaults updated to the new values (or a
  human-confirmed nudge of them); comment updated.
- `PLATE`, vectors, and dock math unchanged.
- Build/typecheck green.
- Browser check: default view centers SE Asia + southern China, Myanmar in frame,
  Australia mostly out; a country click still docks correctly.
- PR open against `dev`, flagged "first-pass frame values — needs human DialKit
  confirmation before merge." Not merged by the pipeline.

---

## Sources & Research

- Target file: `components/asean/AseanMap.vue` — `PLATE` (lines ~12–18),
  `withDefaults` frame defaults (lines ~44–50), `frameStyle` idle vs active
  branches (lines ~121–134).
- Consumer audit: `components/infographics/AseanInfographic.vue` is the only
  `AseanMap` consumer and passes no `frameTx/frameTy/frameScale` overrides →
  defaults are the sole source of the idle frame.
- BF-78 ticket description and the 6/29 reframe-only decision.
