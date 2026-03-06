/**
 * Vertex and fragment shaders for the strait lens zoom effect.
 *
 * Extracted from StraitLensZoom.vue for syntax clarity and reuse.
 * When vite-plugin-glsl is added, these can be migrated to .vert/.frag files
 * with full GLSL editor support.
 */

export const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const fragmentShader = /* glsl */ `
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
