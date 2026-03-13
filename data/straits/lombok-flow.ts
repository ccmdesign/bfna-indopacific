/** @deprecated BF-111: safe to remove once MarineTraffic embed is validated */
import type { StraitFlowConfig } from '~/utils/particleEngine'

/**
 * Lombok flow config.
 *
 * Spine B is a composite: spineA[0..3] + spineB[1..].
 * This pre-concatenation means particles on branch B share the southern
 * approach with branch A, then diverge westward at waypoint 3.
 *
 * Source: spineA wp 0-3 = [398,954] -> [536,618] -> [544,542] -> [530,466]
 *         spineB own    = [530,466] -> [345,417] -> [270,329]
 * Composite B = spineA[0..3] + spineB[1..2]
 */
export const lombokFlowConfig: StraitFlowConfig = {
  id: 'lombok',
  polygonPath: '~/data/straits/lombok-polygon.json',
  backgroundImage: '/assets/images/straits/lombok.jpg',
  particleCount: 80,
  spines: [
    {
      // Spine A: main channel S -> NE
      waypoints: [
        [398, 954, 400, 0.55],   // 0  S entry - wide
        [536, 618, 30, 0.4],     // 1  narrowing
        [544, 542, 16, 0.5],     // 2  narrowest
        [530, 466, 16, 0.6],     // 3  still narrow (branch point)
        [621, 394, 100, 0.7],    // 4  N exit - widening
      ],
      ratio: 0.7,
    },
    {
      // Spine B: composite path (spineA[0..3] + own waypoints)
      // Particles follow the same southern approach then diverge west
      waypoints: [
        [398, 954, 400, 0.55],   // 0  shared with A wp 0
        [536, 618, 30, 0.4],     // 1  shared with A wp 1
        [544, 542, 16, 0.5],     // 2  shared with A wp 2
        [530, 466, 16, 0.6],     // 3  branch point (= A wp 3)
        [345, 417, 40, 0.6],     // 4  heading west
        [270, 329, 80, 0.7],     // 5  around island
      ],
      ratio: 0.3,
    },
  ],
  spawnZones: {
    entry: { start: 0.1, end: 0.9 },
    exit: { start: 0.1, end: 0.9 },
  },
}
