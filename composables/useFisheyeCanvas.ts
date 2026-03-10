/**
 * useFisheyeCanvas — WebGL barrel distortion shader composable.
 *
 * Renders a satellite image through a fisheye/barrel distortion fragment shader
 * on a <canvas> element, creating a magnifying-glass lens effect.
 *
 * Features:
 * - WebGL2 with WebGL1 fallback
 * - Barrel distortion with cubic radial warping
 * - Chromatic aberration at edges (radial RGB split)
 * - Rim darkening (natural light falloff)
 * - Anti-aliased circle edge via smoothstep
 * - HiDPI canvas sizing via ResizeObserver (devicePixelContentBoxSize when available)
 * - WebGL context loss/restore handling
 * - SSR/SSG safe (all browser APIs gated behind onMounted)
 * - Stale texture load guard for rapid image switching
 */

import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'

// ---------------------------------------------------------------------------
// Shader sources
// ---------------------------------------------------------------------------

const VERT_SOURCE_V2 = `#version 300 es
precision mediump float;
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAG_SOURCE_V2 = `#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uMap;
uniform float uDistortion;
uniform float uAberration;
uniform float uStrength;
uniform float uSpecular;
uniform float uVignette;
void main() {
  vec2 fromCenter = vUv - 0.5;
  float r = length(fromCenter) * 2.0;

  // Anti-aliased circular clip via alpha
  float circleMask = 1.0 - smoothstep(0.98, 1.0, r);
  if (circleMask <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }

  // Cubic barrel distortion — modulated by uStrength
  float distortionAmount = 1.0 + (uDistortion * uStrength) * r * r * r;
  vec2 distortedUV = clamp(fromCenter * distortionAmount + 0.5, 0.0, 1.0);

  // Chromatic aberration — radial RGB split, modulated by uStrength
  float aberration = (uAberration * uStrength) * r * r;
  vec2 abDir = length(fromCenter) > 0.001 ? normalize(fromCenter) * aberration : vec2(0.0);
  vec2 abR = clamp(distortedUV + abDir, 0.0, 1.0);
  vec2 abB = clamp(distortedUV - abDir, 0.0, 1.0);

  // Flip texture vertically to match image orientation
  vec2 fDistorted = vec2(distortedUV.x, 1.0 - distortedUV.y);
  vec2 fAbR = vec2(abR.x, 1.0 - abR.y);
  vec2 fAbB = vec2(abB.x, 1.0 - abB.y);

  vec4 color;
  color.r = textureLod(uMap, fAbR, 0.0).r;
  color.g = textureLod(uMap, fDistorted, 0.0).g;
  color.b = textureLod(uMap, fAbB, 0.0).b;

  // Vignette — edge darkening (replaces static rim darkening)
  float vignette = 1.0 - uVignette * uStrength * r * r;
  color.rgb *= max(vignette, 0.0);

  // Specular highlight — arc in upper-right quadrant simulating light on glass
  // vec2(0.15, 0.2) — offset of specular center from circle center (upper-right bias)
  // 0.2 — radius of the specular arc ring
  // 80.0 — sharpness of the arc (higher = thinner ring)
  // smoothstep(1.0, 0.7, r) — fade specular toward the edge (starts fading at r=0.7)
  vec2 specPos = fromCenter - vec2(0.15, 0.2);
  float specDist = length(specPos);
  float arcShape = exp(-pow(specDist - 0.2, 2.0) * 80.0);
  float specular = uSpecular * uStrength * arcShape * smoothstep(1.0, 0.7, r);
  color.rgb += vec3(specular);

  // Apply circular mask via alpha
  color.a = circleMask;
  fragColor = color;
}
`

const VERT_SOURCE_V1 = `
precision mediump float;
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAG_SOURCE_V1 = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uMap;
uniform float uDistortion;
uniform float uAberration;
uniform float uStrength;
uniform float uSpecular;
uniform float uVignette;
void main() {
  vec2 fromCenter = vUv - 0.5;
  float r = length(fromCenter) * 2.0;

  float circleMask = 1.0 - smoothstep(0.98, 1.0, r);
  if (circleMask <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float distortionAmount = 1.0 + (uDistortion * uStrength) * r * r * r;
  vec2 distortedUV = clamp(fromCenter * distortionAmount + 0.5, 0.0, 1.0);

  float aberration = (uAberration * uStrength) * r * r;
  vec2 abDir = length(fromCenter) > 0.001 ? normalize(fromCenter) * aberration : vec2(0.0);
  vec2 abR = clamp(distortedUV + abDir, 0.0, 1.0);
  vec2 abB = clamp(distortedUV - abDir, 0.0, 1.0);

  // Flip texture vertically to match image orientation
  vec2 fDistorted = vec2(distortedUV.x, 1.0 - distortedUV.y);
  vec2 fAbR = vec2(abR.x, 1.0 - abR.y);
  vec2 fAbB = vec2(abB.x, 1.0 - abB.y);

  vec4 color;
  color.r = texture2D(uMap, fAbR).r;
  color.g = texture2D(uMap, fDistorted).g;
  color.b = texture2D(uMap, fAbB).b;

  float vignette = 1.0 - uVignette * uStrength * r * r;
  color.rgb *= max(vignette, 0.0);

  // Specular highlight — see FRAG_SOURCE_V2 for constant documentation
  vec2 specPos = fromCenter - vec2(0.15, 0.2);
  float specDist = length(specPos);
  float arcShape = exp(-pow(specDist - 0.2, 2.0) * 80.0);
  float specular = uSpecular * uStrength * arcShape * smoothstep(1.0, 0.7, r);
  color.rgb += vec3(specular);

  color.a = circleMask;
  gl_FragColor = color;
}
`

// ---------------------------------------------------------------------------
// Fullscreen quad geometry (two triangles covering clip space)
// ---------------------------------------------------------------------------

const QUAD_VERTICES = new Float32Array([
  -1, -1,
   1, -1,
  -1,  1,
  -1,  1,
   1, -1,
   1,  1,
])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compileShader(
  gl: WebGL2RenderingContext | WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (import.meta.dev) {
      console.warn('[useFisheyeCanvas] Shader compile error:', gl.getShaderInfoLog(shader))
    }
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function linkProgram(
  gl: WebGL2RenderingContext | WebGLRenderingContext,
  vert: WebGLShader,
  frag: WebGLShader,
): WebGLProgram | null {
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (import.meta.dev) {
      console.warn('[useFisheyeCanvas] Program link error:', gl.getProgramInfoLog(program))
    }
    gl.deleteProgram(program)
    return null
  }
  return program
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * WebGL context note: Each FisheyeLens instance creates its own WebGL context.
 * This is safe because StraitMap enforces single-strait selection, so at most
 * 1 FisheyeLens + 1 StraitParticles (2D) context exist simultaneously.
 * If the selection model ever allows multiple simultaneous selections,
 * this should be refactored to share a single WebGL context. (See todo #134)
 */
export interface FisheyeOptions {
  canvasRef: Ref<HTMLCanvasElement | null>
  imageUrl: Ref<string | undefined>
  distortion: Ref<number>
  aberration: Ref<number>
  strength: Ref<number>
  specular?: Ref<number>
  vignette?: Ref<number>
}

export function useFisheyeCanvas(options: FisheyeOptions) {
  const { canvasRef, imageUrl, distortion, aberration, strength, specular, vignette } = options
  const webglAvailable = ref(false)
  const textureLoaded = ref(false)

  // Internal state — only populated client-side inside onMounted
  let gl: WebGL2RenderingContext | WebGLRenderingContext | null = null
  let isWebGL2 = false
  let program: WebGLProgram | null = null
  let vbo: WebGLBuffer | null = null
  let texture: WebGLTexture | null = null
  let uMapLoc: WebGLUniformLocation | null = null
  let uDistortionLoc: WebGLUniformLocation | null = null
  let uAberrationLoc: WebGLUniformLocation | null = null
  let uStrengthLoc: WebGLUniformLocation | null = null
  let uSpecularLoc: WebGLUniformLocation | null = null
  let uVignetteLoc: WebGLUniformLocation | null = null
  let aPositionLoc = -1
  let ro: ResizeObserver | null = null
  let resizeRafId: number | null = null
  let currentLoadId = 0
  let contextLost = false
  let currentImageUrl: string | undefined

  // -----------------------------------------------------------------------
  // Init / teardown helpers
  // -----------------------------------------------------------------------

  function initGL(): boolean {
    const canvas = canvasRef.value
    if (!canvas) return false

    // Try WebGL2, then WebGL1
    gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false }) as WebGL2RenderingContext | null
    if (gl) {
      isWebGL2 = true
    } else {
      gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) as WebGLRenderingContext | null
      isWebGL2 = false
    }

    if (!gl) return false
    return true
  }

  function initShaderProgram(): boolean {
    if (!gl) return false

    const vertSource = isWebGL2 ? VERT_SOURCE_V2 : VERT_SOURCE_V1
    const fragSource = isWebGL2 ? FRAG_SOURCE_V2 : FRAG_SOURCE_V1

    const vert = compileShader(gl, gl.VERTEX_SHADER, vertSource)
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSource)
    if (!vert || !frag) return false

    program = linkProgram(gl, vert, frag)
    // Shaders can be deleted after linking
    gl.deleteShader(vert)
    gl.deleteShader(frag)
    if (!program) return false

    // Look up locations
    aPositionLoc = gl.getAttribLocation(program, 'aPosition')
    uMapLoc = gl.getUniformLocation(program, 'uMap')
    uDistortionLoc = gl.getUniformLocation(program, 'uDistortion')
    uAberrationLoc = gl.getUniformLocation(program, 'uAberration')
    uStrengthLoc = gl.getUniformLocation(program, 'uStrength')
    uSpecularLoc = gl.getUniformLocation(program, 'uSpecular')
    uVignetteLoc = gl.getUniformLocation(program, 'uVignette')

    // Create VBO for fullscreen quad
    vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW)

    // Create texture
    texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    // Set texture params (NPOT-safe for WebGL1)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    // Enable alpha blending
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    return true
  }

  function render() {
    if (!gl || !program || contextLost) return

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(program)

    // Bind texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(uMapLoc, 0)

    // Set uniforms
    gl.uniform1f(uDistortionLoc, distortion.value)
    gl.uniform1f(uAberrationLoc, aberration.value)
    gl.uniform1f(uStrengthLoc, strength.value)
    gl.uniform1f(uSpecularLoc, specular?.value ?? 0.6)
    gl.uniform1f(uVignetteLoc, vignette?.value ?? 0.8)

    // Bind VBO and set attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.enableVertexAttribArray(aPositionLoc)
    gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0)

    // Draw fullscreen quad
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  function loadTexture(url: string) {
    if (!gl || contextLost) return
    const loadId = ++currentLoadId
    currentImageUrl = url

    // Use createImageBitmap for off-thread decoding when available
    if (typeof createImageBitmap !== 'undefined') {
      fetch(url)
        .then((res) => res.blob())
        .then((blob) => createImageBitmap(blob))
        .then((bitmap) => {
          if (loadId !== currentLoadId || !gl || contextLost) {
            bitmap.close()
            return
          }
          gl.bindTexture(gl.TEXTURE_2D, texture)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap)
          bitmap.close()
          textureLoaded.value = true
          render()
        })
        .catch(() => {
          // Texture load failed (network error, 404, CORS) — signal parent to show fallback
          textureLoaded.value = false
        })
    } else {
      // Fallback: Image element
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        if (loadId !== currentLoadId || !gl || contextLost) return
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
        textureLoaded.value = true
        render()
      }
      img.onerror = () => {
        // Texture load failed — signal parent to show fallback
        textureLoaded.value = false
      }
      img.src = url
    }
  }

  function syncCanvasSize(canvas: HTMLCanvasElement, width: number, height: number) {
    const maxDim = 2048
    canvas.width = Math.min(Math.round(width), maxDim)
    canvas.height = Math.min(Math.round(height), maxDim)
    if (gl && !contextLost) {
      gl.viewport(0, 0, canvas.width, canvas.height)
      render()
    }
  }

  function setupResizeObserver() {
    const canvas = canvasRef.value
    if (!canvas) return

    ro = new ResizeObserver((entries) => {
      if (resizeRafId !== null) return
      resizeRafId = requestAnimationFrame(() => {
        resizeRafId = null
        for (const entry of entries) {
          let width: number
          let height: number
          if ((entry as any).devicePixelContentBoxSize?.[0]) {
            width = (entry as any).devicePixelContentBoxSize[0].inlineSize
            height = (entry as any).devicePixelContentBoxSize[0].blockSize
          } else if (entry.contentBoxSize?.[0]) {
            const dpr = window.devicePixelRatio || 1
            width = Math.round(entry.contentBoxSize[0].inlineSize * dpr)
            height = Math.round(entry.contentBoxSize[0].blockSize * dpr)
          } else {
            const dpr = window.devicePixelRatio || 1
            width = Math.round(entry.contentRect.width * dpr)
            height = Math.round(entry.contentRect.height * dpr)
          }
          syncCanvasSize(canvas, width, height)
        }
      })
    })

    // Observe with devicePixelContentBox when supported
    try {
      ro.observe(canvas, { box: 'device-pixel-content-box' as any })
    } catch {
      ro.observe(canvas)
    }
  }

  // -----------------------------------------------------------------------
  // Context loss/restore handlers
  // -----------------------------------------------------------------------

  function onContextLost(e: Event) {
    e.preventDefault()
    contextLost = true
    if (resizeRafId !== null) {
      cancelAnimationFrame(resizeRafId)
      resizeRafId = null
    }
  }

  function onContextRestored() {
    contextLost = false
    // Re-create all GL resources
    if (initShaderProgram() && currentImageUrl) {
      loadTexture(currentImageUrl)
    }
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  function cleanup() {
    // Invalidate pending loads
    currentLoadId = Number.MAX_SAFE_INTEGER

    // Disconnect resize observer
    if (ro) {
      ro.disconnect()
      ro = null
    }

    if (resizeRafId !== null) {
      cancelAnimationFrame(resizeRafId)
      resizeRafId = null
    }

    const canvas = canvasRef.value
    if (canvas) {
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
    }

    if (gl) {
      if (texture) gl.deleteTexture(texture)
      if (vbo) gl.deleteBuffer(vbo)
      if (program) gl.deleteProgram(program)

      // Eagerly free GPU resources
      const loseCtx = gl.getExtension('WEBGL_lose_context')
      if (loseCtx) loseCtx.loseContext()

      gl = null
      program = null
      vbo = null
      texture = null
    }
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  onMounted(() => {
    const canvas = canvasRef.value
    if (!canvas) return

    // Context loss/restore listeners
    canvas.addEventListener('webglcontextlost', onContextLost)
    canvas.addEventListener('webglcontextrestored', onContextRestored)

    if (!initGL()) {
      webglAvailable.value = false
      return
    }

    if (!initShaderProgram()) {
      webglAvailable.value = false
      return
    }

    webglAvailable.value = true
    setupResizeObserver()

    // Load initial texture if imageUrl is already set
    if (imageUrl.value) {
      loadTexture(imageUrl.value)
    }
  })

  // Watch for imageUrl changes
  watch(imageUrl, (newUrl) => {
    if (!newUrl || !gl || contextLost) return
    loadTexture(newUrl)
  })

  // Watch for uniform changes to re-render
  const watchSources: Ref<number>[] = [distortion, aberration, strength]
  if (specular) watchSources.push(specular)
  if (vignette) watchSources.push(vignette)
  watch(watchSources, () => {
    render()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    webglAvailable,
    textureLoaded,
    render,
  }
}
