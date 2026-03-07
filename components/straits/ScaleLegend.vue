<script setup lang="ts">
defineProps<{
  entries: { value: number; r: number; label: string }[]
}>()

const SVG_WIDTH = 200
const BASE_Y = 160
const CX = 100
</script>

<template>
  <div class="scale-legend" role="img" aria-label="Scale legend: circle size represents relative trade volume">
    <svg :viewBox="`0 0 ${SVG_WIDTH} 180`" class="legend-svg">
      <circle
        v-for="entry in entries"
        :key="'c-' + entry.value"
        :cx="CX"
        :cy="BASE_Y - entry.r"
        :r="entry.r"
        class="legend-circle"
      />

      <template v-for="entry in entries" :key="'l-' + entry.value">
        <line
          :x1="CX"
          :y1="BASE_Y - entry.r * 2"
          :x2="CX + entry.r + 12"
          :y2="BASE_Y - entry.r * 2"
          class="legend-line"
          aria-hidden="true"
        />
        <text
          :x="CX + entry.r + 16"
          :y="BASE_Y - entry.r * 2 + 4"
          class="legend-label"
        >
          {{ entry.label }}
        </text>
      </template>

      <text :x="CX" :y="BASE_Y + 18" text-anchor="middle" class="legend-title">
        Trade Volume
      </text>
    </svg>
  </div>
</template>

<style scoped>
.scale-legend {
  position: absolute;
  bottom: 16px;
  right: 16px;
  pointer-events: none;
  width: 160px;
}

.legend-svg {
  width: 100%;
  height: auto;
}

.legend-circle {
  fill: none;
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 1;
}

.legend-line {
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 0.5;
  stroke-dasharray: 2 2;
}

.legend-label {
  fill: rgba(255, 255, 255, 0.5);
  font-family: 'Encode Sans', sans-serif;
  font-size: 12px;
  font-weight: 300;
}

.legend-title {
  fill: rgba(255, 255, 255, 0.5);
  font-family: 'Encode Sans', sans-serif;
  font-size: 11px;
  font-weight: 300;
  text-anchor: middle;
}
</style>
