import type { StraitFlowConfig } from '~/utils/particleEngine'

export const taiwanFlowConfig: StraitFlowConfig = {
  id: 'taiwan',
  polygonPath: '~/data/straits/taiwan-polygon.json',
  backgroundImage: '/assets/images/straits/luzon.jpg',
  particleCount: 100,
  spines: [{
    waypoints: [
      [158, 868, 280, 0.5],    // 0  S entry - wide
      [361, 577, 194, 0.5],    // 1  mid channel
      [483, 385, 48, 0.5],     // 2  narrowing
      [517, 348, 26, 0.4],     // 3  strait - tight
      [547, 299, 30, 0.6],     // 4  past strait
      [681, 272, 120, 0.8],    // 5  spreading
      [776, 98, 200, 1.0],     // 6  N exit - wide open
    ],
    ratio: 1.0,
  }],
  spawnZones: {
    entry: { start: 0, end: 1.0 },
    exit: { start: 0, end: 1.0 },
  },
}
