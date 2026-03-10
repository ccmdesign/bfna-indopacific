<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { StraitFlowConfig } from '~/utils/particleEngine'
import { useParticleFlow } from '~/composables/useParticleFlow'

const props = withDefaults(defineProps<{
  config: StraitFlowConfig
  debug?: boolean
}>(), {
  debug: false,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const tweakpaneRef = ref<HTMLDivElement | null>(null)
const isDebug = computed(() => props.debug)

const { params, start, stop, getSpineArrays, rebuildSpines } = useParticleFlow({
  canvasRef,
  config: props.config,
  debug: isDebug,
})

let tweakpaneInstance: { pane: any; dispose: () => void } | null = null

onMounted(async () => {
  if (!props.debug || !import.meta.dev) return
  const { setupTweakpane } = await import('~/utils/particleTweakpane')
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
  <!-- Debug mode: full-page layout with nav, canvas, tweakpane -->
  <div v-if="debug" class="debug-layout">
    <nav class="debug-nav">
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

    <div class="debug-center">
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

    <div ref="tweakpaneRef" class="debug-controls" />
  </div>

  <!-- Production mode: just the canvas wrap, circle-masked -->
  <div v-else class="canvas-wrap">
    <img
      :src="config.backgroundImage"
      width="1080"
      height="1080"
      alt=""
      aria-hidden="true"
      class="bg-image"
    />
    <canvas ref="canvasRef" class="overlay" />
  </div>
</template>

<style scoped>
/* ---- Shared: canvas wrap (used in both modes) ---- */
.canvas-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  overflow: hidden;
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

/* ---- Debug mode ---- */
.debug-layout {
  display: contents;
}

.debug-nav {
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
.debug-nav h3 {
  color: #888;
  font-family: monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 8px;
}
.debug-nav a {
  color: #aaa;
  font-family: monospace;
  font-size: 14px;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}
.debug-nav a:hover { background: #222; color: #fff; }
.debug-nav a.active { background: #333; color: #fff; }

.debug-center {
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

.debug-center .canvas-wrap {
  width: min(100%, 1080px);
  border-radius: 0;
  overflow: visible;
}

.debug-controls {
  grid-row: 1 / 8;
  grid-column: 11 / -1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px;
  background: #111;
  overflow-y: auto;
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
