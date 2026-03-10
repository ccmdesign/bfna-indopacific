<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { StraitFlowConfig } from '~/utils/particleEngine'
import { useParticleFlow } from '~/composables/useParticleFlow'
import { setupTweakpane } from '~/utils/particleTweakpane'

const props = defineProps<{
  config: StraitFlowConfig
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const tweakpaneRef = ref<HTMLDivElement | null>(null)
const { params, start, stop, getSpineArrays, rebuildSpines } = useParticleFlow({
  canvasRef,
  config: props.config,
  debug: ref(true),
})

let tweakpaneInstance: { pane: any; dispose: () => void } | null = null

onMounted(async () => {
  if (!import.meta.dev) return
  tweakpaneInstance = await setupTweakpane(params, {
    enableDrag: true,
    canvas: canvasRef.value!,
    container: tweakpaneRef.value!,
    spineArrays: getSpineArrays(),
    onSpineChange: rebuildSpines,
    spawnZones: props.config.spawnZones,
  })
})

onUnmounted(() => {
  tweakpaneInstance?.dispose()
  stop()
})

const straits = [
  { id: 'hormuz', label: 'Hormuz' },
  { id: 'malacca', label: 'Malacca' },
  { id: 'lombok', label: 'Lombok' },
  { id: 'luzon', label: 'Luzon' },
  { id: 'taiwan', label: 'Taiwan' },
  { id: 'bab-el-mandeb', label: 'Bab el-Mandeb' },
]
</script>

<template>
  <div class="test-layout">
  <nav class="test-nav">
    <h3>Straits</h3>
    <NuxtLink
      v-for="s in straits"
      :key="s.id"
      :to="`/test/${s.id}`"
      :class="{ active: config.id === s.id }"
    >
      {{ s.label }}
    </NuxtLink>
  </nav>

  <div class="test-center">
    <div class="canvas-wrap">
      <img
        :src="config.backgroundImage"
        width="1080"
        height="1080"
        alt=""
        class="bg-image"
      />
      <canvas ref="canvasRef" class="overlay" />
    </div>
    <div class="legend">
      <p><span class="swatch yellow" /> Boundary</p>
      <p><span class="swatch red" /> Islands</p>
      <p><span class="swatch green" /> Entry edge</p>
      <p><span class="swatch magenta" /> Exit edge</p>
      <p><span class="swatch cyan" /> Spine A</p>
      <p v-if="config.spines.length > 1"><span class="swatch orange" /> Spine B</p>
      <p><span class="swatch blue" /> Particles</p>
    </div>
  </div>

  <div ref="tweakpaneRef" class="test-controls" />
  </div>
</template>

<style scoped>
.test-layout {
  display: contents;
}

.test-nav {
  grid-row: 1 / 8;
  grid-column: 1 / 3;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  background: #111;
  z-index: 1;
}
.test-nav h3 {
  color: #888;
  font-family: monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 8px;
}
.test-nav a {
  color: #aaa;
  font-family: monospace;
  font-size: 14px;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}
.test-nav a:hover { background: #222; color: #fff; }
.test-nav a.active { background: #333; color: #fff; }

.test-center {
  grid-row: 1 / 8;
  grid-column: 3 / 11;
  background: #111;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  overflow: hidden;
}

.test-controls {
  grid-row: 1 / 8;
  grid-column: 11 / -1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px;
  background: #111;
  overflow-y: auto;
}

.canvas-wrap {
  position: relative;
  width: min(100%, 1080px);
  aspect-ratio: 1;
}

.bg-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.legend {
  color: #fff;
  font-family: monospace;
  font-size: 14px;
  display: flex;
  gap: 24px;
}
.legend p { display: flex; align-items: center; gap: 6px; margin: 0; }
.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 2px;
}
.swatch.yellow { background: rgba(255, 255, 0, 0.8); }
.swatch.red { background: rgba(255, 0, 0, 0.8); }
.swatch.green { background: rgba(0, 255, 0, 0.8); }
.swatch.magenta { background: rgba(255, 0, 255, 0.8); }
.swatch.cyan { background: rgba(0, 255, 255, 0.9); }
.swatch.orange { background: rgba(255, 165, 0, 0.9); }
.swatch.blue { background: hsl(218, 60%, 58%); }
</style>
