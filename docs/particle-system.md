# Particle System — Architecture & Tuning Guide

This document explains how the strait particle system works, so you can quickly get up to speed when working on it in a new chat session.

## Overview

The particle system renders animated dots (representing ships) flowing through a strait's water channel. Each strait gets its own polygon data and flow configuration. Particles spawn at one edge, follow a spine through the channel, and despawn at the opposite edge.

The system lives in two places:
- **Test pages** (`pages/test/{strait-id}/index.vue`) — self-contained playground with Tweakpane controls for tuning per-strait parameters. One test page per strait (e.g., `malacca`, `hormuz`).
- **Production composable** (`composables/useParticleSystem.ts`) — the composable used by `StraitParticleCanvas.vue` inside `StraitCircle.vue`. Currently simpler than the test page — the test page is where new features are prototyped before being ported to production.

## Coordinate Space

Everything is in a **1080×1080 world coordinate system** matching the polygon SVG viewBox. The canvas maps this to whatever pixel size via a scale transform.

## Data Files

### Polygon JSON (`data/straits/{id}-polygon.json`)

Each strait has a polygon JSON file with:

```json
{
  "viewBox": [0, 0, 1080, 1080],
  "boundary": [[x, y], ...],    // Outer water boundary (closed polygon)
  "islands": [[[x, y], ...], ...], // Island polygons to subtract (holes)
  "entryEdge": [[x, y], ...],   // Polyline where ships enter (green in debug)
  "exitEdge": [[x, y], ...]     // Polyline where ships exit (magenta in debug)
}
```

The boundary + islands define where water is. Entry/exit edges are open polylines on the boundary where particles spawn and despawn.

### Creating polygon data

The polygon JSON is extracted from SVG path data. The SVG has layers for the boundary, islands, and entry/exit edges. The coordinates are in the 1080×1080 viewBox space. (Currently only Hormuz exists.)

## Core Systems

### 1. Containment Grid (rasterization)

The polygon boundary and islands are rasterized into a `Uint8Array` grid (270×270, 4px cells). Each cell is `1` (water) or `0` (land/outside). This gives O(1) point-in-water checks via `isInWater(x, y, grid)`.

### 2. Distance Field (wall repulsion)

A BFS from boundary-adjacent water cells creates a `Float32Array` distance field. Each water cell stores its distance to the nearest wall. The gradient of this field gives a repulsion vector pointing away from walls. This keeps particles from hugging coastlines.

### 3. Flow Spine (Branching)

The spine is an array of waypoints defining the channel centerline. A strait can have **multiple spine branches** (e.g., spine A through the main strait, spine B around an island).

```typescript
const FLOW_SPINE: [number, number, number, number][] = [
  [x, y, width, speed],
  // ...
]
const FLOW_SPINE_B: [number, number, number, number][] = [
  [x, y, width, speed],  // branch point (typically same coords as a spine A waypoint)
  // ...
]
```

- **x, y** — waypoint position in world coords
- **width** — stream width at this point (px). Small (8–16) = narrow strait (single-file mode). Large (60–344) = open water (particles spread out).
- **speed** — speed multiplier at this point (0.1–2.0). Controls how fast particles move in different parts of the channel.

Each spine branch is wrapped in a `SpineData` object containing precomputed tangents, cumulative lengths, and total length. Particles are assigned to a branch at spawn time via `branchBRatio` (e.g., 0.3 = 30% go to branch B).

The spine is **per-strait** and is the main thing you tune in the test page. Waypoints are draggable in the test page canvas. Both spine A (cyan) and spine B (orange) are shown in the debug overlay.

**Key functions:**
- `buildSpine(pts)` — precomputes tangents and cumulative lengths
- `makeSpineData(pts)` — wraps a spine into a `SpineData` object
- `spineNearest(px, py, pts, tans, segStart?, segEnd?)` — finds nearest point on spine within an optional segment range, returns interpolated tangent, width, speed, segment index
- `spineAt(d, sd)` — converts a 1D distance along the spine to an (x, y) position
- `spineDistance(segIdx, segT, sd)` — converts segment index + t to 1D distance
- `getSD(branch)` / `getSpinePts(branch)` — get the SpineData or waypoints for branch A or B

### 4. Waypoint Tracking & Movement

Each particle tracks a `waypointIdx` — the index of the next waypoint it's heading toward. This ensures particles always flow in one direction through the waypoint sequence and never snap backward.

**Waypoint lifecycle:**
1. On launch, the particle finds the **nearest waypoint** on its assigned spine and sets that as its first target
2. The particle steers directly toward the target waypoint center
3. When it gets within a threshold distance (30% of waypoint width, min 15px), it advances to the next waypoint
4. When it passes the last waypoint, it respawns

**Constrained spine search:** The `spineNearest` call is restricted to only the segment between the previous waypoint and the target waypoint. This prevents particles from projecting onto earlier/later segments and going backward.

Particles switch between two movement modes based on the interpolated spine width at their position:

**Strait Mode** (width < 30px):
- 1D advancement along the spine polyline
- Particle position is projected onto the spine and advanced by `speed × speedMult × dt`
- No lateral drift, no boundary checks — pure single-file flow
- Prevents particles from clipping through narrow land gaps
- Waypoint advancement also checked via cumulative spine distance

**Open Water Mode** (width >= 30px):
- 2D steering with multiple forces blended together:
  - **Waypoint direction** — steer toward the target waypoint center (replaces raw spine tangent for forward progress)
  - **Spine pull** — pull toward the centerline (strength increases with distance from spine)
  - **Exit steering** — near the end of the spine, steer toward the particle's personal exit point
  - **Wall repulsion** — push away from coastlines using the distance field gradient
  - **Lateral noise** — sinusoidal oscillation perpendicular to velocity for organic movement
- Boundary checking: tries candidate positions and falls back to spine centerline if all are in land

The transition between modes uses a `narrowFactor` (0–1) to smoothly scale lateral noise to zero as particles approach the strait.

### 5. Particle Lifecycle

1. **Spawn** — particle appears at a random point on the entry or exit edge (within the spawn zone range). It picks a random exit point on the opposite edge.
2. **Wait phase** (2 seconds) — particle sits at its spawn point, radius grows from 0 to target over 0.5s
3. **Launch** — particle finds the nearest waypoint on its assigned spine branch and aims directly at its center. `waypointIdx` is set to that waypoint.
4. **Flow** — particle follows waypoints sequentially through the channel. When it reaches a waypoint center (within threshold), `waypointIdx` advances to the next one. Movement uses strait mode or open water mode depending on local width.
5. **Despawn** — when the particle passes the last waypoint, reaches its exit point (within `respawnThreshold × 2` px), or leaves the canvas, it respawns as a new particle

### 6. Stuck Detection

If a particle stays within a **12px radius** for **3 seconds** (180 frames at 60fps), it's considered stuck (bouncing between walls, trapped in a corner, etc.). When triggered:

1. The system finds the **nearest point on the boundary polygon** (yellow edge) using point-to-segment projection across all boundary edges
2. The particle switches to a direct steering mode — it moves toward the boundary target at 1.5× speed, ignoring normal spine/waypoint logic
3. When it reaches the boundary point (within `respawnThreshold` px), it despawns and respawns as a new particle

**Tracking fields:** Each particle carries `stuckX/stuckY` (reference position), `stuckFrames` (counter), and `stuckTarget` (boundary point once stuck). The reference position resets whenever the particle moves more than 12px away from it.

### 7. Progressive Spawning

Particles don't all appear at once. They spawn in batches:
- **5% of target count** every **0.5 seconds** (30 frames at 60fps)
- First batch spawns immediately
- This creates a natural filling-in effect when the animation starts

## Tunable Parameters

### Global (shared across all straits)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `speed` | 1.2 | Base speed in world-units/frame |
| `speedVariation` | 0.4 | Per-particle speed randomization (0=uniform, 1=huge range) |
| `steer` | 0.3 | How fast particles align to spine direction (0=ignore, 1=instant) |
| `spinePull` | 0.5 | How strongly particles are pulled toward spine centerline |
| `noiseAmount` | 0.2 | Lateral wiggle intensity (0=straight lines, 1=very wavy) |
| `noiseSpeed` | 0.02 | How fast the wiggle oscillates |
| `wallRepelDist` | 40 | Distance (world px) from wall where repulsion begins |
| `wallRepelForce` | 1.5 | Strength of wall repulsion |
| `dotMin` | 2 | Minimum dot radius |
| `dotMax` | 4.5 | Maximum dot radius |
| `dotOpacity` | 0.9 | Core dot alpha |
| `glowRadius` | 2.5 | Glow size multiplier |
| `glowOpacity` | 0.2 | Glow alpha |
| `respawnThreshold` | 15 | Distance to exit point before recycling (px) |

### Per-strait

| Parameter | Description |
|-----------|-------------|
| Polygon JSON | Boundary, islands, entry/exit edges |
| Flow spine A `[x, y, width, speed][]` | Main channel centerline with per-point width and speed |
| Flow spine B `[x, y, width, speed][]` | Optional branch spine (e.g., around an island) |
| `branchBRatio` | Fraction (0–1) of particles assigned to spine B (default 0.3) |
| `entrySpawnStart` / `entrySpawnEnd` | Fraction (0–1) of entry edge used for spawning |
| `exitSpawnStart` / `exitSpawnEnd` | Fraction (0–1) of exit edge used for spawning |
| Particle count | Driven by strait traffic data (number of ships) |

## Test Page Workflow

Each strait has a test page at `pages/test/{strait-id}/index.vue`. To tune a strait:

1. Run `npm run dev` and navigate to `/test/{strait-id}`
2. The Tweakpane panel on the right lets you adjust all parameters in real-time
3. Waypoints are **draggable** — click and drag the numbered dots on the canvas
4. Toggle **Debug** overlay to see boundaries, edges, spine, width circles, and spawn zones
5. Toggle **Circle Mask** to preview how it looks inside the production circle UI
6. When happy with tuning, click **"Copy All Tuning"** — this copies a JSON blob with all params and spine data to your clipboard
7. Paste the JSON into the chat and ask to update the defaults in the test page code

### Debug Overlay Colors

| Color | Element |
|-------|---------|
| Yellow | Boundary polygon |
| Red | Islands |
| Green (thin) | Entry edge |
| Green (thick) | Active entry spawn zone |
| Magenta (thin) | Exit edge |
| Magenta (thick) | Active exit spawn zone |
| Cyan (dashed) | Flow spine A |
| Orange (dashed) | Flow spine B (branch) |
| Cyan dots | Wide waypoints — spine A (open water) |
| Orange dots | Wide waypoints — spine B |
| Coral dots | Narrow waypoints (strait, single-file) |
| Blue/gold/teal | Particles (3 ship type colors) |

## Production Integration

The production flow is:
1. `StraitCircle.vue` checks if the strait has polygon data (`POLYGON_READY_STRAITS` set)
2. If selected + has polygon data → renders `StraitParticleCanvas.vue`
3. `StraitParticleCanvas` calls `useParticleSystem()` composable
4. The composable loads the polygon JSON, creates canvas, runs the animation loop

**Note:** The production composable (`useParticleSystem.ts`) is currently simpler than the test page. It uses a basic centroid-to-centroid flow direction instead of the spine system. The test page improvements (spine, wait-then-launch, per-waypoint width/speed, exit points, progressive spawn, spawn zones) need to be ported to the composable once tuning is finalized.

## Key Files

| File | Purpose |
|------|---------|
| `pages/test/malacca/index.vue` | Malacca tuning page (branching spines, waypoint tracking) |
| `pages/test/hormuz/index.vue` | Hormuz tuning page (self-contained particle system + Tweakpane) |
| `data/straits/malacca-polygon.json` | Malacca water polygon data |
| `data/straits/hormuz-polygon.json` | Hormuz water polygon data |
| `composables/useParticleSystem.ts` | Production composable (needs spine port) |
| `components/straits/StraitParticleCanvas.vue` | Canvas component that hosts the composable |
| `components/straits/StraitCircle.vue` | Circle UI that conditionally renders particles |
| `components/straits/StraitData.vue` | Strait data point that passes year + selected state |

## Creating a New Strait Test Page

1. Create the polygon JSON at `data/straits/{id}-polygon.json` from the strait's SVG
2. Copy `pages/test/hormuz/index.vue` to `pages/test/{id}/index.vue`
3. Update the polygon import path
4. Replace the background image path
5. Set initial spine waypoints roughly following the channel (use debug overlay)
6. Tune spine positions (drag), widths, speeds, and spawn zones
7. Copy tuned values and update the code defaults
