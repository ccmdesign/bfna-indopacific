<script setup lang="ts">
defineProps<{
  radius: number
  color: { h: number; s: number; l: number }
  active: boolean
}>()
</script>

<template>
  <div
    class="strait-circle"
    :style="{
      '--diameter': `${radius * 2}px`,
      '--h': color.h,
      '--s': `${color.s}%`,
      '--l': `${color.l}%`,
    }"
    :class="{ 'strait-circle--active': active }"
  />
</template>

<style scoped>
.strait-circle {
  width: var(--diameter);
  height: var(--diameter);
  border-radius: 50%;
  background: hsla(var(--h), var(--s), var(--l), 0.12);
  border: 1.5px solid hsla(var(--h), var(--s), var(--l), 0.7);
  box-shadow:
    0 0 16px 4px hsla(var(--h), var(--s), var(--l), 0.25),
    inset 0 0 8px hsla(var(--h), var(--s), 70%, 0.08);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.strait-circle--active {
  background: hsla(var(--h), var(--s), var(--l), 0.25);
  border-color: hsla(var(--h), var(--s), var(--l), 1);
}

@media (prefers-reduced-motion: reduce) {
  .strait-circle {
    transition: none;
  }
}
</style>
