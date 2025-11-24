<template>
  <div v-if="isVisible" class="rotate-overlay">
    <h1 class="overlay-title">Indo Pacífic Project</h1>
    <div class="center-content">
      <div class="phone-animation"></div>
      <p class="message">Please rotate your device</p>
    </div>
    <img src="@/assets/images/bfna.svg" alt="BFNA Logo" class="overlay-logo" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isVisible = ref(false)

const checkOrientation = () => {
  // Basic mobile detection based on user agent
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  // Check if screen is portrait
  const isPortrait = window.innerHeight > window.innerWidth
  
  // Only show if mobile AND portrait
  isVisible.value = isMobile && isPortrait
}

onMounted(() => {
  checkOrientation()
  window.addEventListener('resize', checkOrientation)
  window.addEventListener('orientationchange', checkOrientation)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkOrientation)
  window.removeEventListener('orientationchange', checkOrientation)
})
</script>

<style scoped>
.rotate-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #022640;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.overlay-title {
  position: absolute;
  top: 3rem;
  left: 0;
  width: 100%;
  text-align: center;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: 0.5px;
}

.center-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.overlay-logo {
  position: absolute;
  bottom: 3rem;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  opacity: 0.9;
}

.phone-animation {
  width: 50px;
  height: 80px;
  border: 3px solid white;
  border-radius: 8px;
  position: relative;
  animation: rotatePhone 2.5s infinite ease-in-out;
  margin-bottom: 1.5rem;
}

/* Home button indicator */
.phone-animation::after {
  content: '';
  position: absolute;
  bottom: 5px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.5);
}

.message {
  font-size: 1.2rem;
  font-weight: 300;
  text-align: center;
  letter-spacing: 1px;
}

@keyframes rotatePhone {
  0% {
    transform: rotate(0deg);
    opacity: 1;
  }
  25% {
    transform: rotate(90deg);
    opacity: 1;
  }
  70% {
    transform: rotate(90deg);
    opacity: 1;
  }
  80% {
    opacity: 0;
  }
  100% {
    transform: rotate(0deg);
    opacity: 0;
  }
}
</style>
