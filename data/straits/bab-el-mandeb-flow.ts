import type { StraitFlowConfig } from '~/utils/particleEngine'

export const babElMandebFlowConfig: StraitFlowConfig = {
  id: 'bab-el-mandeb',
  polygonPath: '~/data/straits/bab-el-mandeb-polygon.json',
  backgroundImage: '/assets/images/straits/bab-el-mandeb.jpg',
  particleCount: 100,
  spines: [{
    waypoints: [
      [257, 68, 80, 0.6],      // 0  N entry
      [361, 231, 60, 0.6],     // 1  approaching
      [425, 344, 40, 0.5],     // 2  narrowing
      [502, 471, 20, 0.4],     // 3  strait entrance
      [543, 534, 2, 0.5],      // 4  narrowest
      [588, 574, 26, 0.6],     // 5  past narrows
      [691, 548, 30, 0.7],     // 6  turning
      [816, 514, 60, 0.8],     // 7  spreading
      [930, 624, 186, 1.0],    // 8  open water
      [908, 933, 200, 1.0],    // 9  wide exit
    ],
    ratio: 1.0,
  }],
  spawnZones: {
    entry: { start: 0.2, end: 0.8 },
    exit: { start: 0, end: 1.0 },
  },
}
