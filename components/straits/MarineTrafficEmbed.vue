<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { marineTrafficConfigs } from '~/data/straits/marinetraffic-config'

const props = defineProps<{
  straitId: string
}>()

const config = computed(() => marineTrafficConfigs[props.straitId] ?? null)
const iframeRef = ref<HTMLIFrameElement | null>(null)
const loaded = ref(false)
const errored = ref(false)

let loadTimeout: ReturnType<typeof setTimeout> | null = null
const LOAD_TIMEOUT_MS = 15_000

function onIframeLoad() {
  // Guard: ignore the load event fired when src is set to about:blank during cleanup
  const currentSrc = iframeRef.value?.src ?? ''
  if (!currentSrc || currentSrc === 'about:blank' || currentSrc.endsWith('/about:blank')) return
  loaded.value = true
  errored.value = false
  if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null }
}

function startLoadTimeout() {
  if (loadTimeout) clearTimeout(loadTimeout)
  loadTimeout = setTimeout(() => {
    if (!loaded.value) errored.value = true
  }, LOAD_TIMEOUT_MS)
}

// Reset state when strait changes
watch(() => props.straitId, () => {
  loaded.value = false
  errored.value = false
  startLoadTimeout()
})

// Start timeout on mount
startLoadTimeout()

onBeforeUnmount(() => {
  // Null out iframe src to abort any in-flight network requests
  if (iframeRef.value) iframeRef.value.src = 'about:blank'
  if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null }
})
</script>

<template>
  <div v-if="config" class="mt-embed">
    <!--
      sandbox removed: combining allow-scripts + allow-same-origin on a same-origin
      iframe negates sandbox protection (MDN/OWASP). Security is enforced via CSP
      headers in netlify.toml and per-embed CSP meta tags.
    -->
    <iframe
      ref="iframeRef"
      :src="config.embedUrl"
      :title="`Live vessel traffic - ${straitId}`"
      class="mt-embed__iframe"
      :class="{ 'mt-embed__iframe--loaded': loaded }"
      allow="fullscreen"
      referrerpolicy="no-referrer"
      @load="onIframeLoad"
    />
    <div v-if="errored" class="mt-embed__fallback" aria-label="Embed unavailable">
      <span class="mt-embed__fallback-text">Live traffic unavailable</span>
    </div>
  </div>
</template>

<style scoped>
.mt-embed {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  z-index: 1;
  /* Safari fix: border-radius + overflow:hidden on iframes requires mask */
  -webkit-mask-image: -webkit-radial-gradient(white, black);
}

.mt-embed__iframe {
  width: 100%;
  height: 100%;
  border: none;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.mt-embed__iframe--loaded {
  opacity: 1;
}

.mt-embed__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mt-embed__fallback-text {
  color: var(--color-text-dim);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
</style>
