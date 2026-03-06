<script setup lang="ts">
/**
 * StraitsInfographic — State coordinator for the straits visualization.
 *
 * Manages the selectedStrait ref and orchestrates the GSAP-powered
 * circle-to-lens transition between Overview and Lens states.
 */
import { ref, watch, computed, nextTick } from 'vue'
import StraitMap from '~/components/StraitMap.vue'
import StraitLens from '~/components/StraitLens.vue'
import straitsData from '~/data/straits/straits.json'
import type { Strait } from '~/types/strait'
import { useStraitTransition } from '~/composables/useStraitTransition'

const straits = straitsData.straits as Strait[]

const selectedStrait = ref<Strait | null>(null)
const straitMapRef = ref<InstanceType<typeof StraitMap> | null>(null)
const lensRef = ref<InstanceType<typeof StraitLens> | null>(null)
const mapContainer = ref<HTMLElement | null>(null)

// Derive the SVG element from StraitMap's root
const circleOverlay = computed<SVGSVGElement | null>(() =>
  straitMapRef.value?.$el?.querySelector('.circle-overlay') ?? null,
)

// Derive the lens backdrop element from StraitLens's exposed ref.
// StraitLens uses <Teleport to="body">, so the component's $el is a
// comment node; the actual DOM target is the exposed backdropRef.
const lensContainer = computed<HTMLElement | null>(() =>
  lensRef.value?.backdropRef ?? null,
)

const { open, close, isAnimating } = useStraitTransition(
  {
    mapContainer,
    circleOverlay,
    lensContainer,
  },
  {
    onReverseComplete: () => {
      selectedStrait.value = null
    },
  },
)

function onSelectStrait(id: string) {
  if (isAnimating.value) return
  const strait = straits.find((s) => s.id === id) ?? null
  if (!strait) return
  selectedStrait.value = strait
}

// Watch for selectedStrait changes and trigger transition after DOM update.
// flush: 'post' ensures the StraitLens component is mounted (v-if) before
// the GSAP timeline attempts to target its DOM node.
watch(
  selectedStrait,
  async (newStrait) => {
    if (newStrait) {
      // Ensure Teleport target and all child refs are fully resolved
      await nextTick()
      // Look up viewBox coordinates from the mappedStraits computed
      const mapped = straitMapRef.value?.mappedStraits?.find(
        (m: { id: string }) => m.id === newStrait.id,
      )
      if (mapped) {
        open(newStrait.id, { cx: mapped.cx, cy: mapped.cy })
      }
    }
  },
  { flush: 'post' },
)

function onCloseLens() {
  close()
}
</script>

<template>
  <div ref="mapContainer" class="straits-infographic" data-main-content>
    <StraitMap
      ref="straitMapRef"
      class="strait-map"
      @select-strait="onSelectStrait"
    />
    <StraitLens
      v-if="selectedStrait"
      ref="lensRef"
      :strait="selectedStrait"
      @close="onCloseLens"
    />
  </div>
</template>

<style scoped>
.straits-infographic {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
