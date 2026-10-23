/**
 * Stage A Operations HQ scene definition.
 *
 * Coordinates use the shared MARKVERSE convention: X runs left/right, Y is up,
 * and positive Z points toward the open visitor-facing side of the room. Values
 * are room-local and aligned to rendered furniture. Navigation bounds describe
 * safe avatar-center positions; obstacle rectangles describe physical footprints
 * and receive the shared avatar-radius clearance exactly once in avatarNavigation.
 */
export const OPERATIONS_HQ_CAMERA_CONFIG = Object.freeze({
  defaultView: Object.freeze({ azimuth: -42, elevation: 36, zoom: 1.08 }),
  target: Object.freeze({ x: 0, y: 1.55, z: 0 }),
  orbitRadius: 28,
  viewHeight: 18,
  limits: Object.freeze({
    // Keep the isometric front view while allowing useful left and right
    // inspection angles without exposing the room's back side.
    azimuth: Object.freeze([-68, 14]),
    elevation: Object.freeze([27, 48]),
    zoom: Object.freeze([0.9, 1.14]),
  }),
})

const careerPlinths = Object.freeze([
  Object.freeze({ id: 'career-support', x: -5.55, z: -3.78, milestone: '01', width: 1.22, depth: 1.12 }),
  Object.freeze({ id: 'career-production', x: -4.1, z: -3.78, milestone: '02', width: 1.22, depth: 1.12 }),
  Object.freeze({ id: 'career-trainer', x: -2.65, z: -3.78, milestone: '03', width: 1.22, depth: 1.12 }),
  Object.freeze({ id: 'career-training-lead', x: -1.2, z: -3.78, milestone: '04', width: 1.22, depth: 1.12 }),
])

const trainingSeats = Object.freeze([4.55, 5.35, 6.12])

const obstacles = Object.freeze([
  ...careerPlinths.map((plinth) => Object.freeze({
    x1: plinth.x - plinth.width / 2, x2: plinth.x + plinth.width / 2,
    z1: plinth.z - plinth.depth / 2, z2: plinth.z + plinth.depth / 2,
    label: `${plinth.id} plinth`,
  })),
  Object.freeze({ x1: 3.12, x2: 4.68, z1: -3.9, z2: -2.77, label: 'training presenter lectern' }),
  ...trainingSeats.map((x, index) => Object.freeze({ x1: x - 0.325, x2: x + 0.325, z1: -2.49, z2: -1.85, label: `training seat ${index + 1}` })),
  Object.freeze({ x1: -6.295, x2: -3.345, z1: 2.605, z2: 3.755, label: 'quality review bench and equipment' }),
  Object.freeze({ x1: 3.62, x2: 6.34, z1: 2.92, z2: 4.14, label: 'impact evidence cabinet and display trays' }),
  // The west wall now renders as one low parapet, while this floor-level
  // boundary continues to block avatar movement along the complete room side.
  Object.freeze({ x1: -7, x2: -6.56, z1: -5.5, z2: 0.0, label: 'west parapet rear half' }),
  Object.freeze({ x1: -7, x2: -6.56, z1: 0.0, z2: 5.17, label: 'west parapet front half' }),
  Object.freeze({ x1: 6.56, x2: 7, z1: -5.5, z2: 5.5, label: 'east wall interior' }),
  Object.freeze({ x1: -7, x2: 7, z1: -5.67, z2: -5.17, label: 'rear wall interior' }),
  Object.freeze({ x1: -7, x2: -4.9, z1: 4.97, z2: 5.47, label: 'west front return wall' }),
  Object.freeze({ x1: 4.9, x2: 7, z1: 4.97, z2: 5.47, label: 'east front return wall' }),
  Object.freeze({ x1: 5.73, x2: 6.63, z1: -4.61, z2: -4.09, label: 'training guide shelf' }),
  Object.freeze({ x1: -6.29, x2: -5.71, z1: 4.26, z2: 4.84, label: 'west entry planter' }),
  Object.freeze({ x1: 5.71, x2: 6.29, z1: 4.26, z2: 4.84, label: 'east entry planter' }),
])

const interactionAnchors = Object.freeze({
  careerJourney: Object.freeze({ id: 'career-journey', x: -3.55, z: -2.05, facingAngle: Math.PI }),
  trainingCommand: Object.freeze({ id: 'training-command', x: 3.45, z: -1.38, facingAngle: Math.PI }),
  qualityProcess: Object.freeze({ id: 'quality-process', x: -2.78, z: 2.02, facingAngle: -Math.PI / 2 }),
  impactEvidence: Object.freeze({ id: 'impact-evidence', x: 3.0, z: 2.34, facingAngle: Math.PI / 2 }),
})

const interactables = Object.freeze([
  ...careerPlinths.map((plinth, index) => Object.freeze({
    id: plinth.id,
    contentId: ['career-support', 'career-production', 'career-trainer', 'career-training-lead'][index],
    anchorId: 'career-journey',
    position: Object.freeze({ x: plinth.x, y: 1.28, z: plinth.z }),
    size: Object.freeze({ x: 1.08, y: 1.9, z: 0.98 }),
  })),
  Object.freeze({ id: 'training-console', contentId: 'training-command', anchorId: 'training-command', position: Object.freeze({ x: 3.9, y: 1.35, z: -3.28 }), size: Object.freeze({ x: 1.76, y: 2.5, z: 1.4 }) }),
  Object.freeze({ id: 'quality-workstation', contentId: 'quality-process', anchorId: 'quality-process', position: Object.freeze({ x: -4.82, y: 1.08, z: 3.12 }), size: Object.freeze({ x: 2.82, y: 1.92, z: 1.02 }) }),
  Object.freeze({ id: 'impact-evidence-wall', contentId: 'impact-evidence', anchorId: 'impact-evidence', position: Object.freeze({ x: 5.9, y: 2.5, z: 1.5 }), size: Object.freeze({ x: 1.46, y: 3.15, z: 3.28 }) }),
])

export const OPERATIONS_HQ_SCENE_CONFIG = Object.freeze({
  districtId: 'operations-hq',
  room: Object.freeze({
    width: 14,
    depth: 11,
    wallHeight: 4.15,
    floorTop: 0,
    minX: -7,
    maxX: 7,
    minZ: -5.5,
    maxZ: 5.5,
  }),
  navigation: Object.freeze({
    districtId: 'operations-hq',
    grid: Object.freeze({ cellSize: 0.25, minX: -6.5, minZ: -5, cols: 53, rows: 40 }),
    // Safe center limits keep the avatar radius inside the room shell; wall
    // rectangles remain exact physical geometry, not already-expanded boxes.
    bounds: Object.freeze({ minX: -6.28, maxX: 6.28, minZ: -4.89, maxZ: 5.22 }),
    avatarRadius: 0.28,
    spawn: Object.freeze({ x: -0.55, z: 4.12 }),
    walkableRegions: Object.freeze([
      Object.freeze({ id: 'rear-circulation', x1: -6.4, x2: 6.4, z1: -2.75, z2: -1.75 }),
      Object.freeze({ id: 'central-loop', x1: -2.7, x2: 2.7, z1: -2.55, z2: 2.75 }),
      Object.freeze({ id: 'front-circulation', x1: -6.4, x2: 6.4, z1: 1.75, z2: 4.85 }),
      Object.freeze({ id: 'west-connector', x1: -5.85, x2: -2.55, z1: -1.9, z2: 2.0 }),
      Object.freeze({ id: 'east-connector', x1: 2.55, x2: 5.85, z1: -1.9, z2: 2.0 }),
      Object.freeze({ id: 'career-approach', x1: -4.25, x2: -3.0, z1: -2.3, z2: -1.7 }),
      Object.freeze({ id: 'training-approach', x1: 2.9, x2: 4.2, z1: -2.05, z2: -1.1 }),
      Object.freeze({ id: 'quality-approach', x1: -3.35, x2: -2.5, z1: 1.7, z2: 2.5 }),
      Object.freeze({ id: 'impact-approach', x1: 2.5, x2: 3.45, z1: 1.7, z2: 2.65 }),
    ]),
    obstacles,
    interactions: interactionAnchors,
    portal: Object.freeze({
      id: 'automation-lab-portal',
      destinationId: 'automation-lab',
      x: -2.15,
      z: 4.7,
      approach: Object.freeze({ x: -2.15, z: 4.34 }),
      facingAngle: Math.PI,
      radius: 0.55,
    }),
  }),
  careerPlinths,
  trainingSeats,
  interactables,
  stations: Object.freeze([
    Object.freeze({ id: 'career-journey', label: 'Career Journey Hall', shortLabel: 'CAREER JOURNEY', x: -3.375, z: -3.78, wall: 'rear', accent: 'violet' }),
    Object.freeze({ id: 'training-command', label: 'Training Command Center', shortLabel: 'TRAINING COMMAND', x: 3.85, z: -3.82, wall: 'rear', accent: 'amber' }),
    Object.freeze({ id: 'quality-process', label: 'Quality & Process Station', shortLabel: 'QUALITY & PROCESS', x: -5.65, z: 1.3, wall: 'west', accent: 'cyan' }),
    Object.freeze({ id: 'impact-evidence', label: 'Impact & Achievements Display', shortLabel: 'IMPACT & EVIDENCE', x: 5.65, z: 1.55, wall: 'east', accent: 'amber' }),
  ]),
})

export const OPERATIONS_HQ_PALETTE = Object.freeze({
  navy: '#0b1120',
  slate: '#17233a',
  slateLight: '#26344c',
  violet: '#8b5cf6',
  cyan: '#67e8cf',
  blue: '#3b82f6',
  amber: '#f59e0b',
  gold: '#fcd34d',
  wood: '#76543c',
  woodLight: '#a9794e',
  parchment: '#d7c7a6',
})
