<!--
  Desktop composition of the Straits infographic: map, title/metric header and logo.

  BF-224: extracted from pages/infographics/straits/[[id]].vue so the embed canvas
  (pages/embed/canvas/straits.vue) renders the same composition — title, metric
  toggles and IMF PortWatch source included — instead of the bare map.

  Multi-root on purpose: the layout-2 grid in public/styles.css places
  .strait-map, .strait-header and .strait-logo as direct children of .master-grid.
-->
<script setup lang="ts">
import { straits } from '~/utils/straitsData'
import type { Strait } from '~/types/strait'
import bfnaLogo from '~/assets/images/bfna.svg'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  selectedStraitId: string | null
}>()

const emit = defineEmits<{
  (e: 'select', id: string | null): void
}>()

const VALID_IDS = new Set(straits.map((s: Strait) => s.id))

// --- Size metric with auto-cycle ---
type SizeMetric = 'tonnage' | 'ships' | 'value'
const METRICS: SizeMetric[] = ['tonnage', 'ships', 'value']
const IDLE_TIMEOUT = 7000
const CYCLE_INTERVAL = 7000

// Track header visibility separately — hashes aren't available during SSR,
// so the selection is null on server render. This ref is set eagerly on mount.
const headerHidden = ref(false)

const sizeMetric = ref<SizeMetric>('tonnage')
const cycling = ref(false)
// Bump to restart the CSS progress animation on each cycle tick
const cycleKey = ref(0)
let idleTimer: ReturnType<typeof setTimeout> | null = null
let cycleTimer: ReturnType<typeof setInterval> | null = null

function startCycling() {
  if (cycleTimer) return
  cycling.value = true
  cycleKey.value++
  cycleTimer = setInterval(() => {
    const i = METRICS.indexOf(sizeMetric.value)
    sizeMetric.value = METRICS[(i + 1) % METRICS.length]
    cycleKey.value++
  }, CYCLE_INTERVAL)
}

function stopCycling() {
  if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null }
  cycling.value = false
}

function resetIdleTimer() {
  stopCycling()
  if (idleTimer) clearTimeout(idleTimer)
  if (!props.selectedStraitId) {
    idleTimer = setTimeout(startCycling, IDLE_TIMEOUT)
  }
}

watch(() => props.selectedStraitId, (id) => {
  headerHidden.value = !!id
  if (id) {
    stopCycling()
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
  } else {
    resetIdleTimer()
  }
})

onMounted(() => {
  // Eagerly read hash — route.hash may not be reactive yet after SSR hydration
  const hash = window.location.hash.replace('#', '')
  if (props.selectedStraitId || (hash && VALID_IDS.has(hash))) {
    headerHidden.value = true
  }
  window.addEventListener('mousemove', resetIdleTimer)
  window.addEventListener('mousedown', resetIdleTimer)
  resetIdleTimer()
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', resetIdleTimer)
  window.removeEventListener('mousedown', resetIdleTimer)
  stopCycling()
  if (idleTimer) clearTimeout(idleTimer)
})
</script>

<template>
  <a href="https://bfna.org" target="_blank" rel="noopener noreferrer" class="strait-logo-link">
    <img :src="bfnaLogo" alt="BFNA" class="strait-logo" />
  </a>
  <StraitMap
    :selected-strait-id="selectedStraitId"
    :size-metric="sizeMetric"
    class="strait-map"
    @select="emit('select', $event)"
  />
  <StraitHeader
    :is-hidden="headerHidden"
    :size-metric="sizeMetric"
    :cycling="cycling"
    :cycle-duration="CYCLE_INTERVAL"
    :cycle-key="cycleKey"
    @update:size-metric="sizeMetric = $event"
  />
</template>
