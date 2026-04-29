<script setup lang="ts">
import type { ShareEntry } from '~/data/asean/placeholder-data'

const props = defineProps<{ entry: ShareEntry }>()

// White alpha-ladder (locked in shape brief): no ideological color encoding.
// Magnitude maps to opacity, ranked descending across visible partners.
// "Other" sits at the lowest tier as a subtle remainder bar.
const PARTNER_KEYS = ['us', 'cn', 'eu', 'other'] as const
type PartnerKey = (typeof PARTNER_KEYS)[number]

const PARTNER_LABELS: Record<PartnerKey, string> = {
  us: 'US',
  cn: 'CN',
  eu: 'EU',
  other: 'Other'
}

const segments = computed(() => {
  const { us, cn, eu, other } = props.entry
  const visible = [
    { key: 'us' as PartnerKey, value: us },
    { key: 'cn' as PartnerKey, value: cn },
    { key: 'eu' as PartnerKey, value: eu }
  ]
    .slice()
    .sort((a, b) => b.value - a.value)

  // Rank-by-share alpha ladder: 0.85 / 0.55 / 0.30 / 0.12 (other).
  const ALPHAS = [0.85, 0.55, 0.3]
  const ranked = visible.map((s, i) => ({
    ...s,
    alpha: ALPHAS[i],
    label: PARTNER_LABELS[s.key]
  }))
  // Re-emit segments in fixed left-to-right order (US, CN, EU, Other) so the
  // bar reads consistently country-to-country -- only the alpha shifts with
  // rank.
  const ordered = PARTNER_KEYS.map((k) => {
    if (k === 'other') {
      return { key: 'other' as PartnerKey, value: other, alpha: 0.12, label: PARTNER_LABELS.other }
    }
    const r = ranked.find((x) => x.key === k)!
    return { key: k, value: r.value, alpha: r.alpha, label: r.label }
  })
  return ordered
})
</script>

<template>
  <div class="country-share">
    <div class="country-share__label">{{ entry.label }}</div>
    <div class="country-share__track" role="img" :aria-label="`${entry.label} partner share`">
      <span
        v-for="seg in segments"
        :key="seg.key"
        class="country-share__seg"
        :style="{
          width: `${seg.value}%`,
          background: `rgba(255, 255, 255, ${seg.alpha})`
        }"
      />
    </div>
    <ul class="country-share__legend">
      <li v-for="seg in segments.filter((s) => s.key !== 'other')" :key="seg.key">
        <span
          class="country-share__dot"
          :style="{ background: `rgba(255, 255, 255, ${seg.alpha})` }"
          aria-hidden="true"
        />
        <span class="country-share__legend-label">{{ seg.label }}</span>
        <span class="country-share__legend-value">{{ seg.value }}%</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.country-share {
  margin-bottom: var(--space-s);
  font-family: 'Encode Sans', sans-serif;
}

.country-share__label {
  font-size: var(--size--1);
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 0.5rem;
}

.country-share__track {
  display: flex;
  width: 100%;
  height: 6px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
}

.country-share__seg {
  height: 100%;
  display: block;
}

.country-share__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin: 0.5rem 0 0;
  padding: 0;
  list-style: none;
}

.country-share__legend li {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.7);
  font-variant-numeric: tabular-nums;
}

.country-share__dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.country-share__legend-label {
  font-weight: 600;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.85);
}

.country-share__legend-value {
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}
</style>
