<script setup lang="ts">
import { sortedStraits } from '~/utils/straitsData'
</script>

<template>
  <div class="strait-card-list">
    <header class="strait-card-list__header">
      <h1 class="strait-card-list__title">Indo-Pacific Straits</h1>
      <p class="strait-card-list__subtitle">
        {{ sortedStraits.length }} strategic waterways
      </p>
    </header>
    <ul class="strait-card-list__grid" role="list">
      <StraitCard
        v-for="strait in sortedStraits"
        :key="strait.id"
        :strait="strait"
      />
    </ul>
  </div>
</template>

<style scoped>
.strait-card-list {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem 1rem 2rem;
}

.strait-card-list__header {
  padding: 1.5rem 0 1rem;
}

.strait-card-list__title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}

.strait-card-list__subtitle {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 500;
}

.strait-card-list__grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
