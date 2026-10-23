const obstacles = [
  { x1: -5.57, x2: -5.43, z1: 3.46, z2: 3.64, label: 'district portal west frame' },
  { x1: -3.53, x2: -3.39, z1: 3.46, z2: 3.64, label: 'district portal east frame' },
  { x1: -5.88, x2: -4.48, z1: -2.835, z2: -1.905, label: 'server rack A' },
  { x1: -5.88, x2: -4.48, z1: -1.135, z2: -0.205, label: 'server rack B' },
  { x1: -3.475, x2: -0.225, z1: -3.325, z2: -1.975, label: 'workflow workstation' },
  { x1: -0.225, x2: 2.325, z1: -0.725, z2: 0.625, label: 'automation workstation' },
  { x1: -2.27, x2: -1.43, z1: -1.725, z2: -0.955, label: 'workflow chair' },
  { x1: 0.63, x2: 1.47, z1: 0.615, z2: 1.385, label: 'automation chair' },
  { x1: 2.35, x2: 4.55, z1: -2.91, z2: -1.59, label: 'instrument bench' },
  { x1: 2.3, x2: 4.8, z1: -3.21, z2: -3.09, label: 'floor cable trunk' },
  { x1: 4.4, x2: 5.3, z1: -0.31, z2: 1.01, label: 'project terminal' },
  { x1: 4.205, x2: 4.695, z1: -3.275, z2: -2.825, label: 'east plant foliage' },
  { x1: -4.025, x2: -3.615, z1: 1.665, z2: 2.055, label: 'west plant foliage' },
  { x1: 2.346, x2: 3.454, z1: 0.731, z2: 1.569, label: 'assistant robot' },
  { x1: 3.53, x2: 4.17, z1: 1.41, z2: 2.03, label: 'violet crate' },
  { x1: 4.19, x2: 4.71, z1: 1.99, z2: 2.51, label: 'amber crate' },
]

const interactionAnchors = {
  projectTerminal: Object.freeze({
    id: 'project-terminal',
    contentIds: Object.freeze(['personalvabot', 'markhq']),
    approach: Object.freeze({ x: 3.7, z: 0.35 }),
    facingAngle: Math.PI / 2,
    kind: 'project-panel',
  }),
}

const portal = Object.freeze({
  id: 'operations-hq-portal',
  destinationId: 'operations-hq',
  position: Object.freeze({ x: -4.48, z: 3.55 }),
  approach: Object.freeze({ x: -4.48, z: 2.8 }),
  facingAngle: Math.PI,
  radius: 0.62,
})

export const AUTOMATION_LAB_NAVIGATION = Object.freeze({
  districtId: 'automation-lab',
  grid: Object.freeze({ cellSize: 0.25, minX: -5.25, minZ: -3.75, cols: 43, rows: 31 }),
  bounds: Object.freeze({ minX: -5.3, maxX: 5.55, minZ: -3.8, maxZ: 4.0 }),
  avatarRadius: 0.28,
  spawn: Object.freeze({ x: 0.22, z: 2.55 }),
  obstacles: Object.freeze(obstacles.map((obstacle) => Object.freeze(obstacle))),
  interactions: Object.freeze(interactionAnchors),
  portal,
})
