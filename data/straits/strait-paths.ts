/**
 * Bezier path definitions for each strait's shipping lane.
 *
 * Coordinates are normalized (0-1) relative to the map image (2400x1350).
 * Paths extend ~20-30 % beyond the visible clip circle so particles enter
 * and exit smoothly rather than spawning/vanishing at the edge.
 *
 * These are initial estimates based on strait positions from straits.json
 * and geographic orientation. They should be visually calibrated against
 * the map image during QA.
 */

import type { StraitPath } from '~/types/strait'

const straitPaths: Record<string, StraitPath> = {
  // Malacca — NW-SE diagonal, slight curve
  malacca: {
    points: [
      { x: 0.52, y: 0.48 },
      { x: 0.56, y: 0.52 },
      { x: 0.62, y: 0.58 },
      { x: 0.68, y: 0.64 },
    ],
  },

  // Taiwan — N-S vertical, relatively straight
  taiwan: {
    points: [
      { x: 0.74, y: 0.12 },
      { x: 0.735, y: 0.18 },
      { x: 0.73, y: 0.27 },
      { x: 0.725, y: 0.34 },
    ],
  },

  // Bab el-Mandeb — NNW-SSE, slight curve
  'bab-el-mandeb': {
    points: [
      { x: 0.14, y: 0.32 },
      { x: 0.148, y: 0.36 },
      { x: 0.155, y: 0.42 },
      { x: 0.16, y: 0.48 },
    ],
  },

  // Luzon — NE-SW, wide strait between islands
  luzon: {
    points: [
      { x: 0.76, y: 0.20 },
      { x: 0.745, y: 0.23 },
      { x: 0.72, y: 0.28 },
      { x: 0.70, y: 0.33 },
    ],
  },

  // Lombok — N-S vertical, very narrow
  lombok: {
    points: [
      { x: 0.705, y: 0.62 },
      { x: 0.702, y: 0.66 },
      { x: 0.698, y: 0.72 },
      { x: 0.695, y: 0.78 },
    ],
  },

  // Hormuz — E-W horizontal, curves around the peninsula
  hormuz: {
    points: [
      { x: 0.20, y: 0.20 },
      { x: 0.22, y: 0.19 },
      { x: 0.27, y: 0.21 },
      { x: 0.30, y: 0.23 },
    ],
  },
} as const satisfies Record<string, StraitPath>

export default straitPaths
