<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { profileBySlug, PROFILES } from '~/data/asean/country-profiles'

// Active country state. Idle (null) = fullscreen map, no selection; clicking a
// country docks the map to the top-left quadrant (see AseanMap re-zoom). The
// other three quadrants then fill with this country's content panels (TR
// identity, BL stacked area, BR tornado bars).
const activeSlug = ref<string | null>(null)

// --- Floating legend (BF-76 A1/A2) ------------------------------------------
// The left-edge legend lets the user dock any country (esp. tiny ones) by name
// and hover-highlight it on the map. We own its hover slug here and feed it into
// AseanMap as `externalHoverSlug` (direct map hover still wins). The legend
// collapses to a pill when it would overlap land: when a country is docked the
// map reframes into the top-left quadrant (overlapping the left edge), and on
// narrow viewports there isn't room — so shouldCollapse fires on either. A
// user-initiated expand overrides until the next dock (the activeSlug watch
// resets it). No land-geometry detection — a viewport/threshold heuristic per
// the brief.
const legendHoverSlug = ref<string | null>(null)
const userExpanded = ref(false)
const { isMobile } = useViewport()

const shouldCollapse = computed(
  () => (activeSlug.value !== null || isMobile.value) && !userExpanded.value
)

// A new dock re-collapses the legend (so each selection starts from the
// collapsed pill rather than leaving a land-overlapping list open).
watch(activeSlug, () => {
  userExpanded.value = false
})

// Clear legendHoverSlug whenever the legend list collapses. The list (v-else)
// unmounts on collapse before its rows can fire @mouseleave/@blur, so without
// this the last-hovered slug stays set and paints a ghost hover glow +
// typewriter label on the map with the pointer nowhere near it — most visibly
// after Overview/Back nulls activeSlug (the map hover-layer gate
// slug !== activeSlug passes again at activeSlug=null). Covers the dock,
// Overview/Back, and viewport-shrink collapse paths in one rule.
watch(shouldCollapse, (collapsed) => {
  if (collapsed) legendHoverSlug.value = null
})

const activeProfile = computed(() =>
  activeSlug.value ? profileBySlug(activeSlug.value) : undefined
)

function onActiveSlugUpdate(next: string | null) {
  // Accept null (deselect) or any wired profile slug. Map clicks for
  // countries without a profile fall through silently.
  if (next === null || PROFILES[next]) {
    activeSlug.value = next
  }
}

// --- Back to overview (BF-117) ----------------------------------------------
// Before this, the ONLY way back to the idle country list was clicking empty map
// geometry — undiscoverable (Aline, BF-113 §2). The layout's "Back to home" link
// (layouts/default.vue) is not that affordance: it leaves for a site index that
// doesn't even list this infographic. So: an explicit top-left Back control,
// visible only while a country is docked, plus Escape. One button, one key
// handler — no routing, no history entries.
function backToOverview() {
  onActiveSlugUpdate(null)
}

function onWindowKeydown(event: KeyboardEvent) {
  // Only claim Escape while a country is docked, so we never swallow it from
  // anything else on the page in the idle state.
  if (event.key === 'Escape' && activeSlug.value !== null) {
    backToOverview()
  }
}

onMounted(() => window.addEventListener('keydown', onWindowKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onWindowKeydown))

// --- Country-switch choreography --------------------------------------------
// The country-name carousel (AseanCountrySwitcher) owns the name transition
// (slide); the large flag panel flips and the paragraph cross-fade stays
// declarative on the `activeSlug` key — all in sync with the map re-zoom.
// (The hero big-number that used to scramble here — two-way trade with China
// — was removed per BF-96; see CountryKeyFacts for its Description-tab
// replacement.)
</script>

<template>
  <div class="asean-infographic">
    <!-- Map stays fullscreen across all quadrants; selecting a country re-frames
         it into the top-left quadrant (see AseanMap re-zoom). Charts will overlay
         the other three quadrants on top of the map. -->
    <AseanMap
      :active-slug="activeSlug"
      :external-hover-slug="legendHoverSlug"
      :suppress-active-label="true"
      @update:active-slug="onActiveSlugUpdate"
    />

    <!-- Back to overview (BF-117). Top-left, offset from BOTH the layout's
         "Back to home" link (top: 1rem, left: 1.5rem — a different destination,
         deliberately left alone per the brief) and the country-name reel across
         the top, so nothing overlaps or reads as a duplicate. Only rendered
         while a country is docked; Escape does the same thing. -->
    <Transition name="intro-fade">
      <button
        v-if="activeProfile"
        type="button"
        class="asean-infographic__back"
        aria-label="Back to all countries"
        @click="backToOverview"
      >
        <span class="asean-infographic__back-arrow" aria-hidden="true">&#8592;</span>
        <span>Back</span>
      </button>
    </Transition>

    <!-- Focused-state country switcher (BF-76 follow-up): a horizontal carousel
         of country titles across the top. The active country is the large title;
         clicking a neighbour docks it. Replaces the flag + typed-name identity. -->
    <Transition name="intro-fade">
      <AseanCountrySwitcher
        v-if="activeProfile"
        :active-slug="activeSlug ?? ''"
        :flag-url="activeProfile.flagUrl"
        @select="onActiveSlugUpdate"
      />
    </Transition>

    <!-- Idle sidebar: the intro block (title + subtitle + blurb) and the country
         legend, grouped in one fixed right-side column and stacked. Shown only
         when no country is docked. The map stays clickable through the gaps
         (sidebar is pointer-events:none; the legend opts its buttons back in). -->
    <Transition name="intro-fade">
      <div v-if="!activeSlug" class="asean-infographic__idle">
        <header class="asean-infographic__intro">
          <h1 class="asean-infographic__intro-title">ASEAN<span class="asean-infographic__intro-title-sub">The Strategic Pivot of the Indo-Pacific</span></h1>
          <p class="asean-infographic__intro-subtitle">
            Trade, Power, and Critical Mineral Supply Chains in an Era of Great Power Competition
          </p>
          <p class="asean-infographic__intro-blurb">
            Select a country and examine its trade with the U.S., China and the EU since 2010,
            and its role in critical mineral supply chains.
          </p>
        </header>

        <AseanLegend
          :active-slug="activeSlug"
          :collapsed="shouldCollapse"
          @select="onActiveSlugUpdate"
          @overview="onActiveSlugUpdate(null)"
          @hover="legendHoverSlug = $event"
          @expand="userExpanded = true"
        />
      </div>
    </Transition>

    <!-- Focused-state right sidebar. Selecting a country stacks the identity
         (flag + name) and a 3-tab tablist above the active tabpanel: Description
         (narrative + Key Facts) or the two chart cards (Trade / Critical
         Minerals) — in a single right-hand column. The map keeps the rest of
         the viewport with the country docked top-left. The sidebar is
         pointer-events:none (map stays clickable through it); only the tabs
         and the chart cards opt back in. -->
    <Transition name="panel-rise">
      <aside v-if="activeProfile" class="asean-infographic__sidebar">
        <!-- BF-129: the whole country-detail view (tabs + panels + charts) now
             lives in CountryDetail, driven by the active slug. This <aside>
             keeps only the positioning / pointer-events:none / mask / gradient
             wrapper and the panel-rise transition; CountryDetail's interactive
             parts (tabs, chart cards) opt pointer-events back in themselves. -->
        <CountryDetail :slug="activeSlug" />
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.asean-infographic {
  position: fixed;
  inset: 0;
  width: 100svw;
  height: 100svh;
  z-index: 10;
  /* Shared idle-sidebar column width — set by the ASEAN masthead (~3.4x its
     font-size incl. tracking). The intro block and the country legend both use
     it so they align to one left edge and one width. */
  --intro-w: clamp(200px, 28vw, 384px);
}

/* --- Back to overview (BF-117) --- */
/* Fixed top-left, stacked BELOW two existing things so it collides with neither:
   1. layouts/default.vue .back-link-nav ("Back to home", top: 1rem / left: 1.5rem)
   2. the AseanCountrySwitcher reel band (top: 0; 52px active line + 2x its
      clamp(16px, 3vh, 32px) padding => ~64px + clamp(32px, 6vh, 64px) tall).
   The focused sidebar is on the RIGHT, so top-left is inherently clear of it.
   z-index 25 clears the sidebar (20) and the reel (22).
   pointer-events: auto is load-bearing — the overlays around it are
   pointer-events:none by design so the map stays clickable through them; without
   this the button would render but be dead to clicks. */
.asean-infographic__back {
  position: fixed;
  top: calc(64px + clamp(32px, 6vh, 64px) + 8px);
  left: clamp(16px, 1.5vw, 24px);
  z-index: 25;
  pointer-events: auto;

  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-family: 'Encode Sans', sans-serif;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.78);
  cursor: pointer;

  /* Same panel language as .asean-legend__menu / .asean-infographic__tabs. */
  background: rgba(2, 38, 64, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  transition: background 0.15s ease, color 0.15s ease;
}

.asean-infographic__back:hover {
  color: #fff;
  background: rgba(2, 38, 64, 0.72);
}

.asean-infographic__back:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

/* While fading out (400ms intro-fade leave) the button is still in the DOM and
   would keep eating clicks meant for the map underneath it. Drop it out of
   hit-testing as soon as it starts leaving. */
.asean-infographic__back.intro-fade-leave-active {
  pointer-events: none;
}

.asean-infographic__back-arrow {
  font-size: 14px;
  line-height: 1;
}

@media (prefers-reduced-motion: reduce) {
  .asean-infographic__back {
    transition: none;
  }
}

/* Idle intro — top-right quadrant. Sits on the dark map, no card chrome. */
/* Idle sidebar: the intro block + country legend, grouped and stacked on the
   right. Fixed to the right edge, content-height (top-anchored). Map stays
   clickable through the gaps — pointer-events:none here; the legend re-enables
   its own buttons. Every line shares --intro-w so the whole column is one width. */
.asean-infographic__idle {
  position: fixed;
  top: 0;
  right: 0;
  max-width: 50svw;
  /* BF-118: cap the column at the viewport. Top-anchored + content-height with
     no cap let intro + gap + the legend's old flat `max-height: 56svh` add up
     past 100svh on short viewports, pushing the legend panel's own bottom edge
     (and the last country with it) below the fold, where its internal scroller
     could never reach. box-sizing:border-box keeps the padding inside the cap;
     .asean-legend then absorbs all the shrink (see AseanLegend.vue). */
  max-height: 100svh;
  box-sizing: border-box;
  padding: clamp(28px, 5vh, 64px) clamp(24px, 3vw, 56px);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: clamp(24px, 5vh, 52px);
  z-index: 20;
  color: rgba(255, 255, 255, 0.92);
  font-family: 'Encode Sans', sans-serif;
  text-align: left;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}

/* Intro text block — just the stacked title / subtitle / blurb; positioning and
   padding live on the .asean-infographic__idle sidebar above. */
.asean-infographic__intro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}

.asean-infographic__intro-title,
.asean-infographic__intro-subtitle,
.asean-infographic__intro-blurb {
  width: var(--intro-w);
}

/* Tier 1: "ASEAN" — large, thin, airy. A tracked-out Encode Sans Thin display
   treatment (the redesigned masthead), not a bold slab. */
.asean-infographic__intro-title {
  margin: 0;
  font-size: clamp(3.5rem, 8vw, 7rem);
  font-weight: 100;
  line-height: 1.02;
  letter-spacing: 0.05em;
  color: #fff;
}

/* Tier 2: "Pivot of the Indo-Pacific" — line break, smaller than ASEAN,
   larger than the subtitle. ~20px below ASEAN to match the design. */
.asean-infographic__intro-title-sub {
  display: block;
  margin-top: clamp(12px, 1.4vw, 20px);
  font-size: clamp(1.5rem, 2.4vw, 2.125rem);
  font-weight: 500;
  letter-spacing: -0.01em;
  color: rgba(255, 255, 255, 0.9);
}

.asean-infographic__intro-subtitle {
  margin: 0;
  font-size: clamp(1.125rem, 1.4vw, 1.25rem);
  font-weight: 400;
  line-height: 1.3;
  color: #cbdbf6;
}

.asean-infographic__intro-blurb {
  margin: 4px 0 0;
  font-size: clamp(0.85rem, 1vw, 1rem);
  font-weight: 400;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
}

/* BF-119: landscape phones are the only orientation a real handset reaches —
   RotateDeviceOverlay covers portrait on phone UAs — and iOS Safari lands at
   ~812x340 with the URL bar showing. The intro's desktop hero type ate 268px of
   that, leaving the legend pill inside the fixed footer's box (and below the
   fold entirely at 340px), so the infographic had no entry point on a phone: the
   map's country hit-areas are too small to be the way in.

   Shrink the intro rather than restack it — the pill has to physically clear the
   footer, and no z-index buys vertical space. Widening --intro-w cuts the
   tagline's wrapped-line count, which is where most of the height went;
   reserving 4rem of bottom padding keeps the column out from under the footer.
   Height-only query, so desktop and portrait are untouched. */
@media (max-height: 480px) {
  .asean-infographic__idle {
    --intro-w: clamp(200px, 42vw, 360px);
    padding: 12px clamp(16px, 2vw, 24px) calc(4rem + 12px);
    gap: 12px;
    /* Footer is also z-index 20 and later in document order, so it wins the tie
       and swallows the tap even where the pill paints above it. */
    z-index: 21;
  }

  .asean-infographic__intro {
    gap: 6px;
  }

  .asean-infographic__intro-title {
    font-size: 2rem;
  }

  .asean-infographic__intro-title-sub {
    margin-top: 4px;
    font-size: 1rem;
  }

  .asean-infographic__intro-subtitle {
    font-size: 0.875rem;
    line-height: 1.25;
  }

  .asean-infographic__intro-blurb {
    margin-top: 2px;
    font-size: 0.75rem;
    line-height: 1.35;
  }
}

.intro-fade-enter-active,
.intro-fade-leave-active {
  transition: opacity 400ms ease;
}
.intro-fade-enter-from,
.intro-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .intro-fade-enter-active,
  .intro-fade-leave-active {
    transition: none;
  }
}

/* --- Focused-state right sidebar --- */
/* Full-height right column holding the identity above the two charts. Sits over
   the right of the map; pointer-events:none so the map (and any country under
   it) stays clickable, with only the tabs and chart cards opting back in. A
   soft left-edge scrim blends the column into the map and keeps content
   legible against the busy plate. Scrolls if the column overflows. */
.asean-infographic__sidebar {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  /* BF-72 R5: width cap raised 480px -> 600px to give the Description tab's
     paragraph + Key Facts and the chart panels more room. */
  width: clamp(340px, 34vw, 600px);
  box-sizing: border-box;
  /* Top padding clears the country-title carousel pinned across the top.
     Bottom padding clears the fixed 4rem footer strip so the last content item
     scrolls fully above the footer's shaded area instead of behind it. */
  padding: clamp(104px, 15vh, 150px) clamp(20px, 2vw, 32px)
    calc(4rem + clamp(20px, 3vh, 40px));
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2vh, 24px);
  overflow-y: auto;
  z-index: 20;
  pointer-events: none;
  background: linear-gradient(
    to right,
    rgba(2, 38, 64, 0) 0%,
    rgba(2, 38, 64, 0.55) 26%
  );
  /* Top fade: scrolled content stays fully masked until 12px below the top
     country-name reel, then ramps up to full opacity — so nothing bleeds behind
     that strip. Reel bottom = 52px active line + 2·switcher pad clamp(16,3vh,32);
     the flat transparent band runs to reel-bottom + 12px, then ~40px of fade. */
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(64px + clamp(32px, 6vh, 64px)),
    #000 calc(104px + clamp(32px, 6vh, 64px))
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(64px + clamp(32px, 6vh, 64px)),
    #000 calc(104px + clamp(32px, 6vh, 64px))
  );
}

/* BF-106: short viewports — a 150%-scaled 1920×1080 Windows display is a
   1280×720 CSS viewport (125%-scaled laptops land at 768). The charts column
   overflows there (~440px; the second chart card sits fully below the fold),
   and with pointer-events:none the wheel falls through to the map in the gaps
   between/around the cards, so the column reads as "not scrolling". At or
   below 800px make the whole column wheelable; the trade-off (map not
   clickable through the sidebar's transparent left edge) only bites at
   heights where the hidden content matters more than the click-through. */
@media (max-height: 800px) {
  .asean-infographic__sidebar {
    pointer-events: auto;
  }
}

/* --- Focused-panel choreography (R6/D4) --- */
/* Panels rise + fade in slightly after the 600 ms map re-zoom starts, so the
   eye follows the map first, then the content lands as the country settles into
   TL. On leave they fade out faster (no slide) before/while the map zooms back. */
.panel-rise-enter-active {
  transition: opacity 380ms ease, transform 380ms cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 150ms;
}
.panel-rise-leave-active {
  transition: opacity 240ms ease;
}
.panel-rise-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.panel-rise-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  /* Instant appear/disappear: no slide, no fade duration. CardFlip drops to its
     flat, no-rotation path under reduced motion (handled in CardFlip.vue). */
  .panel-rise-enter-active,
  .panel-rise-leave-active {
    transition: none;
    transition-delay: 0ms;
  }
  .panel-rise-enter-from {
    transform: none;
  }
}
</style>
