<script setup lang="ts">
import type { Strait } from '~/types/strait'
import { fmtUsd } from '~/utils/straitFormatters'
import { useStraitTransition } from '~/composables/useStraitTransition'

const props = defineProps<{
  strait: Strait
}>()

const thumbnailRef = ref<HTMLElement | null>(null)
const { captureCard } = useStraitTransition()

function handleClick() {
  if (thumbnailRef.value) {
    captureCard(props.strait.id, thumbnailRef.value)
  }
  // NuxtLink handles navigation
}

const thumbnailUrl = computed(() => {
  if (!props.strait.imageUrl) return undefined
  const name = props.strait.imageUrl.split('/').pop()?.replace('.webp', '') ?? ''
  return `/assets/straits/thumbs/${name}.jpg`
})

const thumbnailVisible = ref(true)
function onThumbnailError() {
  thumbnailVisible.value = false
}

const ariaLabel = computed(() =>
  `${props.strait.name}, ${props.strait.globalShareLabel}, ${fmtUsd(props.strait.valueUSD)} annual trade`
)
</script>

<template>
  <li class="strait-card">
    <NuxtLink
      :to="`/infographics/straits/${strait.id}`"
      class="strait-card__link"
      :aria-label="ariaLabel"
      @click.capture="handleClick"
    >
      <div ref="thumbnailRef" class="strait-card__thumbnail">
        <img
          v-if="thumbnailUrl && thumbnailVisible"
          :src="thumbnailUrl"
          :alt="strait.name"
          class="strait-card__thumbnail-img"
          width="72"
          height="72"
          @error="onThumbnailError"
        />
      </div>
      <div class="strait-card__content">
        <h3 class="strait-card__name">{{ strait.name }}</h3>
        <p class="strait-card__share">{{ strait.globalShareLabel }}</p>
        <p class="strait-card__value">{{ fmtUsd(strait.valueUSD) }} <span>annual trade</span></p>
      </div>
      <svg class="strait-card__chevron" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M7.5 5l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </NuxtLink>
  </li>
</template>

<style scoped>
.strait-card {
  list-style: none;
}

.strait-card__link {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  text-decoration: none;
  color: inherit;
  min-height: 44px;
  transition: opacity 0.15s ease;
}

@media (hover: hover) {
  .strait-card__link:hover {
    opacity: 0.75;
  }
}

.strait-card__link:focus-visible {
  outline: 1px solid rgba(255, 255, 255, 0.6);
  outline-offset: 2px;
}

.strait-card__thumbnail {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 0;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}

.strait-card__thumbnail-img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  display: block;
}

.strait-card__content {
  flex: 1;
  min-width: 0;
}

.strait-card__name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 3px;
  letter-spacing: -0.02em;
}

.strait-card__share {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 4px;
}

.strait-card__value {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.strait-card__value span {
  font-weight: 400;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-left: 4px;
}

.strait-card__chevron {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.25);
}

@media (prefers-reduced-motion: reduce) {
  .strait-card__link {
    transition: none;
  }
}
</style>
