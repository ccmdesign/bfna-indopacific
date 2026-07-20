# BF-104 — Trade graph appears in Critical Minerals section

## Reproduction (done first, before touching flip mechanics)

Ran the ASEAN infographic locally (`/infographics/asean`) and audited the DOM on the
Critical Minerals tab.

Confirmed:

- All four `.chart-card` faces are mounted simultaneously — expected, both `CardFlip`
  faces must stay in the DOM so the 3D rotation can animate.
- In Chromium the inactive (trade) face is correctly **not painted and not
  hit-testable**: `document.elementFromPoint()` at the centre of the front face
  returns the *back* (minerals) face.
- All 11 country slugs resolve their Panel 2 back face: 4 nickel-chart slugs
  (indonesia, malaysia, vietnam, philippines) + 6 `CRM_NOTES_BY_SLUG` entries
  (thailand, singapore, brunei, cambodia, laos, myanmar) + timor-leste, which has a
  CRM note and correctly hides Panel 1 via `showMineralShareCard`. **No country has an
  empty back face** — the ticket's "empty back" hypothesis is ruled out.
- Reduced-motion end-state is logically correct (opacity 0 on the inactive face).

So the ticket's three hypotheses are all wrong *as stated in Chromium*. The defect is
real but browser-dependent, so it needed a deterministic probe.

## Root cause

`components/asean/CardFlip.vue` hides the inactive face using **one mechanism only**:

```css
.card-flip__face { backface-visibility: hidden; }
```

`backface-visibility` is the single point of failure. It is well known to break when a
face contains nested compositing layers (SVG charts, stacking contexts) — Safari is the
classic case, and it also degrades on software/GPU-blocklisted 3D paths and some Android
WebViews. When it fails, **both faces paint at once** and the trade chart is visible,
mirrored, behind the minerals visuals.

Proven deterministically: injecting `backface-visibility: visible` into the live page
reproduces the client's exact screenshot — mirrored "TRADE FLOWS / Two-way goods trade
with China, the U.S. and the EU" and "INDICATIVE COMPOSITION / Top exports & imports"
showing through on the Critical Minerals tab.

## Approach

Do not refactor CardFlip. Add a second, browser-agnostic gate that does not depend on
3D rendering: toggle `visibility` on the inactive face, **delayed by the flip duration**
so the rotation still animates both faces.

- Hiding a face waits `--card-flip-duration` (the face stays visible while it rotates
  away), then goes `visibility: hidden`.
- Revealing a face applies immediately (`transition-delay: 0s`).
- `visibility: hidden` also removes the face from hit-testing and the a11y tree, which
  hardens the reduced-motion path where `opacity: 0` alone still captures pointer events
  (a stray trade-chart tooltip on the minerals tab).
- Reduced motion uses its own shorter hide delay matching the 200ms cross-fade.

Specificity is the ordering mechanism: `.card-flip__inner.is-flipped .card-flip__face--back`
(0,3,0) beats `.card-flip__face--back` (0,1,0), so no `!important` is needed.

## Files

- `components/asean/CardFlip.vue` — CSS only. No template, prop or API change, so both
  call sites in `components/infographics/AseanInfographic.vue` are untouched.

## Test strategy

- Browser: Indonesia (nickel producer, Panel 2 back = flow chart), Timor-Leste and
  Brunei (non-producers, Panel 2 back = CRM box). Critical Minerals tab must show only
  minerals visuals.
- **Regression probe**: re-run with `backface-visibility: visible` forced. Before the
  fix this reveals the trade chart; after the fix the trade face must stay hidden. This
  is the browser-agnostic stand-in for testing in Safari.
- Flip animation still plays both directions.
- Reduced-motion end-state correct and inactive face not hit-testable.

## Risks

- Delayed `visibility` could blank a face mid-animation if the delay were shorter than
  the rotation. Delay is bound to the same `--card-flip-duration` custom property the
  transition uses, so they cannot drift.
- `visibility` is a discretely-animated property; transitioning it with `0s` duration
  plus a delay is the standard, well-supported pattern.
