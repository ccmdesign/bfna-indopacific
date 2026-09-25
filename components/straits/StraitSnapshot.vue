<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'

const props = defineProps<{
  valueUSD: number
  capacityMt: number
  vessels: number
  sizeMetric: 'tonnage' | 'ships' | 'value'
}>()

const heroValue = computed(() => {
  if (props.sizeMetric === 'value') return fmtUsd(props.valueUSD)
  if (props.sizeMetric === 'ships') return fmtNum(props.vessels)
  return fmtMt(props.capacityMt)
})

const heroLabel = computed(() => {
  if (props.sizeMetric === 'value') return 'Trade Value'
  if (props.sizeMetric === 'ships') return 'Vessels'
  return 'Metric Tonnes'
})

function fmtUsd(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`
  return `$${(v / 1e6).toFixed(0)}M`
}

function fmtNum(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`
  return v.toLocaleString('en-US')
}

function fmtMt(v: number): string {
  return v.toLocaleString('en-US')
}

// --- Scramble number effect ---
const SCRAMBLE_DURATION = 400 // total animation time in ms
const SCRAMBLE_INTERVAL = 30  // tick interval in ms
const SCRAMBLE_DIGITS = '0123456789'

const displayValue = ref<string>(heroValue.value ?? '')
let scrambleTimer: ReturnType<typeof setInterval> | null = null

function scrambleChar(ch: string): string {
  if (ch >= '0' && ch <= '9') {
    return SCRAMBLE_DIGITS[Math.floor(Math.random() * 10)]
  }
  return ch
}

function scrambleTo(target: string) {
  if (scrambleTimer) { clearInterval(scrambleTimer); scrambleTimer = null }

  let elapsed = 0

  scrambleTimer = setInterval(() => {
    elapsed += SCRAMBLE_INTERVAL
    const progress = Math.min(elapsed / SCRAMBLE_DURATION, 1)

    // Reveal characters left-to-right as progress advances
    const settled = Math.floor(progress * target.length)
    let result = ''
    for (let i = 0; i < target.length; i++) {
      result += i < settled ? target[i] : scrambleChar(target[i])
    }
    displayValue.value = result

    if (progress >= 1) {
      clearInterval(scrambleTimer!)
      scrambleTimer = null
      displayValue.value = target
    }
  }, SCRAMBLE_INTERVAL)
}

watch(() => props.sizeMetric, () => {
  scrambleTo(heroValue.value ?? '')
})

watch(heroValue, (val) => {
  if (!scrambleTimer) {
    displayValue.value = val ?? ''
  }
})

onBeforeUnmount(() => {
  if (scrambleTimer) clearInterval(scrambleTimer)
})
</script>

<template>
  <div class="snapshot-overlay">
    <span class="snapshot-hero">{{ displayValue }}</span>
    <span class="snapshot-label">{{ heroLabel }}</span>
  </div>
</template>

<style scoped>
.snapshot-overlay {
  position: absolute;
  inset: 0;
  /* Size text against this circle, including when the map is embedded. */
  container-type: inline-size;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  font-family: 'Encode Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #fff;
}

.snapshot-hero {
  font-size: clamp(14px, 22cqw, 72px);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.snapshot-label {
  font-size: clamp(7px, 6cqw, 10px);
  max-width: 80%;
  text-align: center;
  line-height: 1.2;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4%;
}
</style>
