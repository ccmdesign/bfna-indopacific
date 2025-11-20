<template>
  <div class="grid-counter" :class="variant">
    {{ count.toString().padStart(2, '0') }}
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

defineProps<{
  variant: 'before' | 'after'
}>()

const count = ref(99)
let intervalId: number | null = null

onMounted(() => {
  intervalId = window.setInterval(() => {
    if (count.value > 0) {
      count.value--
    } else {
      if (intervalId) clearInterval(intervalId)
    }
  }, 80) // 80ms * 100 = 8 seconds
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<style scoped>
.grid-counter {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.5);
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-family: monospace;
  line-height: 1;
  pointer-events: none;
}

.grid-counter.before {
  animation: 
    moveRight 8s linear forwards,
    fade 8s forwards;
}

.grid-counter.after {
  animation: 
    moveLeft 8s linear forwards,
    fade 8s forwards;
}

@keyframes moveRight {
  0% { left: 75%; }
  100% { left: 100%; }
}

@keyframes moveLeft {
  0% { left: 25%; }
  100% { left: 0%; }
}

@keyframes fade {
  0% { 
    opacity: 0; 
    animation-timing-function: ease-out;
  }
  10% { 
    opacity: 1; 
    animation-timing-function: linear;
  }
  50% { 
    opacity: 1; 
    animation-timing-function: ease-in-out;
  }
  100% { 
    opacity: 0; 
  }
}
</style>
