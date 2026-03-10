import type { StraitFlowConfig } from '~/utils/particleEngine'

export const malaccaFlowConfig: StraitFlowConfig = {
  id: 'malacca',
  polygonPath: '~/data/straits/malacca-polygon.json',
  backgroundImage: '/assets/images/straits/malacca.jpg',
  particleCount: 150,
  spines: [
    {
      // Spine A: main channel SE -> NW
      waypoints: [
        [858, 237, 400, 0.35],   // 0  SE entry - wide open water
        [668, 624, 50, 0.5],     // 1  narrowing
        [609, 592, 2, 0.4],      // 2  strait - single file
        [556, 557, 2, 0.4],      // 3  strait - narrowest
        [502, 516, 20, 0.5],     // 4  leaving strait
        [463, 457, 56, 0.6],     // 5  widening
        [323, 354, 134, 0.8],    // 6  NW wide area
      ],
      ratio: 0.7,
    },
    {
      // Spine B: splits from waypoint 1, goes south around the island
      waypoints: [
        [668, 624, 50, 0.5],     // 0  branch point (same as A wp 1)
        [762, 686, 80, 0.5],     // 1  heading south
        [827, 811, 100, 0.6],    // 2  SE of island
      ],
      ratio: 0.3,
    },
  ],
  spawnZones: {
    entry: { start: 0.1, end: 0.9 },
    exit: { start: 0.1, end: 0.9 },
  },
  // Exit edge extensions: prepend bottom-left -> top-left to original exit edge
  exitEdgeExtensions: [[0, 1080], [0, 0]],
}
