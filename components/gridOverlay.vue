<template>
  <div class="grid-overlay | master-grid">
    <div 
      v-for="i in 100" 
      :key="i"
      class="grid-overlay-item"
      :class="{ 'grid-overlay-item-active': activeItems.has(i - 1) }"
    ></div>
  </div>
</template>

<style lang="css" scoped>

.grid-overlay {
  mix-blend-mode: overlay;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  pointer-events: none;
}

.grid-overlay-item {
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
}

.grid-overlay-item:before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  width: 4px;
  height: 4px;
  border-left: 1px solid rgba(255, 255, 255, .2);
  border-top: 1px solid rgba(255, 255, 255, .2);
}

.grid-overlay-item:after {
  content: '';
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 4px;
  height: 4px;
  border-right: 1px solid rgba(255, 255, 255, .2);
  border-bottom: 1px solid rgba(255, 255, 255, .2);
}

.grid-overlay-item-active {
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.1));
  animation: fadeGradient 4s ease-in-out infinite alternate;

}

@keyframes fadeGradient {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

</style>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const gridSize = 10
const totalItems = 100
const activeItems = ref<Set<number>>(new Set())
const animationDuration = 8000 // 12 seconds total cycle (6s forward + 6s reverse)
let animationFrameId: number | null = null
let startTime: number | null = null
let isRunning = false

function isAdjacent(index1: number, index2: number): boolean {
  const row1 = Math.floor(index1 / gridSize)
  const col1 = index1 % gridSize
  const row2 = Math.floor(index2 / gridSize)
  const col2 = index2 % gridSize
  
  const rowDiff = Math.abs(row1 - row2)
  const colDiff = Math.abs(col1 - col2)
  
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)
}

function selectRandomActiveItems() {
  activeItems.value.clear()
  const selected: number[] = []
  const maxAttempts = 1000
  let attempts = 0
  
  while (selected.length < 4 && attempts < maxAttempts) {
    attempts++
    const randomIndex = Math.floor(Math.random() * totalItems)
    
    const isConsecutive = selected.some(selectedIndex => 
      isAdjacent(selectedIndex, randomIndex)
    )
    
    if (!selected.includes(randomIndex) && !isConsecutive) {
      selected.push(randomIndex)
    }
  }
  
  activeItems.value = new Set(selected)
}

function animate() {
  if (!isRunning) return
  
  const now = performance.now()
  
  if (startTime === null) {
    startTime = now
    selectRandomActiveItems()
  }
  
  const elapsed = now - startTime
  
  if (elapsed >= animationDuration) {
    selectRandomActiveItems()
    startTime = now
  }
  
  animationFrameId = requestAnimationFrame(animate)
}

onMounted(() => {
  isRunning = true
  startTime = null
  animate()
})

onUnmounted(() => {
  isRunning = false
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>