<script setup lang="ts">
/**
 * StraitLens — Full-viewport lens overlay for a single strait.
 *
 * Renders a zoomed satellite background crop, a <canvas> placeholder
 * (for the particle system in BF-78), and a glassmorphism info panel
 * showing strait data. Teleported to <body> to avoid stacking context
 * issues in embed layouts.
 *
 * Accessibility: role="dialog", aria-modal, Escape to close, manual
 * focus trap, inert on background content.
 */
import type { Strait } from '~/types/strait'

const props = defineProps<{
  strait: Strait
}>()

const emit = defineEmits<{
  close: []
}>()

const backdropRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)

// --- Focus trap (manual, no external dependency) ---
// Traps Tab / Shift+Tab within the dialog's focusable elements.
function getFocusableElements(): HTMLElement[] {
  if (!backdropRef.value) return []
  return Array.from(
    backdropRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])',
    ),
  )
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
    return
  }

  if (e.key === 'Tab') {
    const focusable = getFocusableElements()
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }
}

// --- Inert management for background content ---
function setBackgroundInert(inert: boolean) {
  const bg = document.querySelector('[data-main-content]')
  if (inert) {
    bg?.setAttribute('inert', '')
  } else {
    bg?.removeAttribute('inert')
  }
}

// Expose the backdrop element so the parent / transition composable
// can target it for GSAP opacity + scale animation.
defineExpose({ backdropRef })

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  setBackgroundInert(true)
  nextTick(() => {
    closeButtonRef.value?.focus()
  })
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  setBackgroundInert(false)
})

// --- Backdrop click (close when clicking outside content) ---
function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

// --- Lens background: zoomed crop of satellite image ---
const lensBackgroundStyle = computed(() => ({
  backgroundImage: `url(/assets/map-indo-pacific-2x.webp)`,
  backgroundSize: '300%',
  backgroundPosition: `${props.strait.posX}% ${props.strait.posY}%`,
}))
</script>

<template>
  <Teleport to="body">
    <div
      ref="backdropRef"
      class="lens-backdrop"
      role="dialog"
      aria-modal="true"
      :aria-label="`${strait.name} detail view`"
      @click="onBackdropClick"
    >
      <!-- Zoomed satellite background crop -->
      <div class="lens-bg" :style="lensBackgroundStyle" />

      <!-- Canvas placeholder for particle system (BF-78) -->
      <canvas class="lens-canvas" aria-hidden="true" />

      <!-- Info panel -->
      <aside class="lens-info-panel">
        <h2 class="lens-title">{{ strait.name }}</h2>
        <p class="lens-share-label">{{ strait.globalShareLabel }}</p>
        <p class="lens-description">{{ strait.description }}</p>

        <div v-if="strait.keyFacts.length" class="lens-facts">
          <h3>Key Facts</h3>
          <ul>
            <li v-for="fact in strait.keyFacts" :key="fact">{{ fact }}</li>
          </ul>
        </div>

        <div v-if="strait.threats.length" class="lens-threats">
          <h3>Threats</h3>
          <ul>
            <li v-for="threat in strait.threats" :key="threat">{{ threat }}</li>
          </ul>
        </div>
      </aside>

      <!-- Close button -->
      <button
        ref="closeButtonRef"
        class="lens-close-btn"
        aria-label="Close detail view"
        @click="emit('close')"
      >
        &times;
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.lens-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  /* Start invisible — GSAP controls opacity */
  opacity: 0;
  will-change: opacity, transform;
}

.lens-bg {
  position: absolute;
  inset: 0;
  background-repeat: no-repeat;
  opacity: 0.35;
  pointer-events: none;
}

.lens-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* --- Glassmorphism info panel --- */
.lens-info-panel {
  position: absolute;
  right: 2rem;
  top: 50%;
  transform: translateY(-50%);
  width: 360px;
  max-height: 80vh;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 2rem;
  background: rgba(10, 22, 40, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Encode Sans', sans-serif;
  z-index: 2;
}

.lens-title {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
}

.lens-share-label {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.lens-description {
  margin: 0 0 1.5rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
}

.lens-facts,
.lens-threats {
  margin-bottom: 1.25rem;
}

.lens-facts h3,
.lens-threats h3 {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.5);
}

.lens-facts ul,
.lens-threats ul {
  margin: 0;
  padding-left: 1.25rem;
  list-style: disc;
}

.lens-facts li,
.lens-threats li {
  margin-bottom: 0.35rem;
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.8);
}

/* --- Close button --- */
.lens-close-btn {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  background: rgba(10, 22, 40, 0.5);
  color: #fff;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
  z-index: 3;
}

.lens-close-btn:hover {
  transform: scale(1.1);
  background: rgba(10, 22, 40, 0.8);
}

.lens-close-btn:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

/* --- Responsive: stack panel below on narrow viewports --- */
@media (max-width: 720px) {
  .lens-info-panel {
    position: absolute;
    right: 0;
    left: 0;
    bottom: 0;
    top: auto;
    transform: none;
    width: 100%;
    max-height: 50vh;
    border-radius: 12px 12px 0 0;
    padding: 1.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lens-close-btn {
    transition: none;
  }
}
</style>
