# Spec: 3D Lens Distortion Zoom (Straits Map)

**Date:** 2026-03-06
**Status:** Draft
**Related:** [Circle + Lens Brainstorm](../docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md)

## Concept

When a user clicks a strait circle, a **circular lens** appears centered in the viewport, showing a 4x zoomed view of that strait. The lens is a **1:1 circle sized at 90vh**, rendered via TresJS with a **barrel distortion shader** at its edges — creating the effect of looking through a physical magnifying glass. Everything outside the lens circle gets a dark overlay treatment, focusing attention on the zoomed content.

## How It Works

**Three visual layers when lens is active:**

1. **Background** — The original map, still visible but darkened (CSS overlay or opacity)
2. **Lens circle** — A `<TresCanvas>` rendering a circular viewport with the 4x zoomed map + barrel distortion at the edges
3. **Dark surround** — Everything outside the lens circle is darkened (`rgba(0,0,0,0.7)` or similar), achieved via a CSS mask or a second shader pass

**Lens geometry:**

- The lens is a perfect circle: `width: 90vh; height: 90vh`
- Centered in the viewport: `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)`
- The TresCanvas is clipped to this circle (either via CSS `border-radius: 50%; overflow: hidden` on the container, or via the shader discarding fragments outside the circle)

**Zoom sequence:**

1. User clicks a circle (e.g. Malacca at `posX: 60.1, posY: 56.8`)
2. Calculate the **center point** as normalized UV coordinates from the strait's position percentages:
   - `uCenter = vec2(posX / 100, 1.0 - posY / 100)` (flip Y for GL)
3. Pre-load the satellite image as a Three.js texture (same `/assets/map-indo-pacific-2x.webp`)
4. Mount the lens overlay: dark surround fades in, TresCanvas circle appears at viewport center
5. Inside the lens, the shader:
   - Samples the map texture at UVs centered on the strait, scaled 4x
   - Applies barrel distortion that increases toward the circle's edge
   - The center of the lens shows a sharp, undistorted 4x view
   - The outer ~15-20% of the circle radius warps outward, creating the glass-lens feel
6. The distortion creates visual continuity between the zoomed content and the dark surround — the map "bends" at the lens edge rather than having a hard crop

**Zoom-out:** Lens circle scales down to 0 (or shrinks back to the original circle position), dark surround fades out, original map is revealed unchanged.

## Shader: Barrel Lens Distortion

A custom `ShaderMaterial` on a circular plane (or a full quad with circular discard):

```glsl
// Fragment shader
uniform sampler2D uMap;        // satellite image texture
uniform vec2 uCenter;          // normalized UV center of the strait (0-1)
uniform float uZoom;           // 1.0 to 4.0
uniform float uDistortion;     // 0.0 to ~0.4 (barrel strength)

varying vec2 vUv;

void main() {
  // Distance from center of the lens circle (vUv is 0-1 across the quad)
  vec2 fromCenter = vUv - 0.5;
  float dist = length(fromCenter) * 2.0; // 0.0 at center, 1.0 at edge

  // Discard fragments outside the circle
  if (dist > 1.0) discard;

  // Barrel distortion: warp increases with distance from center
  // Normalized radius within the circle (0 to 1)
  float r = dist;
  float distortionAmount = 1.0 + uDistortion * r * r;
  vec2 distortedUV = fromCenter * distortionAmount;

  // Map distorted local coords to texture UV space
  vec2 uv = distortedUV / uZoom + uCenter;

  // Clamp to avoid sampling outside texture
  uv = clamp(uv, 0.0, 1.0);

  // Subtle darkening at the very edge of the lens (glass rim feel)
  float rimDarken = smoothstep(1.0, 0.85, r);

  // Chromatic aberration at the edge (optional, adds realism)
  float aberration = uDistortion * r * r * 0.003;
  vec4 color;
  color.r = texture2D(uMap, uv + vec2(aberration, 0.0)).r;
  color.g = texture2D(uMap, uv).g;
  color.b = texture2D(uMap, uv - vec2(aberration, 0.0)).b;
  color.a = 1.0;

  color.rgb *= rimDarken;

  gl_FragColor = color;
}
```

**Key shader behaviors:**
- Fragments outside the circle radius are discarded (transparent)
- Center ~80% of the lens: sharp, undistorted 4x zoom
- Outer ~20%: progressive barrel warp bending the image outward
- Optional chromatic aberration at the rim for a physical glass feel
- Rim darkening simulates the light falloff of a real lens

## Component Architecture

```
StraitsInfographic.vue              (display: contents -- unchanged)
|-- StraitMap.vue                    (existing SVG+IMG -- always rendered, darkened when lens active)
`-- StraitLensZoom.vue               (NEW -- Teleport to body, position:fixed)
    |-- .lens-backdrop               (position:fixed, inset:0, background: rgba(0,0,0,0.7))
    |-- .lens-circle                 (90vh x 90vh, centered, border-radius:50%, overflow:hidden)
    |   `-- <TresCanvas>
    |       `-- Full-screen quad with circular ShaderMaterial
    |-- .lens-info-panel             (positioned adjacent to lens circle)
    `-- .lens-close-button           (top-right corner or outside lens)
```

**Critical grid constraint:** `StraitLensZoom.vue` uses `<Teleport to="body">` so it sits **outside** the master grid entirely. It must NOT interfere with `display: contents` on `.straits-infographic`.

**Dark surround implementation:** The `.lens-backdrop` is a full-viewport fixed overlay at `rgba(0,0,0,0.7)`. The `.lens-circle` sits on top of it. Clicking the backdrop triggers close.

## Dependencies

| Package | Purpose |
|---------|---------|
| `@tresjs/core` | Vue 3 bindings for Three.js |
| `three` | WebGL renderer, ShaderMaterial, PlaneGeometry |

No additional deps needed. GSAP (already installed) handles the animation timeline for uniform interpolation.

## Data Flow

1. `StraitMap.vue` emits `select-strait` with the strait `id` (already wired)
2. `StraitsInfographic.vue` sets `selectedStrait` ref
3. `StraitLensZoom.vue` receives the strait object as a prop, reads `posX`/`posY` to compute `uCenter`
4. On close, `selectedStrait` resets to `null`, lens unmounts

## Animation Timeline (GSAP)

**Open (click circle):**

```
t=0ms    -> Backdrop opacity: 0 -> 0.7 (fade in dark surround)
           Lens circle scale: 0 -> 1.0 (grows from strait's screen position to viewport center)
           uZoom: 4.0 (already at final zoom — the lens "reveals" the zoomed content)
           uDistortion: 0.4 -> 0.2 (starts exaggerated, settles to resting)
t=500ms  -> Lens circle at full size (90vh), backdrop fully dark
t=600ms  -> uDistortion settled at 0.2, chromatic aberration at resting value
t=700ms  -> Info panel fades in alongside lens
```

**Close (click backdrop or close button):**

```
t=0ms    -> Info panel fades out
t=100ms  -> Lens circle scale: 1.0 -> 0 (shrinks back toward strait position)
           Backdrop opacity: 0.7 -> 0
           uDistortion: 0.2 -> 0.5 (exaggerates as lens "collapses")
t=500ms  -> Lens fully gone, backdrop transparent, original map visible
```

Total open duration: ~700ms. Total close: ~500ms. `ease: "power2.inOut"`.

## Edge Cases

- **Strait near map edge** (e.g. Hormuz at `posX: 25.1, posY: 23.2`): Clamp UV sampling so it doesn't read outside texture bounds. Use `clamp-to-edge` wrapping on the texture.
- **Resize during zoom**: Recalculate canvas size and re-center. TresJS handles renderer resize automatically.
- **Reduced motion**: Skip distortion animation, instant cut to zoomed view.
- **WebGL unavailable**: Fallback to CSS `transform: scale(4) translate(...)` without distortion effect.

## Out of Scope

- Particle flow animation inside the lens (separate feature, layered on top later)
- Year slider / metric toggle interactions while zoomed
- Mobile card-stack alternative layout
- SVG circle overlay on the zoomed view
