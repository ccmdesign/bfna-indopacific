<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Vector2, TextureLoader, ClampToEdgeWrapping } from 'three'
import type { Texture } from 'three'
import { useLoader } from '@tresjs/core'
import gsap from 'gsap'
import { straitToUV } from '~/composables/useLensCoordinates'
import type { Strait } from '~/types/strait'

const props = defineProps<{ strait: Strait }>()
const emit = defineEmits<{ (e: 'close'): void }>()

// --- Refs ---
const overlayRef = ref<HTMLElement>()
const backdropRef = ref<HTMLElement>()
const lensCircleRef = ref<HTMLElement>()
const closeButtonRef = ref<HTMLButtonElement>()

// --- Focus management ---
let previouslyFocusedElement: HTMLElement | null = null

// --- Shader source ---
const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
uniform sampler2D uMap;
uniform vec2 uCenter;
uniform float uZoom;

varying vec2 vUv;

void main() {
  vec2 fromCenter = vUv - 0.5;
  float dist = length(fromCenter) * 2.0;

  // Anti-aliased circle edge using smoothstep
  float alpha = 1.0 - smoothstep(0.98, 1.0, dist);
  if (alpha < 0.001) discard;

  // Map local coords to texture UV space, centered on strait
  vec2 uv = fromCenter / uZoom + uCenter;

  // Clamp to prevent sampling outside texture
  uv = clamp(uv, 0.0, 1.0);

  vec4 texColor = texture2D(uMap, uv);
  gl_FragColor = vec4(texColor.rgb, alpha);
}
`

// --- Uniforms (created once, mutated in-place to avoid GPU recompilation) ---
const uniforms = {
  uMap: { value: null as Texture | null },
  uCenter: { value: new Vector2() },
  uZoom: { value: 4.0 },
}

// --- Texture loading ---
const { state: texture } = useLoader(TextureLoader, '/assets/map-indo-pacific-2x.webp')

watch(texture, (tex) => {
  if (tex) {
    tex.wrapS = ClampToEdgeWrapping
    tex.wrapT = ClampToEdgeWrapping
    uniforms.uMap.value = tex
  }
})

// --- Update UV center when strait changes ---
watch(
  () => props.strait,
  (strait) => {
    const uv = straitToUV(strait.posX, strait.posY)
    uniforms.uCenter.value.set(uv.x, uv.y)
  },
  { immediate: true }
)

// --- Reduced motion ---
const prefersReducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

// --- GSAP context for cleanup ---
let ctx: gsap.Context
let isClosing = false

function close() {
  if (isClosing) return
  isClosing = true

  if (prefersReducedMotion) {
    previouslyFocusedElement?.focus()
    emit('close')
    return
  }

  ctx = gsap.context(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        previouslyFocusedElement?.focus()
        emit('close')
      },
    })
    tl.to(lensCircleRef.value, { scale: 0, duration: 0.4, ease: 'power2.in' })
    tl.to(backdropRef.value, { opacity: 0, duration: 0.4 }, 0)
  })
}

// --- Focus trap ---
function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab') return

  const focusable = overlayRef.value?.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  if (!focusable?.length) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

// --- Lifecycle ---
onMounted(() => {
  // Store previously focused element for focus return
  previouslyFocusedElement = document.activeElement as HTMLElement

  // Lock body scroll
  document.body.style.overflow = 'hidden'

  // Animate open
  if (prefersReducedMotion) {
    gsap.set(backdropRef.value, { opacity: 1 })
    gsap.set(lensCircleRef.value, { scale: 1, transformOrigin: '50% 50%' })
  } else {
    ctx = gsap.context(() => {
      const tl = gsap.timeline()
      tl.fromTo(
        backdropRef.value,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.inOut' }
      )
      tl.fromTo(
        lensCircleRef.value,
        { scale: 0, transformOrigin: '50% 50%' },
        { scale: 1, duration: 0.5, ease: 'power2.out' },
        0
      )
    })
  }

  // Focus the close button after open animation starts
  nextTick(() => {
    closeButtonRef.value?.focus()
  })
})

onUnmounted(() => {
  // Kill all GSAP animations
  ctx?.revert()

  // Restore body scroll
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="overlayRef"
      class="lens-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="`Zoomed view of ${strait.name}`"
      tabindex="-1"
      @keydown.esc="close"
      @keydown="trapFocus"
    >
      <!-- Dark backdrop -->
      <div
        ref="backdropRef"
        class="lens-backdrop"
        @click="close"
      />
      <!-- Lens circle -->
      <div ref="lensCircleRef" class="lens-circle">
        <TresCanvas :clear-color="'#0a1628'">
          <TresOrthographicCamera
            :position="[0, 0, 1]"
            :left="-1"
            :right="1"
            :top="1"
            :bottom="-1"
            :near="0"
            :far="2"
          />
          <TresMesh>
            <TresPlaneGeometry :args="[2, 2]" />
            <TresShaderMaterial
              :vertex-shader="vertexShader"
              :fragment-shader="fragmentShader"
              :uniforms="uniforms"
              :transparent="true"
            />
          </TresMesh>
        </TresCanvas>
      </div>
      <!-- Close button -->
      <button
        ref="closeButtonRef"
        class="lens-close-button"
        aria-label="Close zoom"
        @click="close"
      >
        &times;
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.lens-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lens-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
}

.lens-circle {
  position: relative;
  width: min(90vh, 90vw);
  height: min(90vh, 90vw);
  border-radius: 50%;
  overflow: hidden;
  z-index: 1;
  transform-origin: 50% 50%;
}

.lens-close-button {
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 2;
  font-size: 2rem;
  line-height: 1;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.lens-close-button:hover,
.lens-close-button:focus-visible {
  background: rgba(0, 0, 0, 0.8);
}

.lens-close-button:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .lens-close-button {
    transition: none;
  }
}
</style>
