/** @deprecated BF-111: safe to remove once MarineTraffic embed is validated */
import type { StraitFlowConfig } from '~/utils/particleEngine'

export const hormuzFlowConfig: StraitFlowConfig = {
  id: 'hormuz',
  polygonPath: '~/data/straits/hormuz-polygon.json',
  backgroundImage: '/assets/images/straits/hormuz.jpg',
  particleCount: 120,
  spines: [{
    waypoints: [
      [290, 456, 58, 0.6],    // 0  open water
      [332, 510, 42, 0.6],    // 1  funneling in
      [390, 548, 34, 0.4],    // 2  funneling in
      [444, 576, 38, 0.4],    // 3  approaching strait
      [498, 558, 16, 0.4],    // 4  strait - single file
      [544, 532, 10, 0.6],    // 5  strait - narrowest
      [554, 577, 16, 0.7],    // 6  strait - single file
      [580, 601, 30, 0.8],    // 7  leaving strait
      [657, 631, 46, 1.0],    // 8  spreading out
      [773, 705, 110, 1.0],   // 9  spreading out
      [856, 1044, 344, 1.0],  // 10 open water
    ],
    ratio: 1.0,
  }],
  spawnZones: {
    entry: { start: 0.35, end: 1.0 },
    exit: { start: 0, end: 1.0 },
  },
}
