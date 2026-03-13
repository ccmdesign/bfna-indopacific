/**
 * @deprecated BF-111: safe to remove once MarineTraffic embed is validated
 *
 * particleTweakpane — Shared Tweakpane control panel for particle test pages.
 *
 * Dynamic import('tweakpane') ensures tree-shaking in production.
 */

import type { FlowParams } from '~/utils/particleEngine'

export async function setupTweakpane(
  params: FlowParams,
  options: {
    enableDrag?: boolean
    canvas?: HTMLCanvasElement
    container?: HTMLElement
    spineArrays?: [number, number, number, number][][]
    onSpineChange?: () => void
    spawnZones?: { entry: { start: number; end: number }; exit: { start: number; end: number } }
  } = {},
): Promise<{ pane: any; dispose: () => void }> {
  const { Pane } = await import('tweakpane')
  const pane = new Pane({ title: 'Particle Controls', container: options.container }) as any

  // Flow & Movement
  const flow = pane.addFolder({ title: 'Flow & Movement' })
  flow.addBinding(params, 'particleCount', { label: 'Count', min: 10, max: 500, step: 10 })
  flow.addBinding(params, 'spawnRate', { label: 'Spawn/frame', min: 0.5, max: 10, step: 0.5 })
  flow.addBinding(params, 'speed', { label: 'Speed', min: 0.1, max: 5, step: 0.1 })
  flow.addBinding(params, 'speedVariation', { label: 'Speed var', min: 0, max: 1, step: 0.05 })

  // Steering
  const steer = pane.addFolder({ title: 'Steering' })
  steer.addBinding(params, 'steer', { label: 'Steer', min: 0, max: 1, step: 0.05 })
  steer.addBinding(params, 'spinePull', { label: 'Spine pull', min: 0, max: 2, step: 0.05 })

  // Organic Motion
  const motion = pane.addFolder({ title: 'Organic Motion' })
  motion.addBinding(params, 'noiseAmount', { label: 'Noise amt', min: 0, max: 1, step: 0.05 })
  motion.addBinding(params, 'noiseSpeed', { label: 'Noise spd', min: 0.005, max: 0.1, step: 0.005 })

  // Wall Repulsion
  const walls = pane.addFolder({ title: 'Wall Repulsion' })
  walls.addBinding(params, 'wallRepelDist', { label: 'Repel dist', min: 5, max: 100, step: 5 })
  walls.addBinding(params, 'wallRepelForce', { label: 'Repel force', min: 0, max: 5, step: 0.1 })

  // Appearance
  const appearance = pane.addFolder({ title: 'Appearance' })
  appearance.addBinding(params, 'dotMin', { label: 'Dot min', min: 0.5, max: 6, step: 0.5 })
  appearance.addBinding(params, 'dotMax', { label: 'Dot max', min: 1, max: 10, step: 0.5 })
  appearance.addBinding(params, 'dotOpacity', { label: 'Dot alpha', min: 0.1, max: 1, step: 0.05 })
  appearance.addBinding(params, 'showGlow', { label: 'Glow' })
  appearance.addBinding(params, 'glowRadius', { label: 'Glow size', min: 1, max: 5, step: 0.5 })
  appearance.addBinding(params, 'glowOpacity', { label: 'Glow alpha', min: 0, max: 0.6, step: 0.05 })

  // Branch ratio (only for multi-spine configs)
  if (options.spineArrays && options.spineArrays.length > 1) {
    const branching = pane.addFolder({ title: 'Branching' })
    branching.addBinding(params, 'branchBRatio', { label: 'Branch B %', min: 0, max: 1, step: 0.05 })
  }

  // Waypoint Width/Speed folders for each spine
  if (options.spineArrays) {
    for (let si = 0; si < options.spineArrays.length; si++) {
      const spine = options.spineArrays[si]!
      const label = options.spineArrays.length > 1 ? ` (Spine ${String.fromCharCode(65 + si)})` : ''

      const widthFolder = pane.addFolder({ title: `Waypoint Width${label}` })
      const widthParams: Record<string, number> = {}
      for (let i = 0; i < spine.length; i++) {
        const key = `s${si}_w${i}`
        widthParams[key] = spine[i]![2]
        widthFolder.addBinding(widthParams, key, { label: `Pt ${i}`, min: 2, max: 400, step: 2 })
          .on('change', (ev: { value: number }) => {
            spine[i]![2] = ev.value
            options.onSpineChange?.()
          })
      }

      const speedFolder = pane.addFolder({ title: `Waypoint Speed${label}` })
      const speedParams: Record<string, number> = {}
      for (let i = 0; i < spine.length; i++) {
        const key = `s${si}_sp${i}`
        speedParams[key] = spine[i]![3]
        speedFolder.addBinding(speedParams, key, { label: `Pt ${i}`, min: 0.1, max: 2, step: 0.05 })
          .on('change', (ev: { value: number }) => {
            spine[i]![3] = ev.value
            options.onSpineChange?.()
          })
      }
    }
  }

  // Spawn Zones
  if (options.spawnZones) {
    const zones = pane.addFolder({ title: 'Spawn Zones' })
    zones.addBinding(options.spawnZones.entry, 'start', { label: 'Entry start', min: 0, max: 1, step: 0.05 })
    zones.addBinding(options.spawnZones.entry, 'end', { label: 'Entry end', min: 0, max: 1, step: 0.05 })
    zones.addBinding(options.spawnZones.exit, 'start', { label: 'Exit start', min: 0, max: 1, step: 0.05 })
    zones.addBinding(options.spawnZones.exit, 'end', { label: 'Exit end', min: 0, max: 1, step: 0.05 })
  }

  // Debug
  const debug = pane.addFolder({ title: 'Debug' })
  debug.addBinding(params, 'showDebug', { label: 'Borders & Waypoints' })
  debug.addBinding(params, 'showCircleMask', { label: 'Circle Mask' })
  debug.addBinding(params, 'respawnThreshold', { label: 'Respawn px', min: 5, max: 60, step: 5 })

  // Copy All Tuning
  pane.addButton({ title: 'Copy All Tuning' }).on('click', () => {
    const state = {
      params: { ...params },
      spines: options.spineArrays?.map(spine => spine.map(p => [p[0], p[1], p[2], p[3]])),
      timestamp: new Date().toISOString(),
    }
    navigator.clipboard.writeText(JSON.stringify(state, null, 2))
  })

  // Drag/drop for waypoints
  let cleanupDrag: (() => void) | null = null
  if (options.enableDrag && options.canvas && options.spineArrays) {
    cleanupDrag = setupDragDrop(
      options.canvas,
      options.spineArrays,
      options.onSpineChange ?? (() => {}),
    )
  }

  return {
    pane,
    dispose() {
      cleanupDrag?.()
      pane.dispose()
    },
  }
}

const HIT_RADIUS = 14
const SIZE = 1080

function setupDragDrop(
  canvas: HTMLCanvasElement,
  spineArrays: [number, number, number, number][][],
  onSpineChange: () => void,
): () => void {
  let dragSpineIdx: number | null = null
  let dragPtIdx: number | null = null

  function canvasXY(e: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect()
    const scaleX = SIZE / rect.width
    const scaleY = SIZE / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function onMouseDown(e: MouseEvent) {
    const { x, y } = canvasXY(e)
    for (let si = 0; si < spineArrays.length; si++) {
      const spine = spineArrays[si]!
      for (let i = 0; i < spine.length; i++) {
        if (Math.hypot(x - spine[i]![0], y - spine[i]![1]) < HIT_RADIUS) {
          dragSpineIdx = si
          dragPtIdx = i
          canvas.style.cursor = 'grabbing'
          e.preventDefault()
          return
        }
      }
    }
  }

  function onMouseMove(e: MouseEvent) {
    const { x, y } = canvasXY(e)
    if (dragSpineIdx !== null && dragPtIdx !== null) {
      spineArrays[dragSpineIdx]![dragPtIdx]![0] = Math.round(x)
      spineArrays[dragSpineIdx]![dragPtIdx]![1] = Math.round(y)
      onSpineChange()
      e.preventDefault()
      return
    }
    // Hover cursor
    let hover = false
    for (const spine of spineArrays) {
      for (const pt of spine) {
        if (Math.hypot(x - pt[0], y - pt[1]) < HIT_RADIUS) { hover = true; break }
      }
      if (hover) break
    }
    canvas.style.cursor = hover ? 'grab' : 'default'
  }

  function onMouseUp() {
    if (dragSpineIdx !== null) {
      dragSpineIdx = null
      dragPtIdx = null
      canvas.style.cursor = 'default'
    }
  }

  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)

  return () => {
    canvas.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
}
