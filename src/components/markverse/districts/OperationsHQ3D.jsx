import { useEffect, useRef, useState } from 'react'
import {
  ACESFilmicToneMapping,
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  HemisphereLight,
  InstancedMesh,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector3,
  Vector2,
  WebGLRenderer,
} from 'three'
import { OperationsHQFallback } from './OperationsHQFallback.jsx'
import { OPERATIONS_HQ_CAMERA_CONFIG, OPERATIONS_HQ_PALETTE, OPERATIONS_HQ_SCENE_CONFIG } from './operationsHQSceneConfig.js'
import { findAvatarPath, getAvatarNavigationDebugGrid, isAvatarPathClear, isAvatarWalkable, measureAvatarPath, moveAvatarStep } from '../avatarNavigation.js'

const { room, navigation } = OPERATIONS_HQ_SCENE_CONFIG
const RENDER_CAP_MS = 1000 / 30

const RIG_QA_POSES = Object.freeze({
  'front-idle': Object.freeze({ facing: 0, camera: 0, walking: false }),
  'rear-idle': Object.freeze({ facing: Math.PI, camera: Math.PI, walking: false }),
  'left-side-idle': Object.freeze({ facing: -Math.PI / 2, camera: 0, walking: false }),
  'right-side-idle': Object.freeze({ facing: Math.PI / 2, camera: 0, walking: false }),
  'three-quarter-walk-a': Object.freeze({ facing: 0, camera: -Math.PI / 4, walking: true, phase: 0 }),
  'three-quarter-walk-b': Object.freeze({ facing: 0, camera: -Math.PI / 4, walking: true, phase: Math.PI }),
  'turning-walk': Object.freeze({ facing: 0, camera: -Math.PI / 4, walking: true, turning: true, phase: Math.PI / 2 }),
})

const MATERIALS = Object.freeze({
  slab: { color: '#101a2a', roughness: 0.94 },
  floorA: { color: '#303d52', roughness: 0.82 },
  floorB: { color: '#29364b', roughness: 0.84 },
  floorEdge: { color: '#39465c', roughness: 0.78 },
  wall: { color: '#172236', roughness: 0.88 },
  wallPanel: { color: '#22314a', roughness: 0.78 },
  wallInset: { color: '#2b3b53', roughness: 0.72 },
  trim: { color: '#58657d', roughness: 0.62 },
  dark: { color: '#0a1220', roughness: 0.7 },
  steel: { color: '#354259', roughness: 0.58, metalness: 0.22 },
  wood: { color: OPERATIONS_HQ_PALETTE.wood, roughness: 0.72 },
  woodLight: { color: OPERATIONS_HQ_PALETTE.woodLight, roughness: 0.65 },
  parchment: { color: OPERATIONS_HQ_PALETTE.parchment, roughness: 0.88 },
  violet: { color: OPERATIONS_HQ_PALETTE.violet, roughness: 0.45, emissive: '#3a1d6a', emissiveIntensity: 0.18 },
  cyan: { color: OPERATIONS_HQ_PALETTE.cyan, roughness: 0.42, emissive: '#267f76', emissiveIntensity: 0.28 },
  blue: { color: OPERATIONS_HQ_PALETTE.blue, roughness: 0.5, emissive: '#123d7c', emissiveIntensity: 0.18 },
  amber: { color: OPERATIONS_HQ_PALETTE.amber, roughness: 0.45, emissive: '#87440a', emissiveIntensity: 0.2 },
  gold: { color: OPERATIONS_HQ_PALETTE.gold, roughness: 0.5, emissive: '#79521b', emissiveIntensity: 0.13 },
  avatarSkin: { color: '#d9a17d', roughness: 0.86 },
  avatarHair: { color: '#1a1822', roughness: 0.9 },
  avatarShirt: { color: '#243a5a', roughness: 0.82 },
  avatarAccent: { color: '#67e8cf', roughness: 0.7 },
  avatarPants: { color: '#303144', roughness: 0.84 },
  avatarShoes: { color: '#171b27', roughness: 0.88 },
})

function makeTexture(title, lines, accent) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const context = canvas.getContext('2d')
  context.fillStyle = '#0a1424'
  context.fillRect(0, 0, 512, 256)
  context.fillStyle = accent
  context.fillRect(0, 0, 512, 8)
  context.strokeStyle = 'rgba(188,207,235,0.24)'
  context.lineWidth = 2
  context.strokeRect(12, 18, 488, 222)
  context.fillStyle = accent
  context.font = '700 24px Segoe UI, Arial, sans-serif'
  context.fillText(title.toUpperCase(), 30, 60, 450)
  context.fillStyle = '#a9bad2'
  context.font = '15px Segoe UI, Arial, sans-serif'
  if (title === 'Career Journey Hall') {
    const milestones = [
      ['01', 'CUSTOMER &', 'TECHNICAL SUPPORT', '#67e8cf'],
      ['02', 'AA –', 'PRODUCTION SPECIALIST', '#60a5fa'],
      ['03', 'SENIOR EXECUTIVE', 'TRAINER', '#f59e0b'],
      ['04', 'TRAINING', 'LEAD · CURRENT', '#fcd34d'],
    ]
    const cardWidth = 112
    milestones.forEach(([number, firstLine, secondLine, color], index) => {
      const x = 26 + index * 116
      context.fillStyle = 'rgba(255,255,255,0.045)'
      context.fillRect(x, 100, cardWidth, 110)
      context.strokeStyle = color
      context.lineWidth = 2
      context.strokeRect(x, 100, cardWidth, 110)
      context.fillStyle = color
      context.fillRect(x + 8, 108, 28, 22)
      context.fillStyle = '#07111e'
      context.font = '700 13px Segoe UI, Arial, sans-serif'
      context.fillText(number, x + 14, 124)
      context.fillStyle = '#e8edf5'
      context.font = '700 12px Segoe UI, Arial, sans-serif'
      context.fillText(firstLine, x + 9, 156, 96)
      context.fillText(secondLine, x + 9, 176, 96)
      context.fillStyle = color
      context.fillRect(x + 9, 190, 92, 3)
    })
  } else if (title === 'Quality & Process') {
    const labels = ['VALIDATE', 'REVIEW', 'DOCUMENT', 'IMPROVE']
    const left = 34
    const gap = 14
    const cardWidth = 99
    labels.forEach((label, index) => {
      const x = left + index * (cardWidth + gap)
      context.fillStyle = 'rgba(103,232,207,0.14)'
      context.fillRect(x, 108, cardWidth, 68)
      context.strokeStyle = accent
      context.lineWidth = 2
      context.strokeRect(x, 108, cardWidth, 68)
      context.fillStyle = accent
      context.fillRect(x + 12, 122, 18, 18)
      context.fillRect(x + 12, 147, cardWidth - 24, 4)
      context.fillStyle = '#d7e5ef'
      context.font = '700 11px Segoe UI, Arial, sans-serif'
      context.fillText(label, x + 36, 136, 58)
      if (index < labels.length - 1) {
        const arrowX = x + cardWidth + 3
        context.fillStyle = accent
        context.fillRect(arrowX, 139, 8, 3)
        context.beginPath()
        context.moveTo(arrowX + 7, 134)
        context.lineTo(arrowX + 13, 140)
        context.lineTo(arrowX + 7, 146)
        context.fill()
      }
    })
    context.fillStyle = '#a9bad2'
    context.font = '15px Segoe UI, Arial, sans-serif'
    context.fillText(lines[2], 36, 210, 430)
  } else if (title.includes('Evidence') || title.includes('Proof')) {
    lines.forEach((line, index) => {
      const x = 34 + index % 2 * 230
      const y = 104 + Math.floor(index / 2) * 62
      context.fillStyle = 'rgba(255,255,255,0.04)'
      context.fillRect(x, y - 22, 204, 42)
      context.strokeStyle = 'rgba(252,211,77,0.48)'
      context.lineWidth = 1
      context.strokeRect(x, y - 22, 204, 42)
      context.fillStyle = accent
      context.fillRect(x + 10, y - 9, 12, 12)
      context.fillStyle = '#d5dfeb'
      context.font = '14px Segoe UI, Arial, sans-serif'
      context.fillText(line, x + 31, y, 162)
    })
  } else {
    lines.forEach((line, index) => {
      const y = 102 + index * 32
      context.fillStyle = accent
      context.fillRect(32, y - 9, 10, 10)
      context.fillStyle = '#c8d4e6'
      context.fillText(line, 56, y, 420)
    })
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  return texture
}

function addBox(batches, material, x, y, z, width, height, depth, rotationY = 0) {
  const batchKey = material
  const batch = batches.get(batchKey) || []
  batch.push({ material, x, y, z, width, height, depth, rotationY })
  batches.set(batchKey, batch)
}

function createAvatarRig(scene, geometry, materials, spawn) {
  const root = new Object3D()
  root.name = 'mini-mark-avatar'
  root.position.set(spawn.x, room.floorTop, spawn.z)
  scene.add(root)

  const cube = (parent, materialName, position, size) => {
    const mesh = new Mesh(geometry, materials[materialName])
    mesh.position.set(...position)
    mesh.scale.set(...size)
    mesh.castShadow = false
    mesh.receiveShadow = false
    parent.add(mesh)
    return mesh
  }

  const bodyPivot = new Object3D()
  bodyPivot.position.y = 0.55
  root.add(bodyPivot)
  const torso = new Object3D()
  torso.position.y = -0.55
  bodyPivot.add(torso)
  cube(torso, 'avatarShirt', [0, 0.86, 0], [0.58, 0.72, 0.38])
  cube(torso, 'avatarAccent', [0, 0.9, 0.2], [0.08, 0.42, 0.035])

  const head = new Object3D()
  head.position.y = 0.94
  bodyPivot.add(head)
  cube(head, 'avatarSkin', [0, 0.04, 0], [0.52, 0.56, 0.46])
  cube(head, 'avatarHair', [0, 0.29, -0.035], [0.58, 0.16, 0.44])
  cube(head, 'avatarHair', [0, 0.17, 0.238], [0.44, 0.08, 0.035])
  cube(head, 'avatarHair', [-0.22, 0.12, -0.03], [0.12, 0.2, 0.36])
  cube(head, 'avatarHair', [0.22, 0.12, -0.03], [0.12, 0.2, 0.36])
  // Match Automation Lab's rear shell so the cutaway room never shows a bald
  // back view; the stepped lower block stops above the jacket shoulder line.
  cube(head, 'avatarHair', [0, 0.14, -0.235], [0.48, 0.28, 0.05])
  cube(head, 'avatarHair', [0, -0.04, -0.232], [0.36, 0.16, 0.05])
  cube(head, 'dark', [-0.12, 0.04, 0.24], [0.045, 0.045, 0.02])
  cube(head, 'dark', [0.12, 0.04, 0.24], [0.045, 0.045, 0.02])

  const makeLeg = (x) => {
    const pivot = new Object3D()
    pivot.position.set(x, 0.55, 0)
    root.add(pivot)
    cube(pivot, 'avatarPants', [0, -0.27, 0], [0.2, 0.52, 0.22])
    cube(pivot, 'avatarShoes', [x < 0 ? -0.02 : 0.02, -0.5, 0.035], [0.27, 0.14, 0.35])
    return pivot
  }
  const leftLeg = makeLeg(-0.14)
  const rightLeg = makeLeg(0.14)
  const makeArm = (side) => {
    const pivot = new Object3D()
    // Each arm is a single pivoted chain. Keep both sleeve and hand attached
    // here; torso-level limb meshes create a second, non-animated silhouette.
    pivot.position.set(side * 0.3, 0.62, 0)
    bodyPivot.add(pivot)
    cube(pivot, 'avatarShirt', [side * 0.06, -0.3, 0], [0.19, 0.62, 0.22])
    cube(pivot, 'avatarSkin', [side * 0.07, -0.63, 0.02], [0.15, 0.14, 0.16])
    return pivot
  }

  return { root, bodyPivot, torso, head, leftArm: makeArm(-1), rightArm: makeArm(1), leftLeg, rightLeg }
}

function addLamp(scene, color, position, intensity, distance) {
  const light = new PointLight(color, intensity, distance, 2)
  light.position.set(position.x, position.y, position.z)
  scene.add(light)
}

function addDisplay(scene, batches, textures, { x, y, z, width, height, rotationY = 0, accent, title, lines }) {
  const localX = (offset) => x + Math.cos(rotationY) * offset
  const localZ = (offset) => z - Math.sin(rotationY) * offset
  const faceX = x + Math.sin(rotationY) * 0.1
  const faceZ = z + Math.cos(rotationY) * 0.1
  // Keep the display frame embedded into its backing. The previous 0.14-unit
  // normal offset left the 0.035-unit amber rails visibly detached from the
  // 0.16-unit backing, especially at the far-left edge of Career Journey Hall.
  const frameX = (offset = 0) => localX(offset) + Math.sin(rotationY) * 0.09
  const frameZ = (offset = 0) => localZ(offset) + Math.cos(rotationY) * 0.09
  addBox(batches, 'dark', x, y, z, width + 0.2, height + 0.2, 0.16, rotationY)
  addBox(batches, 'steel', x, y, z - Math.cos(rotationY) * 0.087, width + 0.1, height + 0.1, 0.035, rotationY)
  for (const side of [-1, 1]) {
    addBox(batches, 'amber', frameX(side * (width / 2 + 0.025)), y, frameZ(side * (width / 2 + 0.025)), 0.055, height + 0.08, 0.035, rotationY)
  }
  addBox(batches, 'trim', frameX(), y + height / 2 + 0.025, frameZ(), width + 0.06, 0.055, 0.035, rotationY)
  addBox(batches, 'trim', frameX(), y - height / 2 - 0.025, frameZ(), width + 0.06, 0.055, 0.035, rotationY)
  addBox(batches, 'steel', x, y - height / 2 - 0.13, z, width * 0.3, 0.16, 0.2, rotationY)
  const texture = makeTexture(title, lines, accent)
  textures.add(texture)
  const screenMaterial = new MeshBasicMaterial({ map: texture, toneMapped: false, side: DoubleSide })
  const plane = new Mesh(new PlaneGeometry(width, height), screenMaterial)
  plane.position.set(faceX, y, faceZ)
  plane.rotation.y = rotationY
  scene.add(plane)
}

function buildScene(scene) {
  const batches = new Map()
  const textures = new Set()
  const materials = Object.fromEntries(Object.entries(MATERIALS).map(([key, value]) => [key, new MeshStandardMaterial(value)]))
  const box = (material, ...values) => addBox(batches, material, ...values)

  // Physically thick raised slab, with a tight half-unit tile grid.
  box('slab', 0, -0.29, 0, room.width + 0.4, 0.58, room.depth + 0.4)
  box('floorEdge', 0, -0.57, 0, room.width + 0.18, 0.08, room.depth + 0.18)
  const tileColumns = Math.round(room.width / 0.5)
  const tileRows = Math.round(room.depth / 0.5)
  for (let ix = 0; ix < tileColumns; ix += 1) {
    for (let iz = 0; iz < tileRows; iz += 1) {
      const x = -room.width / 2 + 0.25 + ix * 0.5
      const z = -room.depth / 2 + 0.25 + iz * 0.5
      box((ix + iz) % 2 ? 'floorA' : 'floorB', x, 0.025, z, 0.47, 0.05, 0.47)
    }
  }

  // Connected rear and side walls; the front stays open apart from low corner returns.
  const backZ = -(room.depth / 2 - 0.08)
  const sideX = room.width / 2 - 0.22
  const frontZ = room.depth / 2 - 0.28
  box('wall', 0, room.wallHeight / 2, backZ, room.width, room.wallHeight, 0.5)
  // One continuous, capped west parapet keeps career displays visible. The
  // previous camera fade hid selected instanced batches while leaving nearby
  // rails/returns visible, which made the beam appear unsupported.
  const westParapetHeight = 0.96
  box('wall', -sideX, westParapetHeight / 2, 0, 0.44, westParapetHeight, room.depth)
  box('wall', sideX, room.wallHeight / 2, 0, 0.44, room.wallHeight, room.depth)
  box('wall', -5.95, 0.28, frontZ, 2.1, 0.56, 0.5)
  box('wall', 5.95, 0.28, frontZ, 2.1, 0.56, 0.5)
  box('trim', 0, room.wallHeight - 0.01, backZ, room.width + 0.12, 0.18, 0.66)
  box('trim', -sideX, westParapetHeight + 0.01, 0, 0.58, 0.16, room.depth + 0.1)
  box('trim', sideX, room.wallHeight - 0.01, 0, 0.58, 0.18, room.depth + 0.1)
  box('trim', 0, 0.12, -5.12, 13.9, 0.24, 0.12)
  box('trim', -6.48, 0.12, 0, 0.12, 0.24, 10.7)
  box('trim', 6.48, 0.12, 0, 0.12, 0.24, 10.7)

  // Repeated architectural panels and warm vertical insets along the rear wall.
  for (let x = -6.0; x <= 6.01; x += 1.5) {
    box('wallPanel', x, 2.15, -5.15, 1.36, 3.65, 0.07)
    box('wallInset', x, 1.98, -5.09, 0.08, 3.2, 0.035)
  }
  for (let z = -4.5; z <= 4.51; z += 1.5) {
    box('wallPanel', 6.53, 2.1, z, 0.06, 3.55, 1.35)
  }
  // Deep pilasters break up the long walls and add scale without occupying floor space.
  for (const x of [-6.12, -0.72, 0.72, 6.12]) {
    box('dark', x, 2.05, -4.82, 0.32, 3.9, 0.28)
    box('trim', x, 2.05, -4.64, 0.42, 3.98, 0.08)
    // Seat this inset into the pilaster's front trim; the former offset left a
    // hairline gap that read as a stray yellow sliver at the west corner.
    box('amber', x, 2.08, -4.6, 0.045, 2.48, 0.025)
    box('steel', x, 0.18, -4.58, 0.58, 0.22, 0.24)
  }
  // Layered side-wall rails continue the room's connected architectural language.
  box('trim', 6.3, 3.72, 0, 0.14, 0.14, 9.7)
  box('wallInset', 6.3, 0.72, 0, 0.12, 0.12, 9.4)

  // Low-glow central floor route lights echo the approved circulation loop without adding obstacles.
  box('cyan', 0, 0.058, -2.18, 4.4, 0.035, 0.045)
  box('cyan', 0, 0.058, 2.08, 4.4, 0.035, 0.045)
  box('cyan', -2.18, 0.058, -0.05, 0.045, 0.035, 4.25)
  box('cyan', 2.18, 0.058, -0.05, 0.045, 0.035, 4.25)

  // Career Journey Hall: four equal podiums, ordered left-to-right as in the room plan.
  OPERATIONS_HQ_SCENE_CONFIG.careerPlinths.forEach(({ x, z, width, depth }, index) => {
    box('dark', x, 0.15, z, width, 0.3, depth)
    box('amber', x, 0.31, z + depth / 2, width - 0.26, 0.045, 0.045)
    box('steel', x, 0.43, z, width - 0.18, 0.12, depth - 0.14)
    box('steel', x, 0.56, z, width - 0.32, 0.62, depth - 0.3)
    box('violet', x, 0.9, z, width - 0.23, 0.08, depth - 0.2)
    box('woodLight', x, 0.96, z, width - 0.36, 0.07, depth - 0.32)
    box('dark', x, 0.62, z + 0.47, 0.56, 0.27, 0.04)
    box('violet', x, 0.62, z + 0.5, 0.04, 0.18, 0.025)
    if (index === 0) {
      // Support headset silhouette, intentionally generic and free of employer marks.
      box('parchment', x, 1.28, z - 0.02, 0.5, 0.1, 0.16)
      box('parchment', x - 0.23, 1.37, z - 0.02, 0.08, 0.25, 0.08)
      box('parchment', x + 0.23, 1.37, z - 0.02, 0.08, 0.25, 0.08)
      box('amber', x - 0.23, 1.3, z + 0.03, 0.1, 0.16, 0.12)
      box('amber', x + 0.23, 1.3, z + 0.03, 0.1, 0.16, 0.12)
    } else if (index === 1) {
      // Geospatial/data grid motif rather than a generic cube.
      box('blue', x, 1.23, z, 0.62, 0.34, 0.5)
      box('cyan', x - 0.16, 1.42, z - 0.12, 0.08, 0.045, 0.08)
      box('cyan', x, 1.42, z - 0.12, 0.08, 0.045, 0.08)
      box('cyan', x + 0.16, 1.42, z - 0.12, 0.08, 0.045, 0.08)
      box('cyan', x - 0.16, 1.42, z + 0.05, 0.08, 0.045, 0.08)
      box('cyan', x, 1.42, z + 0.05, 0.08, 0.045, 0.08)
      box('cyan', x + 0.16, 1.42, z + 0.05, 0.08, 0.045, 0.08)
      box('blue', x - 0.34, 1.18, z, 0.08, 0.42, 0.08)
    } else if (index === 2) {
      // Open training guide with a visible center fold and lesson lines.
      box('parchment', x - 0.14, 1.25, z, 0.3, 0.42, 0.1)
      box('parchment', x + 0.14, 1.25, z, 0.3, 0.42, 0.1)
      box('wood', x, 1.02, z, 0.7, 0.07, 0.2)
      box('amber', x - 0.15, 1.31, z + 0.06, 0.16, 0.035, 0.02)
      box('amber', x + 0.15, 1.31, z + 0.06, 0.16, 0.035, 0.02)
    } else {
      // Abstract lead marker: a stepped beacon, not an award or an unverified duty.
      box('amber', x, 1.28, z, 0.18, 0.62, 0.18)
      box('gold', x, 1.6, z, 0.56, 0.1, 0.2)
      box('woodLight', x, 1.67, z, 0.28, 0.08, 0.26)
      box('amber', x, 1.75, z, 0.1, 0.08, 0.1)
    }
  })
  // The display links the four milestones visually without implying new dates or duties.
  addDisplay(scene, batches, textures, {
    x: -3.375, y: 2.95, z: -5.095, width: 5.45, height: 1.62, accent: '#a78bfa',
    title: 'Career Journey Hall', lines: ['2017–2021  ·  Customer & Technical Support', '2022–2023  ·  AA – Production Specialist', '2023–2026  ·  Senior Executive – Trainer', 'Current  ·  Training Lead'],
  })

  // Training Command Center: board, presenter lectern and exactly three audience seats.
  addDisplay(scene, batches, textures, {
    x: 3.78, y: 3.0, z: -5.095, width: 4.45, height: 1.82, accent: '#f59e0b',
    title: 'Training Command', lines: ['Facilitation  ·  Knowledge transfer', 'Documentation  ·  Coaching', 'Operational support  ·  Leadership path'],
  })
  box('dark', 3.9, 0.14, -3.34, 1.56, 0.28, 1.12)
  box('wood', 3.9, 0.85, -3.34, 1.38, 1.15, 0.96)
  box('woodLight', 3.9, 1.45, -3.34, 1.55, 0.16, 1.1)
  box('steel', 3.9, 1.58, -3.0, 0.88, 0.46, 0.1)
  box('dark', 3.9, 1.58, -2.94, 0.72, 0.31, 0.03)
  box('amber', 3.9, 1.52, -2.91, 0.36, 0.035, 0.025)
  box('steel', 3.9, 0.56, -2.86, 1.12, 0.12, 0.18)
  box('dark', 3.9, 0.74, -2.82, 0.72, 0.22, 0.06)
  box('amber', 3.9, 0.75, -2.785, 0.38, 0.035, 0.02)
  OPERATIONS_HQ_SCENE_CONFIG.trainingSeats.forEach((x) => {
    box('dark', x, 0.14, -2.18, 0.65, 0.28, 0.62)
    box('steel', x, 0.45, -2.18, 0.55, 0.14, 0.52)
    box('wood', x, 0.77, -1.92, 0.56, 0.56, 0.14)
    box('woodLight', x, 0.5, -2.18, 0.56, 0.08, 0.54)
    for (const dx of [-0.2, 0.2]) {
      box('steel', x + dx, 0.28, -2.35, 0.07, 0.43, 0.07)
    }
  })
  // A narrow book/guide shelf stays against the back wall and out of circulation.
  box('wood', 6.18, 1.18, -4.35, 0.9, 1.9, 0.52)
  for (const y of [0.55, 1.05, 1.55]) box('woodLight', 6.18, y, -4.05, 0.86, 0.08, 0.05)
  for (let i = 0; i < 7; i += 1) box(i % 2 ? 'violet' : 'amber', 5.85 + i * 0.105, 0.82, -4.02, 0.07, 0.38 + (i % 3) * 0.06, 0.16)

  // Quality & Process: place the synthetic flow display directly on its bench
  // so lowering the west parapet does not leave a wall-mounted screen floating.
  addDisplay(scene, batches, textures, {
    x: -4.82, y: 1.85, z: 2.78, width: 2.72, height: 1.46, accent: '#67e8cf',
    title: 'Quality & Process', lines: ['Validate  ·  Investigate', 'Document  ·  Improve', 'Synthetic workflow view'],
  })
  box('dark', -4.82, 0.16, 3.18, 2.95, 0.32, 1.15)
  box('wood', -4.82, 0.93, 3.18, 2.76, 0.17, 1.04)
  box('woodLight', -4.82, 1.03, 3.18, 2.82, 0.06, 1.1)
  for (const x of [-5.95, -3.69]) {
    box('steel', x, 0.55, 2.82, 0.14, 0.65, 0.16)
    box('steel', x, 0.55, 3.54, 0.14, 0.65, 0.16)
  }
  box('steel', -4.2, 1.47, 2.75, 0.95, 0.67, 0.14, Math.PI / 2)
  box('dark', -4.2, 1.47, 2.65, 0.79, 0.48, 0.07, Math.PI / 2)
  box('cyan', -4.2, 1.46, 2.6, 0.06, 0.32, 0.025, Math.PI / 2)
  box('cyan', -4.2, 1.47, 2.57, 0.52, 0.025, 0.02, Math.PI / 2)
  box('steel', -4.95, 1.12, 3.06, 0.76, 0.045, 0.38)
  box('parchment', -5.5, 1.12, 3.28, 0.62, 0.045, 0.42)
  box('parchment', -5.46, 1.17, 3.25, 0.5, 0.018, 0.04)
  box('woodLight', -3.56, 1.11, 3.12, 0.3, 0.06, 0.34)
  box('amber', -3.25, 1.19, 2.96, 0.12, 0.045, 0.48)
  box('wood', -5.95, 1.2, 3.5, 0.36, 0.06, 0.22)
  box('parchment', -5.95, 1.25, 3.5, 0.27, 0.025, 0.15)

  // Impact wall and evidence cabinet: abstract, non-numeric and publication-safe.
  addDisplay(scene, batches, textures, {
    x: 6.69, y: 2.64, z: 0.65, width: 2.7, height: 1.42, rotationY: -Math.PI / 2, accent: '#fcd34d',
    title: 'Impact & Evidence', lines: ['Workflow documentation', 'Quality review', 'Evidence gate · no public metric'],
  })
  addDisplay(scene, batches, textures, {
    x: 6.69, y: 2.58, z: 3.0, width: 2.2, height: 1.22, rotationY: -Math.PI / 2, accent: '#f59e0b',
    title: 'Operational Proof', lines: ['Assessment & reporting', 'Source review pending', 'Sanitized evidence only'],
  })
  box('dark', 4.98, 0.16, 3.63, 2.65, 0.32, 1.0)
  box('steel', 4.98, 0.68, 3.63, 2.5, 0.77, 0.86)
  box('wood', 4.98, 1.12, 3.63, 2.72, 0.16, 1.02)
  box('woodLight', 4.98, 1.23, 3.63, 2.45, 0.06, 0.84)
  for (const x of [4.12, 4.98, 5.84]) {
    box('dark', x, 0.7, 3.18, 0.52, 0.42, 0.48)
    box('gold', x, 0.94, 3.18, 0.34, 0.05, 0.03)
  }
  // A compact evidence folio stack and lamp make the display read as a working review point.
  box('parchment', 4.3, 1.31, 3.64, 0.38, 0.045, 0.28)
  box('parchment', 4.34, 1.36, 3.62, 0.3, 0.045, 0.24)
  box('steel', 5.9, 1.42, 3.48, 0.09, 0.46, 0.09)
  box('amber', 5.9, 1.66, 3.48, 0.38, 0.07, 0.2)
  box('gold', 5.9, 1.62, 3.48, 0.3, 0.025, 0.15)
  // Low cabinet drawers and document trays add scale without implying an award.
  for (const x of [4.18, 4.98, 5.78]) {
    box('woodLight', x, 0.53, 3.18, 0.62, 0.035, 0.04)
    box('steel', x, 0.76, 3.18, 0.62, 0.035, 0.04)
  }

  // Small props: wall task lights, edge planters and subdued shelving details.
  // West-wall task lights belonged to the former full-height wall. The current
  // low parapet ends below them, so those fixtures were removed rather than
  // left suspended above the open side. The attached east-wall lights remain.
  for (const z of [-3.7, 0.0, 3.7]) {
    box('dark', 6.42, 3.68, z, 0.08, 0.42, 0.25)
    box('amber', 6.36, 3.57, z, 0.05, 0.19, 0.17)
  }
  for (const { x, z } of [{ x: -6.0, z: 4.55 }, { x: 6.0, z: 4.55 }]) {
    box('wood', x, 0.28, z, 0.58, 0.5, 0.58)
    box('dark', x, 0.55, z, 0.48, 0.08, 0.48)
    box('wood', x, 0.8, z, 0.08, 0.48, 0.08)
    box('cyan', x - 0.19, 1.0, z, 0.27, 0.25, 0.25)
    box('cyan', x + 0.17, 1.13, z - 0.02, 0.24, 0.28, 0.22)
    box('cyan', x, 1.25, z + 0.19, 0.25, 0.24, 0.2)
  }

  // In-floor destination pad keeps the portal affordance visible without a
  // freestanding arch in the visitor's sightline. Interaction raycasting is
  // supplied by the co-located, low-profile invisible target below.
  const portal = navigation.portal
  const portalZ = portal.z
  box('dark', portal.x, 0.085, portalZ, 1.34, 0.08, 0.92)
  box('cyan', portal.x, 0.132, portalZ - 0.405, 1.2, 0.018, 0.035)
  box('cyan', portal.x, 0.132, portalZ + 0.405, 1.2, 0.018, 0.035)
  box('cyan', portal.x - 0.59, 0.132, portalZ, 0.035, 0.018, 0.78)
  box('cyan', portal.x + 0.59, 0.132, portalZ, 0.035, 0.018, 0.78)
  box('cyan', portal.x, 0.133, portalZ, 0.34, 0.018, 0.045)

  // Build one instanced draw per shared box material to keep the room mesh-light.
  const boxGeometry = new BoxGeometry(1, 1, 1)
  for (const [batchKey, boxes] of batches) {
    const materialName = boxes[0].material
    const mesh = new InstancedMesh(boxGeometry, materials[materialName], boxes.length)
    mesh.name = `operations-hq-${batchKey.replaceAll('::', '-')}-batch`
    const transform = new Object3D()
    boxes.forEach((entry, index) => {
      transform.position.set(entry.x, entry.y, entry.z)
      transform.scale.set(entry.width, entry.height, entry.depth)
      transform.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), entry.rotationY)
      transform.updateMatrix()
      mesh.setMatrixAt(index, transform.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    scene.add(mesh)
  }

  // Animated rig uses the same unit geometry and shared materials as room props.
  const avatar = createAvatarRig(scene, boxGeometry, materials, navigation.spawn)
  const portalTargetIndex = OPERATIONS_HQ_SCENE_CONFIG.interactables.length
  const interactionTargets = new InstancedMesh(boxGeometry, materials.dark, portalTargetIndex + 1)
  interactionTargets.name = 'operations-hq-interaction-targets'
  interactionTargets.userData.hqContentIds = [...OPERATIONS_HQ_SCENE_CONFIG.interactables.map(({ contentId }) => contentId), null]
  interactionTargets.userData.hqDistrictIds = [...OPERATIONS_HQ_SCENE_CONFIG.interactables.map(() => null), navigation.portal.destinationId]
  interactionTargets.visible = false
  const targetTransform = new Object3D()
  OPERATIONS_HQ_SCENE_CONFIG.interactables.forEach(({ position, size }, index) => {
    targetTransform.position.set(position.x, position.y, position.z)
    targetTransform.scale.set(size.x, size.y, size.z)
    targetTransform.updateMatrix()
    interactionTargets.setMatrixAt(index, targetTransform.matrix)
  })
  targetTransform.position.set(navigation.portal.x, 0.15, navigation.portal.z)
  targetTransform.scale.set(1.16, 0.16, 0.8)
  targetTransform.updateMatrix()
  interactionTargets.setMatrixAt(portalTargetIndex, targetTransform.matrix)
  interactionTargets.instanceMatrix.needsUpdate = true
  interactionTargets.computeBoundingSphere()
  scene.add(interactionTargets)

  scene.add(new HemisphereLight(0xd8e5ff, 0x34263c, 1.8))
  scene.add(new AmbientLight(0x9fb6d5, 0.82))
  const keyLight = new DirectionalLight(0xffe0b8, 2.25)
  keyLight.position.set(-6, 11, 7)
  scene.add(keyLight)
  addLamp(scene, '#f5a94c', { x: -4.0, y: 3.3, z: -3.6 }, 11, 9)
  addLamp(scene, '#f1a64b', { x: 4.2, y: 3.4, z: -3.6 }, 10, 9)
  addLamp(scene, '#8a6bda', { x: -5.8, y: 3.2, z: 1.5 }, 4, 6)
  addLamp(scene, '#66d7d2', { x: 5.8, y: 3.2, z: 1.8 }, 5, 6)

  return { boxGeometry, materials, textures, avatar, interactionTargets }
}

function updateCamera(camera, cameraView, aspect, rigQaPose = null) {
  if (rigQaPose) {
    const target = new Vector3(navigation.spawn.x, 0.97, navigation.spawn.z)
    const radius = 8
    const elevation = 0.12
    camera.position.set(
      target.x + Math.sin(rigQaPose.camera) * radius * Math.cos(elevation),
      target.y + radius * Math.sin(elevation),
      target.z + Math.cos(rigQaPose.camera) * radius * Math.cos(elevation),
    )
    camera.up.set(0, 1, 0)
    camera.lookAt(target)
    const viewHeight = 3.35
    camera.left = -(viewHeight * aspect) / 2
    camera.right = (viewHeight * aspect) / 2
    camera.top = viewHeight / 2
    camera.bottom = -viewHeight / 2
    camera.near = 0.1
    camera.far = 80
    camera.zoom = 1
    camera.updateProjectionMatrix()
    return
  }
  const config = OPERATIONS_HQ_CAMERA_CONFIG
  const elevation = cameraView.elevation * Math.PI / 180
  const azimuth = cameraView.azimuth * Math.PI / 180
  const target = new Vector3(config.target.x, config.target.y, config.target.z)
  const horizontalRadius = config.orbitRadius * Math.cos(elevation)
  camera.position.set(
    target.x + Math.sin(azimuth) * horizontalRadius,
    target.y + config.orbitRadius * Math.sin(elevation),
    target.z + Math.cos(azimuth) * horizontalRadius,
  )
  camera.up.set(0, 1, 0)
  camera.lookAt(target)
  camera.zoom = cameraView.zoom
  camera.left = -(config.viewHeight * aspect) / 2
  camera.right = (config.viewHeight * aspect) / 2
  camera.top = config.viewHeight / 2
  camera.bottom = -config.viewHeight / 2
  camera.near = 0.1
  camera.far = 80
  camera.updateProjectionMatrix()
}

function destroyScene(scene, owned) {
  const materials = new Set(Object.values(owned.materials))
  scene.traverse((object) => {
    if (object.material) {
      if (Array.isArray(object.material)) object.material.forEach((material) => materials.add(material))
      else materials.add(object.material)
    }
    if (object.geometry && object.geometry !== owned.boxGeometry) object.geometry.dispose()
  })
  owned.textures.forEach((texture) => texture.dispose())
  materials.forEach((material) => material.dispose())
  owned.boxGeometry.dispose()
}

function readRendererDetails(renderer) {
  const gl = renderer.getContext()
  const debug = gl.getExtension('WEBGL_debug_renderer_info')
  return {
    rendererName: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'WebGL renderer name unavailable',
    webglVersion: gl.getParameter(gl.VERSION),
  }
}

export function OperationsHQ3D({ cameraView, onCameraChange, onFallback, onReady, onDiagnostics, onStationOpen, onPortalApproach, sceneControllerRef, debug3d = false, debugNav = false, avatarRigQA = false }) {
  const hostRef = useRef(null)
  const rendererDetailsRef = useRef(null)
  const cameraViewRef = useRef(cameraView)
  const onCameraChangeRef = useRef(onCameraChange)
  const onFallbackRef = useRef(onFallback)
  const onReadyRef = useRef(onReady)
  const onDiagnosticsRef = useRef(onDiagnostics)
  const onStationOpenRef = useRef(onStationOpen)
  const onPortalApproachRef = useRef(onPortalApproach)
  const controllerRef = useRef(null)
  const [failed, setFailed] = useState(false)
  const [movementStatus, setMovementStatus] = useState('Focus the room and use WASD, arrow keys, floor taps, or the movement pad.')
  const [rigQaCaptureStatus, setRigQaCaptureStatus] = useState('')
  const lastCameraChangeAtRef = useRef(0)
  const rigQaPose = avatarRigQA && typeof window !== 'undefined'
    ? RIG_QA_POSES[new URLSearchParams(window.location.search).get('avatarPose')]
    : null

  cameraViewRef.current = cameraView
  onCameraChangeRef.current = onCameraChange
  onFallbackRef.current = onFallback
  onReadyRef.current = onReady
  onDiagnosticsRef.current = onDiagnostics
  onStationOpenRef.current = onStationOpen
  onPortalApproachRef.current = onPortalApproach

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const rigQaStartAt = performance.now()
    let renderer
    let sceneReady = false
    let scene
    let owned
    let camera
    let resizeObserver
    let renderFrame = 0
    let destroyed = false
    const latestRenderSamples = []
    const frameIntervals = []
    let pointerStart = null
    let lastRenderAt = 0
    let lastMoveAt = 0
    let lastFrameAt = 0
    let movementState
    let walkPlane
    const raycaster = new Raycaster()
    const pointer = new Vector2()
    const movementKeys = {
      w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1],
      a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0],
    }

    const getMovementSnapshot = () => ({
      mode: movementState.mode,
      position: { x: Number(movementState.x.toFixed(2)), z: Number(movementState.z.toFixed(2)) },
      pendingWaypoints: Math.max(0, movementState.path.length - movementState.pathIndex),
      lastPathFound: movementState.lastPathFound,
      lastPathDistance: Number(movementState.lastPathDistance.toFixed(2)),
      lastPathNodes: movementState.lastRoute.length,
      lastPathMs: Number(movementState.lastPathfindingMs.toFixed(2)),
      hasPathPlan: movementState.lastPathDestination !== null,
      lastPathStart: movementState.lastPathStart,
      lastPathDestination: movementState.lastPathDestination,
      lastRoute: movementState.lastRoute,
      spawn: navigation.spawn,
      interactionAnchors: Object.values(navigation.interactions),
      portal: navigation.portal,
    })

    const setDirection = (key, active) => {
      if (!movementState || !movementKeys[key]) return
      if (active) {
        movementState.pendingInteraction = null
        movementState.heldKeys.add(key)
        movementState.path = []
        movementState.pathIndex = 0
        movementState.mode = 'walking'
      } else {
        movementState.heldKeys.delete(key)
        if (!movementState.heldKeys.size && !movementState.path.length) movementState.mode = 'idle'
      }
      requestRender()
    }

    const moveTo = (destination, { preservePendingInteraction = false } = {}) => {
      if (!movementState || !isAvatarWalkable(destination, navigation)) {
        setMovementStatus('That floor position is blocked or outside the room.')
        return false
      }
      if (!preservePendingInteraction) movementState.pendingInteraction = null
      movementState.lastPathStart = { x: movementState.x, z: movementState.z }
      movementState.lastPathDestination = { x: destination.x, z: destination.z }
      const started = performance.now()
      const route = findAvatarPath(movementState.lastPathStart, destination, navigation)
      movementState.lastPathfindingMs = performance.now() - started
      movementState.lastPathFound = Boolean(route && isAvatarPathClear(route, navigation))
      movementState.lastPathDistance = measureAvatarPath(route)
      movementState.lastRoute = movementState.lastPathFound ? route : []
      movementState.heldKeys.clear()
      movementState.path = movementState.lastPathFound ? route.slice(1) : []
      movementState.pathIndex = 0
      movementState.mode = movementState.path.length ? 'walking' : 'idle'
      setMovementStatus(movementState.lastPathFound
        ? movementState.path.length ? 'Mini Mark is walking to the selected floor position.' : 'Mini Mark is already at that position.'
        : 'No collision-free route to that floor position.')
      requestRender()
      return movementState.lastPathFound
    }

    const openStationImmediately = (contentId, returnTarget = renderer?.domElement) => {
      if (movementState) {
        movementState.pendingInteraction = null
        movementState.heldKeys.clear()
        movementState.path = []
        movementState.pathIndex = 0
        movementState.mode = 'idle'
      }
      if (contentId) onStationOpenRef.current?.(contentId, returnTarget)
      requestRender()
    }

    const startStationInteraction = (contentId) => {
      const definition = OPERATIONS_HQ_SCENE_CONFIG.interactables.find((item) => item.contentId === contentId)
      const anchor = definition && Object.values(navigation.interactions).find((item) => item.id === definition.anchorId)
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!definition || !anchor || reducedMotion) {
        openStationImmediately(contentId)
        return true
      }
      const routed = moveTo({ x: anchor.x, z: anchor.z }, { preservePendingInteraction: true })
      if (!routed) {
        setMovementStatus('Could not route to that station. Opening its information directly.')
        openStationImmediately(contentId)
        return true
      }
      movementState.pendingInteraction = {
        contentId,
        facingAngle: anchor.facingAngle,
        phase: movementState.path.length ? 'approach' : 'turning',
        phaseStartedAt: movementState.path.length ? 0 : performance.now(),
        opened: false,
      }
      if (!movementState.path.length) movementState.mode = 'interacting'
      setMovementStatus(movementState.path.length ? 'Mini Mark is walking to the selected station.' : 'Mini Mark is preparing to interact with the selected station.')
      requestRender()
      return true
    }

    const startPortalInteraction = (destinationId) => {
      const portal = navigation.portal
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!portal || !destinationId || reducedMotion) {
        openStationImmediately(null)
        onPortalApproachRef.current?.(destinationId, renderer?.domElement)
        return true
      }
      const routed = moveTo({ x: portal.approach.x, z: portal.approach.z }, { preservePendingInteraction: true })
      if (!routed) {
        setMovementStatus('Could not route to the portal. Opening the district choice directly.')
        openStationImmediately(null)
        onPortalApproachRef.current?.(destinationId, renderer?.domElement)
        return true
      }
      movementState.pendingInteraction = {
        districtId: destinationId,
        facingAngle: portal.facingAngle,
        phase: movementState.path.length ? 'approach' : 'turning',
        phaseStartedAt: movementState.path.length ? 0 : performance.now(),
        opened: false,
      }
      if (!movementState.path.length) movementState.mode = 'interacting'
      setMovementStatus(movementState.path.length ? 'Mini Mark is walking to the district portal.' : 'Mini Mark is facing the district portal.')
      requestRender()
      return true
    }

    const cancelMovement = () => {
      if (!movementState) return
      movementState.pendingInteraction = null
      movementState.heldKeys.clear()
      movementState.path = []
      movementState.pathIndex = 0
      movementState.mode = 'idle'
      if (owned?.avatar) {
        owned.avatar.leftArm.rotation.set(0, 0, 0)
        owned.avatar.rightArm.rotation.set(0, 0, 0)
        owned.avatar.bodyPivot.rotation.x = 0
      }
      setMovementStatus('Movement cancelled. Mini Mark is ready to explore.')
      requestRender()
    }

    const resetAvatar = () => {
      if (!movementState || !owned?.avatar) return
      movementState.heldKeys.clear()
      movementState.path = []
      movementState.pathIndex = 0
      movementState.pendingInteraction = null
      movementState.x = navigation.spawn.x
      movementState.z = navigation.spawn.z
      movementState.mode = 'idle'
      movementState.facingTarget = Math.PI
      owned.avatar.root.position.set(movementState.x, room.floorTop, movementState.z)
      owned.avatar.root.rotation.y = Math.PI
      owned.avatar.leftArm.rotation.set(0, 0, 0)
      owned.avatar.rightArm.rotation.set(0, 0, 0)
      owned.avatar.bodyPivot.rotation.x = 0
      setMovementStatus('Mini Mark returned to the Operations HQ entry point.')
      requestRender()
    }

    const updateAvatar = (now) => {
      const state = movementState
      const rig = owned.avatar
      const dt = lastMoveAt ? Math.min(0.05, Math.max(0, (now - lastMoveAt) / 1000)) : 0
      lastMoveAt = now
      let dx = 0
      let dz = 0
      for (const key of state.heldKeys) {
        dx += movementKeys[key][0]
        dz += movementKeys[key][1]
      }
      let walked = false
      if (Math.hypot(dx, dz) > 0) {
        const length = Math.hypot(dx, dz)
        const next = moveAvatarStep({ x: state.x, z: state.z }, { x: dx / length, z: dz / length }, 2.05 * dt, navigation)
        walked = Math.hypot(next.x - state.x, next.z - state.z) > 0.0001
        state.x = next.x
        state.z = next.z
        state.path = []
        state.pathIndex = 0
        if (walked) state.facingTarget = Math.atan2(dx, dz)
        else if (dt > 0.03) {
          state.heldKeys.clear()
          state.mode = 'idle'
          setMovementStatus('Movement stopped at a room boundary or blocked object.')
        }
      } else if (state.pathIndex < state.path.length) {
        const target = state.path[state.pathIndex]
        dx = target.x - state.x
        dz = target.z - state.z
        const distance = Math.hypot(dx, dz)
        if (distance < 0.045) {
          state.x = target.x
          state.z = target.z
          state.pathIndex += 1
        } else {
          const step = Math.min(distance, 2.35 * dt)
          const next = moveAvatarStep({ x: state.x, z: state.z }, { x: dx / distance, z: dz / distance }, step, navigation)
          walked = Math.hypot(next.x - state.x, next.z - state.z) > 0.0001
          state.x = next.x
          state.z = next.z
          if (walked) state.facingTarget = Math.atan2(dx, dz)
          else {
            state.path = []
            state.pathIndex = 0
            if (state.pendingInteraction?.districtId) {
              const destinationId = state.pendingInteraction.districtId
              openStationImmediately(null)
              onPortalApproachRef.current?.(destinationId, renderer?.domElement)
            } else if (state.pendingInteraction) openStationImmediately(state.pendingInteraction.contentId)
            else {
              state.mode = 'idle'
              setMovementStatus('Route stopped at a blocked object. Choose another floor position.')
            }
          }
        }
        if (state.pathIndex >= state.path.length) {
          state.path = []
          state.pathIndex = 0
          if (state.pendingInteraction) {
            state.mode = 'interacting'
            state.pendingInteraction.phase = 'turning'
            state.pendingInteraction.phaseStartedAt = now
            state.facingTarget = state.pendingInteraction.facingAngle
            setMovementStatus('Mini Mark reached the station and is turning toward it.')
          } else {
            state.mode = 'idle'
            setMovementStatus('Mini Mark reached the selected floor position.')
          }
        }
      }
      if (rigQaPose?.walking) {
        walked = true
        state.mode = 'walking'
        state.facingTarget = rigQaPose.facing + (rigQaPose.turning ? Math.sin(now / 1000 * 1.3) * 0.55 : 0)
      }
      if (walked) state.mode = 'walking'
      else if (state.pendingInteraction && !state.path.length) state.mode = 'interacting'
      else if (!state.heldKeys.size && !state.path.length && state.mode !== 'interacting') state.mode = 'idle'
      const turn = Math.atan2(Math.sin(state.facingTarget - rig.root.rotation.y), Math.cos(state.facingTarget - rig.root.rotation.y))
      rig.root.rotation.y += turn * (1 - Math.exp(-12 * Math.max(dt, 0.016)))
      if (state.pendingInteraction && state.mode === 'interacting') {
        const pending = state.pendingInteraction
        const remainingTurn = Math.atan2(Math.sin(pending.facingAngle - rig.root.rotation.y), Math.cos(pending.facingAngle - rig.root.rotation.y))
        if (pending.phase === 'turning' && Math.abs(remainingTurn) < 0.075 && now - pending.phaseStartedAt >= 100) {
          pending.phase = 'presenting'
          pending.phaseStartedAt = now
          setMovementStatus('Mini Mark is reviewing the selected station.')
        } else if (pending.phase === 'presenting' && now - pending.phaseStartedAt >= 420 && !pending.opened) {
          pending.opened = true
          const contentId = pending.contentId
          movementState.pendingInteraction = null
          movementState.mode = 'idle'
          setMovementStatus('Station information opened. Mini Mark is ready to explore.')
          if (pending.districtId) onPortalApproachRef.current?.(pending.districtId, renderer?.domElement)
          else onStationOpenRef.current?.(contentId, renderer?.domElement)
        }
      }
      rig.root.position.set(state.x, room.floorTop, state.z)
      const time = rigQaPose ? (now - rigQaStartAt) / 1000 : now / 1000
      const swing = Math.sin(time * 9.2 + (rigQaPose?.phase || 0)) * 0.46 * (walked ? 1 : 0)
      const blend = Math.min(1, dt * 12)
      rig.bodyPivot.position.y = 0.55 + Math.sin(time * 1.35) * (walked ? 0.006 : 0.014)
      rig.torso.rotation.z = walked ? 0 : Math.sin(time * 0.46) * 0.018
      rig.leftLeg.rotation.x += (swing - rig.leftLeg.rotation.x) * blend
      rig.rightLeg.rotation.x += (-swing - rig.rightLeg.rotation.x) * blend
      rig.leftArm.rotation.x += (-swing * 0.68 - rig.leftArm.rotation.x) * blend
      rig.rightArm.rotation.x += (swing * 0.68 - rig.rightArm.rotation.x) * blend
      const presenting = state.mode === 'interacting' && state.pendingInteraction?.phase === 'presenting'
      const interactionId = state.pendingInteraction?.contentId
      const trainingGesture = presenting && interactionId === 'training-command' ? -0.28 : 0
      const processLean = presenting && interactionId === 'quality-process' ? 0.055 : 0
      const inspectionNod = presenting && interactionId?.startsWith('career-') ? 0.09 : 0
      const evidenceLook = presenting && interactionId === 'impact-evidence' ? 0.055 : 0
      rig.rightArm.rotation.z += (trainingGesture - rig.rightArm.rotation.z) * blend
      rig.leftArm.rotation.z += ((presenting && interactionId === 'training-command' ? 0.1 : 0) - rig.leftArm.rotation.z) * blend
      rig.bodyPivot.rotation.x += (processLean - rig.bodyPivot.rotation.x) * blend
      rig.head.rotation.x += ((inspectionNod + evidenceLook - rig.head.rotation.x) * blend)
      rig.head.rotation.y += ((walked ? 0 : Math.sin(time * 0.31) * 0.12) - rig.head.rotation.y) * Math.min(1, dt * 4)
    }

    const report = (renderMs = 0, fps = 0, frameTime = 0) => {
      if ((!debug3d && !debugNav) || !renderer || !movementState) return
      const canvas = renderer.domElement
      const details = rendererDetailsRef.current
      const sortedRenderSamples = [...latestRenderSamples].sort((left, right) => left - right)
      const averageRenderMs = latestRenderSamples.length
        ? latestRenderSamples.reduce((sum, value) => sum + value, 0) / latestRenderSamples.length
        : 0
      const p95RenderMs = sortedRenderSamples.length
        ? sortedRenderSamples[Math.min(sortedRenderSamples.length - 1, Math.ceil(sortedRenderSamples.length * 0.95) - 1)]
        : 0
      const snapshot = {
        status: movementState.mode === 'walking' ? 'active · movement capped at 30 FPS' : 'active · on-demand render',
        renderMode: movementState.mode === 'walking' ? 'moving' : 'on-demand',
        fps,
        averageFps: frameIntervals.length ? 1000 / (frameIntervals.reduce((sum, value) => sum + value, 0) / frameIntervals.length) : 0,
        sampleCount: frameIntervals.length,
        frameTime,
        averageFrameTime: frameIntervals.length ? frameIntervals.reduce((sum, value) => sum + value, 0) / frameIntervals.length : 0,
        p95FrameTime: frameIntervals.length ? [...frameIntervals].sort((a, b) => a - b)[Math.min(frameIntervals.length - 1, Math.ceil(frameIntervals.length * 0.95) - 1)] : 0,
        averageRafTime: 0,
        p95RafTime: 0,
        cpuRenderTime: renderMs,
        averageCpuRenderTime: averageRenderMs,
        p95CpuRenderTime: p95RenderMs,
        gpuTimerAvailable: false,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometryCount: renderer.info.memory.geometries,
        textureCount: renderer.info.memory.textures,
        devicePixelRatio: window.devicePixelRatio || 1,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        cssWidth: canvas.clientWidth,
        cssHeight: canvas.clientHeight,
        rendererName: details?.rendererName || '—',
        webglVersion: details?.webglVersion || '—',
        pageVisibility: document.visibilityState,
        pageFocused: document.hasFocus(),
        renderCapFps: 30,
        fallbackWindows: 0,
        fallbackDecision: movementState.mode === 'walking' ? 'movement render loop active' : 'render on demand · idle scene',
        movement: getMovementSnapshot(),
        navigationGrid: debugNav ? getAvatarNavigationDebugGrid(navigation) : null,
        updatedAt: performance.now(),
      }
      onDiagnosticsRef.current?.(snapshot)
    }

    const render = (now) => {
      renderFrame = 0
      if (destroyed || document.visibilityState === 'hidden' || !renderer || !scene || !camera) return
      const movingBeforeUpdate = Boolean(rigQaPose?.walking) || movementState.mode === 'interacting' || movementState.heldKeys.size > 0 || movementState.pathIndex < movementState.path.length
      if (lastRenderAt && now - lastRenderAt < RENDER_CAP_MS - 1) {
        requestRender()
        return
      }
      const frameTime = lastFrameAt ? now - lastFrameAt : 0
      if (frameTime && movingBeforeUpdate) {
        frameIntervals.push(frameTime)
        if (frameIntervals.length > 120) frameIntervals.shift()
      }
      lastFrameAt = now
      if (movingBeforeUpdate) updateAvatar(now)
      const start = performance.now()
      renderer.render(scene, camera)
      if (!sceneReady) {
        sceneReady = true
        onReadyRef.current?.()
      }
      const duration = performance.now() - start
      latestRenderSamples.push(duration)
      if (latestRenderSamples.length > 60) latestRenderSamples.shift()
      const fps = frameTime > 0 ? 1000 / frameTime : 0
      lastRenderAt = now
      report(duration, fps, movingBeforeUpdate ? frameTime : 0)
      requestRender()
    }

    const requestRender = () => {
      if (!renderFrame && !destroyed && document.visibilityState !== 'hidden') {
        renderFrame = window.requestAnimationFrame(render)
      }
    }

    const resize = () => {
      if (!renderer || !camera) return
      const width = Math.max(1, host.clientWidth)
      const height = Math.max(1, host.clientHeight)
      renderer.setSize(width, height, false)
      updateCamera(camera, cameraViewRef.current, width / height, rigQaPose)
      requestRender()
    }

    const handlePointerDown = (event) => {
      if (event.button !== 0) return
      renderer?.domElement.focus({ preventScroll: true })
      pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY, azimuth: cameraViewRef.current.azimuth, elevation: cameraViewRef.current.elevation, moved: false }
      renderer?.domElement.setPointerCapture?.(event.pointerId)
    }
    const handlePointerMove = (event) => {
      if (!pointerStart || pointerStart.id !== event.pointerId) return
      const dx = event.clientX - pointerStart.x
      const dy = event.clientY - pointerStart.y
      if (!pointerStart.moved && Math.hypot(dx, dy) < 5) return
      pointerStart.moved = true
      const now = performance.now()
      if (now - lastCameraChangeAtRef.current < RENDER_CAP_MS) return
      lastCameraChangeAtRef.current = now
      onCameraChangeRef.current?.({
        azimuth: pointerStart.azimuth - dx * 0.16,
        elevation: pointerStart.elevation + dy * 0.12,
      })
    }
    const handlePointerUp = (event) => {
      if (!pointerStart || pointerStart.id !== event.pointerId) return
      const wasClick = !pointerStart.moved
      if (pointerStart.moved) {
        const dx = event.clientX - pointerStart.x
        const dy = event.clientY - pointerStart.y
        onCameraChangeRef.current?.({
          azimuth: pointerStart.azimuth - dx * 0.16,
          elevation: pointerStart.elevation + dy * 0.12,
        })
      }
      pointerStart = null
      renderer?.domElement.releasePointerCapture?.(event.pointerId)
      if (wasClick && walkPlane && camera) {
        const rect = renderer.domElement.getBoundingClientRect()
        pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
        raycaster.setFromCamera(pointer, camera)
        const intersections = raycaster.intersectObjects(scene.children, true)
        const stationHit = intersections.find(({ object, instanceId }) => object.userData?.hqContentIds?.[instanceId] || object.userData?.hqDistrictIds?.[instanceId])
        const floorHit = intersections.find(({ object }) => object === walkPlane)
        if (stationHit && (!floorHit || stationHit.distance <= floorHit.distance)) {
          const contentId = stationHit.object.userData.hqContentIds?.[stationHit.instanceId]
          const destinationId = stationHit.object.userData.hqDistrictIds?.[stationHit.instanceId]
          if (destinationId) startPortalInteraction(destinationId)
          else if (contentId) startStationInteraction(contentId)
        }
        else if (floorHit) {
          const point = floorHit.point
          const portal = navigation.portal
          const onPortalPad = Math.abs(point.x - portal.x) <= 0.67 && Math.abs(point.z - portal.z) <= 0.46
          if (onPortalPad) startPortalInteraction(portal.destinationId)
          else moveTo({ x: point.x, z: point.z })
        }
      }
    }
    const handlePointerCancel = () => { pointerStart = null }
    const handleKeyDown = (event) => {
      if (event.target !== renderer?.domElement || event.altKey || event.ctrlKey || event.metaKey) return
      const key = event.key.toLowerCase()
      if (key === 'escape') {
        movementState.heldKeys.clear()
        movementState.path = []
        movementState.pathIndex = 0
        movementState.pendingInteraction = null
        movementState.mode = 'idle'
        setMovementStatus('Movement cancelled.')
        requestRender()
      } else if (movementKeys[key]) {
        event.preventDefault()
        setDirection(key, true)
      }
    }
    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase()
      if (movementKeys[key]) setDirection(key, false)
    }
    const clearHeldKeys = () => {
      if (!movementState?.heldKeys.size) return
      movementState.heldKeys.clear()
      if (!movementState.path.length) movementState.mode = 'idle'
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && renderFrame) {
        window.cancelAnimationFrame(renderFrame)
        renderFrame = 0
        clearHeldKeys()
      } else requestRender()
    }
    const handleContextLost = (event) => {
      event.preventDefault()
      destroyed = true
      if (renderFrame) window.cancelAnimationFrame(renderFrame)
      renderFrame = 0
      onFallbackRef.current?.('webgl-unavailable')
    }

    try {
      renderer = new WebGLRenderer({ alpha: false, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: avatarRigQA })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25))
      renderer.setSize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight), false)
      renderer.outputColorSpace = SRGBColorSpace
      renderer.toneMapping = ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.08
      renderer.setClearColor('#080d18', 1)
      renderer.domElement.tabIndex = 0
      renderer.domElement.setAttribute('role', 'application')
      renderer.domElement.setAttribute('aria-label', 'Interactive Operations HQ. Click a career display, training console, quality workstation, impact wall, or district portal. Mini Mark walks to selected areas, then offers the portal destination. Use WASD or arrow keys to move, click or tap open floor to walk, drag to rotate camera, and press Escape to cancel.')
      renderer.domElement.className = 'markverse-webgl-canvas markverse-hq-canvas'
      renderer.domElement.style.touchAction = 'none'
      host.appendChild(renderer.domElement)

      scene = new Scene()
      scene.background = new Color('#080d18')
      camera = new OrthographicCamera(-10, 10, 7, -7, 0.1, 80)
      updateCamera(camera, cameraViewRef.current, Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight), rigQaPose)
      owned = buildScene(scene)
      if (avatarRigQA) {
        for (const child of scene.children) {
          if (child !== owned.avatar.root && !child.isLight) child.visible = false
        }
        const rigGround = new Mesh(
          new PlaneGeometry(5.2, 5.2),
          new MeshStandardMaterial({ color: '#1b2639', roughness: 0.95 }),
        )
        rigGround.rotation.x = -Math.PI / 2
        rigGround.position.set(navigation.spawn.x, -0.012, navigation.spawn.z)
        scene.add(rigGround)
        for (const pivot of [owned.avatar.leftArm, owned.avatar.rightArm]) {
          pivot.add(new AxesHelper(0.3))
          pivot.add(new Mesh(new BoxGeometry(0.055, 0.055, 0.055), new MeshBasicMaterial({ color: '#fff2b3', toneMapped: false })))
        }
        owned.avatar.root.rotation.y = rigQaPose?.facing || 0
      }
      movementState = {
        x: navigation.spawn.x, z: navigation.spawn.z, path: [], pathIndex: 0, heldKeys: new Set(), mode: 'idle',
        facingTarget: rigQaPose?.facing || Math.PI, lastPathStart: navigation.spawn, lastPathDestination: null,
        lastPathFound: true, lastPathDistance: 0, lastPathfindingMs: 0, lastRoute: [],
      }
      walkPlane = new Mesh(new PlaneGeometry(room.width - 0.5, room.depth - 0.5), new MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: DoubleSide }))
      walkPlane.rotation.x = -Math.PI / 2
      walkPlane.position.y = 0.061
      walkPlane.name = 'operations-hq-walkable-floor-hit-surface'
      scene.add(walkPlane)
      rendererDetailsRef.current = readRendererDetails(renderer)
      controllerRef.current = { setDirection, moveTo, resetAvatar, interact: startStationInteraction, requestPortal: () => startPortalInteraction(navigation.portal.destinationId), cancelMovement, camera, requestRender }
      if (sceneControllerRef) sceneControllerRef.current = controllerRef.current

      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(host)
      renderer.domElement.addEventListener('pointerdown', handlePointerDown)
      renderer.domElement.addEventListener('pointermove', handlePointerMove)
      renderer.domElement.addEventListener('pointerup', handlePointerUp)
      renderer.domElement.addEventListener('pointercancel', handlePointerCancel)
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost)
      renderer.domElement.addEventListener('keydown', handleKeyDown)
      renderer.domElement.addEventListener('keyup', handleKeyUp)
      renderer.domElement.addEventListener('blur', clearHeldKeys)
      window.addEventListener('blur', clearHeldKeys)
      document.addEventListener('visibilitychange', handleVisibility)
      window.addEventListener('focus', handleVisibility)
      window.addEventListener('blur', handleVisibility)
      requestRender()
    } catch (error) {
      if (import.meta.env.DEV) console.error('MARKVERSE Operations HQ failed to initialize:', error)
      onFallbackRef.current?.(/webgl|context/i.test(error?.message || '') ? 'webgl-unavailable' : 'scene-error')
      setFailed(true)
    }

    return () => {
      destroyed = true
      if (renderFrame) window.cancelAnimationFrame(renderFrame)
      resizeObserver?.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
      window.removeEventListener('blur', handleVisibility)
      renderer?.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer?.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer?.domElement.removeEventListener('pointerup', handlePointerUp)
      renderer?.domElement.removeEventListener('pointercancel', handlePointerCancel)
      renderer?.domElement.removeEventListener('webglcontextlost', handleContextLost)
      renderer?.domElement.removeEventListener('keydown', handleKeyDown)
      renderer?.domElement.removeEventListener('keyup', handleKeyUp)
      renderer?.domElement.removeEventListener('blur', clearHeldKeys)
      window.removeEventListener('blur', clearHeldKeys)
      if (scene && owned) destroyScene(scene, owned)
      renderer?.dispose()
      renderer?.domElement.remove()
      rendererDetailsRef.current = null
      controllerRef.current = null
      if (sceneControllerRef) sceneControllerRef.current = null
    }
  }, [avatarRigQA, debug3d, debugNav, rigQaPose, sceneControllerRef])

  useEffect(() => {
    const controller = controllerRef.current
    const camera = controller?.camera
    const host = hostRef.current
    if (!controller || !camera || !host) return
    updateCamera(camera, cameraView, Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight), rigQaPose)
    controller.requestRender?.()
  }, [cameraView, rigQaPose])

  if (failed) return <OperationsHQFallback />
  const directionButton = (label, glyph, key) => (
    <button type="button" className="markverse-move-button" aria-label={label}
      onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); controllerRef.current?.setDirection(key, true) }}
      onPointerUp={() => controllerRef.current?.setDirection(key, false)}
      onPointerCancel={() => controllerRef.current?.setDirection(key, false)}
      onLostPointerCapture={() => controllerRef.current?.setDirection(key, false)}
    >{glyph}</button>
  )
  const saveRigFrame = () => {
    const canvas = hostRef.current?.querySelector('canvas')
    if (!canvas) return
    try {
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      const pose = new URLSearchParams(window.location.search).get('avatarPose') || 'front-idle'
      link.href = dataUrl
      link.download = `operations-hq-avatar-${pose}.png`
      link.click()
      setRigQaCaptureStatus('WebGL frame saved')
    } catch (error) {
      setRigQaCaptureStatus(`Capture failed: ${error.message}`)
    }
  }
  return (
    <div className="operations-hq-interactive">
      <div ref={hostRef} className="operations-hq-webgl" aria-label="Interactive Operations HQ" />
      {avatarRigQA && <div className="avatar-rig-qa-controls">
        <strong>RIG QA · {new URLSearchParams(window.location.search).get('avatarPose') || 'front-idle'}</strong>
        <button type="button" onClick={saveRigFrame}>Save WebGL frame</button>
        {rigQaCaptureStatus && <span role="status">{rigQaCaptureStatus}</span>}
      </div>}
      <div className="markverse-avatar-toolbar">
        <div className="markverse-avatar-pad" role="group" aria-label="Move Mini Mark around Operations HQ">
          {directionButton('Move Mini Mark forward', '↑', 'arrowup')}
          {directionButton('Move Mini Mark left', '←', 'arrowleft')}
          {directionButton('Move Mini Mark back', '↓', 'arrowdown')}
          {directionButton('Move Mini Mark right', '→', 'arrowright')}
        </div>
        <button type="button" className="markverse-avatar-reset" onClick={() => controllerRef.current?.resetAvatar()}>Reset Mini Mark</button>
        <p className="markverse-avatar-status" role="status" aria-live="polite">{movementStatus}</p>
      </div>
    </div>
  )
}

export { OPERATIONS_HQ_CAMERA_CONFIG, OPERATIONS_HQ_SCENE_CONFIG }
