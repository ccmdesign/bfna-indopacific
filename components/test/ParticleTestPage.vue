<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { StraitFlowConfig } from '~/utils/particleEngine'
import { useParticleFlow } from '~/composables/useParticleFlow'
import { setupTweakpane } from '~/utils/particleTweakpane'

const props = defineProps<{
  config: StraitFlowConfig
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
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
    spineArrays: getSpineArrays(),
    onSpineChange: rebuildSpines,
    spawnZones: props.config.spawnZones,
  })
})

onUnmounted(() => {
  tweakpaneInstance?.dispose()
  stop()
})
</script>

<template>
  <div class="test-page">
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
</template>

<style scoped>
.test-page {
  background: #111;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 20px;
}

.canvas-wrap {
  position: relative;
  width: 1080px;
  height: 1080px;
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
