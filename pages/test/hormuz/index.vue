<script setup lang="ts">
import { ref, onMounted } from 'vue'
import polygonData from '~/data/straits/hormuz-polygon.json'

const SIZE = 1080
const canvasRef = ref<HTMLCanvasElement | null>(null)

const polygon = polygonData as unknown as {
  boundary: [number, number][]
  islands: [number, number][][]
  entryEdge: [number, number][]
  exitEdge: [number, number][]
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  function drawPolyline(pts: [number, number][]) {
    if (pts.length === 0) return
    ctx!.moveTo(pts[0]![0], pts[0]![1])
    for (let i = 1; i < pts.length; i++) ctx!.lineTo(pts[i]![0], pts[i]![1])
  }

  function centroid(pts: [number, number][]) {
    let sx = 0, sy = 0
    for (const p of pts) { sx += p[0]; sy += p[1] }
    return { x: sx / pts.length, y: sy / pts.length }
  }

  // Boundary polygon (yellow fill, semi-transparent)
  ctx.fillStyle = 'rgba(255, 255, 0, 0.25)'
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)'
  ctx.lineWidth = 2
  ctx.beginPath()
  drawPolyline(polygon.boundary)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Islands (red)
  ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)'
  ctx.lineWidth = 2
  for (const island of polygon.islands) {
    ctx.beginPath()
    drawPolyline(island)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  // Entry edge (green, thick)
  ctx.strokeStyle = 'rgba(0, 255, 0, 1)'
  ctx.lineWidth = 4
  ctx.beginPath()
  drawPolyline(polygon.entryEdge)
  ctx.stroke()

  // Exit edge (magenta, thick)
  ctx.strokeStyle = 'rgba(255, 0, 255, 1)'
  ctx.lineWidth = 4
  ctx.beginPath()
  drawPolyline(polygon.exitEdge)
  ctx.stroke()

  // Centroids
  const ec = centroid(polygon.entryEdge)
  const xc = centroid(polygon.exitEdge)

  ctx.fillStyle = 'rgba(0, 255, 0, 1)'
  ctx.beginPath()
  ctx.arc(ec.x, ec.y, 8, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255, 0, 255, 1)'
  ctx.beginPath()
  ctx.arc(xc.x, xc.y, 8, 0, Math.PI * 2)
  ctx.fill()
})
</script>

<template>
  <div class="test-page">
    <div class="canvas-wrap">
      <img
        src="/assets/images/straits/hormuz.jpg"
        :width="SIZE"
        :height="SIZE"
        alt="Hormuz satellite"
        class="bg-image"
      />
      <canvas ref="canvasRef" class="overlay" />
    </div>
    <div class="legend">
      <p><span class="swatch yellow" /> Boundary (water area)</p>
      <p><span class="swatch red" /> Islands (exclusion)</p>
      <p><span class="swatch green" /> Entry edge (spawn)</p>
      <p><span class="swatch magenta" /> Exit edge (vanish)</p>
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
</style>
