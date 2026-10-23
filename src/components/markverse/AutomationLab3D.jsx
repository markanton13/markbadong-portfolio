import { useEffect, useRef, useState } from 'react'
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  BoxGeometry,
  CircleGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  PCFShadowMap,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import {
  findAvatarPath,
  getAvatarNavigationDebugGrid,
  measureAvatarPath,
  moveAvatarStep,
} from './avatarNavigation'
import { AutomationLabFallback } from './AutomationLabFallback'
import { AUTOMATION_LAB_DISTRICT } from './districtRegistry.js'

const ROOM = { width: 12, depth: 9, wallHeight: 4.1, floorTop: 0.24 }
const ACCENTS = ['#67e8cf', '#8b5cf6', '#3b82f6', '#f59e0b', '#fcd34d']
const NAVIGATION = AUTOMATION_LAB_DISTRICT.navigation
const RESET_POSITION = NAVIGATION.spawn
const TERMINAL_APPROACH = NAVIGATION.interactions.projectTerminal.approach
const CAMERA_CONFIG = AUTOMATION_LAB_DISTRICT.cameraConfig

function mergeBoxGeometries(parts) {
  const positions = []
  const normals = []
  const uvs = []
  const indices = []
  let vertexOffset = 0

  for (const part of parts) {
    const position = part.getAttribute('position')
    const normal = part.getAttribute('normal')
    const uv = part.getAttribute('uv')
    const index = part.getIndex()
    for (let i = 0; i < position.count; i += 1) {
      positions.push(position.getX(i), position.getY(i), position.getZ(i))
      normals.push(normal.getX(i), normal.getY(i), normal.getZ(i))
      uvs.push(uv.getX(i), uv.getY(i))
    }
    if (index) {
      for (let i = 0; i < index.count; i += 1) indices.push(index.getX(i) + vertexOffset)
    } else {
      for (let i = 0; i < position.count; i += 1) indices.push(i + vertexOffset)
    }
    vertexOffset += position.count
    part.dispose()
  }

  const merged = new BufferGeometry()
  merged.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  merged.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3))
  merged.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  merged.setIndex(indices)
  return merged
}

function createLabelTexture(title, accent = '#67e8cf') {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) return null
  context.fillStyle = '#091424'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = accent
  context.fillRect(0, 0, canvas.width, 6)
  context.fillStyle = '#dce8ff'
  context.font = '700 17px system-ui, sans-serif'
  context.fillText(title, 12, 31, 230)
  context.fillStyle = '#19304c'
  context.fillRect(12, 44, 150, 5)
  context.fillRect(12, 56, 208, 4)
  context.fillRect(12, 67, 185, 4)
  context.fillRect(12, 86, 58, 24)
  context.fillRect(77, 86, 58, 24)
  context.fillRect(141, 86, 58, 24)
  for (let i = 0; i < 8; i += 1) {
    context.fillStyle = ACCENTS[i % ACCENTS.length]
    context.fillRect(16 + i * 10, 95 + (i % 3) * 2, 5, 9 - (i % 3) * 2)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function buildLab(scene, renderer) {
  const geometry = new BoxGeometry(1, 1, 1)
  const materials = {
    shell: new MeshStandardMaterial({ color: '#19243a', roughness: 0.8, metalness: 0.18 }),
    shellLight: new MeshStandardMaterial({ color: '#34425c', roughness: 0.68, metalness: 0.2 }),
    floor: new MeshStandardMaterial({ color: '#27334a', roughness: 0.85, metalness: 0.08 }),
    tileA: new MeshStandardMaterial({ color: '#26334a', roughness: 0.78, metalness: 0.12 }),
    tileB: new MeshStandardMaterial({ color: '#202c41', roughness: 0.78, metalness: 0.12 }),
    darkMetal: new MeshStandardMaterial({ color: '#0c1424', roughness: 0.5, metalness: 0.52 }),
    metal: new MeshStandardMaterial({ color: '#53627d', roughness: 0.46, metalness: 0.58 }),
    desk: new MeshStandardMaterial({ color: '#51496f', roughness: 0.56, metalness: 0.18 }),
    wood: new MeshStandardMaterial({ color: '#795843', roughness: 0.72, metalness: 0.06 }),
    violet: new MeshStandardMaterial({ color: '#6244aa', roughness: 0.5, metalness: 0.18, emissive: '#26105d', emissiveIntensity: 0.18 }),
    teal: new MeshStandardMaterial({ color: '#287c82', roughness: 0.5, metalness: 0.18, emissive: '#0b4d4b', emissiveIntensity: 0.2 }),
    amber: new MeshStandardMaterial({ color: '#a76b26', roughness: 0.6, metalness: 0.15, emissive: '#633008', emissiveIntensity: 0.16 }),
    leaf: new MeshStandardMaterial({ color: '#34866d', roughness: 0.82, metalness: 0.02 }),
    skin: new MeshStandardMaterial({ color: '#d49a72', roughness: 0.78 }),
    jacket: new MeshStandardMaterial({ color: '#354b73', roughness: 0.8 }),
    hair: new MeshStandardMaterial({ color: '#171824', roughness: 0.92 }),
    screen: new MeshStandardMaterial({ color: '#0a2030', roughness: 0.3, metalness: 0.12, emissive: '#0b2735', emissiveIntensity: 0.48 }),
    ledMint: new MeshStandardMaterial({ color: '#67e8cf', emissive: '#67e8cf', emissiveIntensity: 1.8, roughness: 0.3 }),
    ledViolet: new MeshStandardMaterial({ color: '#9b7cf5', emissive: '#8b5cf6', emissiveIntensity: 1.5, roughness: 0.3 }),
    ledWarm: new MeshStandardMaterial({ color: '#ffd37e', emissive: '#f59e0b', emissiveIntensity: 1.7, roughness: 0.3 }),
  }
  const resources = new Set([geometry, ...Object.values(materials)])
  const screenMaterials = []
  const animated = { avatar: null, scanBars: [], glow: [] }

  function box(parent, position, size, material, options = {}) {
    const mesh = new Mesh(geometry, materials[material] || material)
    mesh.position.set(...position)
    mesh.scale.set(...size)
    mesh.castShadow = options.castShadow !== false
    mesh.receiveShadow = options.receiveShadow !== false
    if (options.rotation) mesh.rotation.set(...options.rotation)
    parent.add(mesh)
    return mesh
  }

  function mergeStaticBoxChildren(parent) {
    const batches = new Map()
    for (const child of [...parent.children]) {
      if (!child.isMesh || child.geometry !== geometry) continue
      child.updateMatrix()
      const batchKey = `${child.material.uuid}:${Number(child.castShadow)}:${Number(child.receiveShadow)}`
      const batch = batches.get(batchKey) || { material: child.material, castShadow: child.castShadow, receiveShadow: child.receiveShadow, geometries: [] }
      const transformed = geometry.clone()
      transformed.applyMatrix4(child.matrix)
      batch.geometries.push(transformed)
      batches.set(batchKey, batch)
      parent.remove(child)
    }
    for (const { material, castShadow, receiveShadow, geometries } of batches.values()) {
      const mergedGeometry = mergeBoxGeometries(geometries)
      mergedGeometry.computeBoundingSphere()
      resources.add(mergedGeometry)
      const mergedMesh = new Mesh(mergedGeometry, material)
      mergedMesh.castShadow = castShadow
      mergedMesh.receiveShadow = receiveShadow
      parent.add(mergedMesh)
    }
  }

  function addTextScreen(parent, position, width, height, title, accent, rotationY = 0) {
    const frame = box(parent, position, [width + 0.12, height + 0.12, 0.13], 'darkMetal')
    frame.rotation.y = rotationY
    const texture = createLabelTexture(title, accent)
    if (texture) resources.add(texture)
    const screenMaterial = new MeshBasicMaterial({ map: texture || null, color: texture ? '#ffffff' : accent, toneMapped: false })
    resources.add(screenMaterial)
    screenMaterials.push(screenMaterial)
    const screen = new Mesh(new PlaneGeometry(width, height), screenMaterial)
    resources.add(screen.geometry)
    screen.position.set(position[0], position[1], position[2] + 0.071)
    screen.rotation.y = rotationY
    parent.add(screen)
    return { frame, screen }
  }

  scene.background = new Color('#080d18')
  scene.fog = new Fog('#080d18', 26, 52)

  const hemisphere = new HemisphereLight('#bdd3ff', '#171927', 2.35)
  scene.add(hemisphere)
  const keyLight = new DirectionalLight('#ffedcf', 3.35)
  keyLight.position.set(5, 15, 9)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1024, 1024)
  keyLight.shadow.camera.left = -12
  keyLight.shadow.camera.right = 12
  keyLight.shadow.camera.top = 12
  keyLight.shadow.camera.bottom = -12
  keyLight.shadow.bias = -0.00025
  keyLight.shadow.normalBias = 0.025
  scene.add(keyLight)
  const fillLight = new DirectionalLight('#83a7ff', 1.15)
  fillLight.position.set(-9, 8, -3)
  scene.add(fillLight)
  const warmLamp = new PointLight('#ffc16e', 22, 8, 2)
  warmLamp.position.set(3.8, 3.1, 1.7)
  scene.add(warmLamp)
  const cyanLamp = new PointLight('#5ce1df', 13, 7, 2)
  cyanLamp.position.set(-2.5, 2.5, -2.6)
  scene.add(cyanLamp)
  animated.glow.push(warmLamp, cyanLamp)

  // Thick raised floor slab with instanced, flush-mounted tiles.
  box(scene, [0, 0, 0], [ROOM.width, ROOM.floorTop * 2, ROOM.depth], 'floor')
  const tileGeometry = new BoxGeometry(0.975, 0.025, 0.975)
  resources.add(tileGeometry)
  const tileMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.84, metalness: 0.08 })
  resources.add(tileMaterial)
  const tileCount = ROOM.width * ROOM.depth
  const tiles = new InstancedMesh(tileGeometry, tileMaterial, tileCount)
  const tileTransform = new Object3D()
  let tileIndex = 0
  for (let z = 0; z < ROOM.depth; z += 1) {
    for (let x = 0; x < ROOM.width; x += 1) {
      tileTransform.position.set(x - ROOM.width / 2 + 0.5, ROOM.floorTop + 0.014, z - ROOM.depth / 2 + 0.5)
      tileTransform.updateMatrix()
      tiles.setMatrixAt(tileIndex, tileTransform.matrix)
      tiles.setColorAt(tileIndex, new Color((x + z) % 2 ? '#202c41' : '#28364d'))
      tileIndex += 1
    }
  }
  tiles.castShadow = false
  tiles.receiveShadow = true
  scene.add(tiles)

  // Connected rear and left walls meet at one structural corner post.
  const wallCenterY = ROOM.floorTop + ROOM.wallHeight / 2
  box(scene, [0, wallCenterY, -4.34], [ROOM.width, ROOM.wallHeight, 0.34], 'shell')
  box(scene, [-5.84, wallCenterY, 0], [0.34, ROOM.wallHeight, ROOM.depth], 'shell')
  box(scene, [-5.84, wallCenterY, -4.34], [0.48, ROOM.wallHeight + 0.06, 0.48], 'shellLight')
  box(scene, [0, 4.42, -4.30], [12.15, 0.17, 0.49], 'shellLight')
  box(scene, [-5.80, 4.42, 0], [0.49, 0.17, 9.15], 'shellLight')
  box(scene, [0, 0.17, 4.47], [12.08, 0.34, 0.13], 'darkMetal')
  box(scene, [5.96, 0.17, 0], [0.13, 0.34, 9.08], 'darkMetal')
  // Low interior trim makes the wall-to-floor joint read as one built room.
  box(scene, [0, 0.46, -4.105], [11.7, 0.1, 0.12], 'metal', { castShadow: false })
  box(scene, [-5.605, 0.46, 0], [0.12, 0.1, 8.7], 'metal', { castShadow: false })
  box(scene, [0, 0.53, -4.085], [11.7, 0.025, 0.035], 'teal', { castShadow: false })
  box(scene, [-5.585, 0.53, 0], [0.035, 0.025, 8.7], 'teal', { castShadow: false })

  // Wall panels, practical strip lights, and mounted displays.
  box(scene, [-2.4, 3.93, -4.145], [5.3, 0.055, 0.055], 'violet', { castShadow: false })
  box(scene, [2.75, 3.93, -4.145], [4.0, 0.055, 0.055], 'teal', { castShadow: false })
  // Two purpose-built wall displays replace the old colored wall blocks. They
  // sit above the workstations and leave the pegboard, sign, and door clear.
  const wallDisplays = [
    { x: -3.05, width: 1.42, title: 'WORKFLOW MAP', accent: '#3b82f6' },
    { x: -1.36, width: 1.34, title: 'SYSTEM STATUS', accent: '#8b5cf6' },
  ]
  wallDisplays.forEach(({ x, width, title, accent }) => {
    addTextScreen(scene, [x, 3.25, -4.095], width, 0.82, title, accent)
    box(scene, [x, 2.77, -4.065], [width + 0.08, 0.055, 0.16], 'wood', { castShadow: false })
    box(scene, [x, 2.72, -4.025], [width * 0.72, 0.025, 0.035], 'ledWarm', { castShadow: false })
  })
  const backWallSign = addTextScreen(scene, [2.55, 3.57, -4.06], 2.5, 0.62, 'AUTOMATION LAB', '#67e8cf')
  backWallSign.frame.material = materials.darkMetal
  const signBorder = box(scene, [2.55, 3.57, -4.12], [2.68, 0.8, 0.08], 'teal', { castShadow: false })
  signBorder.position.z = -4.16

  // Shelves and readable storage are attached to the rear wall.
  for (const shelfY of [3.05, 2.33]) {
    box(scene, [-4.55, shelfY, -3.88], [1.35, 0.11, 0.64], 'wood')
    box(scene, [-5.08, shelfY - 0.23, -3.91], [0.14, 0.42, 0.54], 'metal')
    box(scene, [-4.02, shelfY - 0.23, -3.91], [0.14, 0.42, 0.54], 'metal')
  }
  ;['violet', 'teal', 'amber', 'metal'].forEach((material, index) => {
    box(scene, [-4.93 + index * 0.26, 3.31, -3.83], [0.16, 0.39 + (index % 2) * 0.12, 0.25], material)
    box(scene, [-4.93 + index * 0.26, 2.60, -3.83], [0.16, 0.39, 0.25], material)
  })

  function addDesk(x, z, width, depth, title, screenCount = 2) {
    const topY = 1.13
    box(scene, [x, topY, z], [width, 0.16, depth], 'desk')
    box(scene, [x, 1.02, z], [width * 0.92, 0.035, depth * 0.82], 'wood', { castShadow: false })
    box(scene, [x, 1.045, z + depth * 0.48], [width * 0.94, 0.12, 0.085], 'shellLight', { castShadow: false })
    box(scene, [x, 1.045, z + depth * 0.53], [width * 0.58, 0.025, 0.018], 'teal', { castShadow: false })
    for (const side of [-1, 1]) {
      for (const front of [-1, 1]) {
        box(scene, [x + side * (width / 2 - 0.13), 0.68, z + front * (depth / 2 - 0.13)], [0.13, 0.72, 0.13], 'darkMetal')
      }
    }
    box(scene, [x, 0.43, z], [width * 0.82, 0.12, depth * 0.65], 'metal')
    const drawerX = x - width * 0.31
    box(scene, [drawerX, 0.78, z], [0.48, 0.32, depth * 0.62], 'shellLight')
    box(scene, [drawerX, 0.78, z + depth * 0.32], [0.18, 0.035, 0.025], 'metal', { castShadow: false })
    const monitorWidth = screenCount === 1 ? 1.0 : 0.88
    const gap = 0.12
    const groupWidth = screenCount * monitorWidth + (screenCount - 1) * gap
    for (let index = 0; index < screenCount; index += 1) {
      const monitorX = x - groupWidth / 2 + monitorWidth / 2 + index * (monitorWidth + gap)
      box(scene, [monitorX, 1.62, z - depth * 0.28], [0.12, 0.38, 0.12], 'metal', { castShadow: false })
      box(scene, [monitorX, 1.88, z - depth * 0.28], [monitorWidth + 0.14, 0.68, 0.14], 'darkMetal', { castShadow: false })
      const texture = createLabelTexture(index === 0 ? title : 'SYSTEM STATUS', index ? '#8b5cf6' : '#67e8cf')
      if (texture) resources.add(texture)
      const screenMaterial = new MeshBasicMaterial({ map: texture || null, color: texture ? '#ffffff' : '#67e8cf', toneMapped: false })
      resources.add(screenMaterial)
      screenMaterials.push(screenMaterial)
      const plane = new Mesh(new PlaneGeometry(monitorWidth, 0.54), screenMaterial)
      resources.add(plane.geometry)
      plane.position.set(monitorX, 1.88, z - depth * 0.28 + 0.076)
      scene.add(plane)
      const scan = box(scene, [monitorX, 1.65, z - depth * 0.28 + 0.082], [monitorWidth - 0.06, 0.012, 0.007], 'ledMint', { castShadow: false })
      animated.scanBars.push({ mesh: scan, phase: index * 0.42 })
    }
    // Keyboard, mouse, and a small practical desk lamp.
    box(scene, [x, 1.225, z + depth * 0.23], [0.74, 0.035, 0.25], 'darkMetal', { castShadow: false })
    for (let key = 0; key < 9; key += 1) {
      box(scene, [x - 0.31 + key * 0.078, 1.249, z + depth * 0.23], [0.045, 0.012, 0.045], key === 4 ? 'teal' : 'metal', { castShadow: false })
    }
    box(scene, [x + width * 0.25, 1.23, z + depth * 0.18], [0.15, 0.055, 0.2], 'metal', { castShadow: false })
    box(scene, [x - width * 0.36, 1.29, z - depth * 0.15], [0.11, 0.12, 0.11], 'amber')
    box(scene, [x - width * 0.36, 1.39, z - depth * 0.15], [0.5, 0.045, 0.12], 'amber', { castShadow: false })
    const towerX = x + width * 0.34
    const towerZ = z + depth * 0.08
    box(scene, [towerX, 0.66, towerZ], [0.34, 0.65, 0.46], 'darkMetal')
    box(scene, [towerX, 0.69, towerZ + 0.235], [0.23, 0.42, 0.018], 'metal', { castShadow: false })
    for (let vent = 0; vent < 3; vent += 1) box(scene, [towerX, 0.55 + vent * 0.1, towerZ + 0.25], [0.15, 0.018, 0.008], 'darkMetal', { castShadow: false })
    box(scene, [towerX + 0.1, 0.9, towerZ + 0.255], [0.045, 0.045, 0.018], 'ledMint', { castShadow: false })
  }

  addDesk(-1.85, -2.65, 3.25, 1.35, 'WORKFLOW MAP', 2)
  addDesk(1.05, -0.05, 2.55, 1.35, 'AUTOMATION', 2)

  function addServerRack(z) {
    const rack = new Group()
    rack.position.set(-5.18, ROOM.floorTop, z)
    rack.rotation.y = Math.PI / 2
    scene.add(rack)
    box(rack, [0, 1.38, 0], [0.93, 2.72, 1.12], 'darkMetal')
    box(rack, [0, 1.38, 0.58], [0.86, 2.63, 0.09], 'metal')
    box(rack, [0, 1.38, 0.635], [0.72, 2.45, 0.035], 'darkMetal', { castShadow: false })
    for (const railX of [-0.38, 0.38]) {
      box(rack, [railX, 1.38, 0.668], [0.035, 2.47, 0.03], 'metal', { castShadow: false })
    }
    box(rack, [0, 2.73, 0.66], [0.8, 0.09, 0.045], 'violet', { castShadow: false })
    const ledPositions = { ledMint: [], ledViolet: [] }
    for (let row = 0; row < 7; row += 1) {
      const y = 0.42 + row * 0.31
      box(rack, [0, y, 0.665], [0.57, 0.2, 0.035], row % 2 ? 'metal' : 'shellLight', { castShadow: false })
      for (let vent = 0; vent < 3; vent += 1) {
        box(rack, [-0.27, y - 0.045 + vent * 0.045, 0.69], [0.09, 0.012, 0.012], 'darkMetal', { castShadow: false })
      }
      for (let led = 0; led < 3; led += 1) {
        ledPositions[led % 2 ? 'ledViolet' : 'ledMint'].push([-0.22 + led * 0.18, y + 0.015, 0.688])
      }
    }
    const ledTransform = new Object3D()
    for (const [materialName, positions] of Object.entries(ledPositions)) {
      const indicators = new InstancedMesh(geometry, materials[materialName], positions.length)
      positions.forEach(([x, y, ledZ], ledIndex) => {
        ledTransform.position.set(x, y, ledZ)
        ledTransform.scale.set(0.045, 0.045, 0.018)
        ledTransform.updateMatrix()
        indicators.setMatrixAt(ledIndex, ledTransform.matrix)
      })
      indicators.instanceMatrix.needsUpdate = true
      indicators.castShadow = false
      indicators.receiveShadow = false
      rack.add(indicators)
    }
    mergeStaticBoxChildren(rack)
  }
  addServerRack(-2.37)
  addServerRack(-0.67)

  function addChair(x, z, rotation = 0) {
    const chair = new Group()
    chair.position.set(x, ROOM.floorTop, z)
    chair.rotation.y = rotation
    scene.add(chair)
    box(chair, [0, 0.56, 0], [0.84, 0.18, 0.77], 'violet')
    box(chair, [0, 1.0, -0.31], [0.78, 0.78, 0.16], 'desk')
    box(chair, [0, 0.34, 0], [0.16, 0.35, 0.16], 'metal')
    box(chair, [0, 0.13, 0], [0.72, 0.08, 0.72], 'darkMetal')
    for (const armX of [-0.49, 0.49]) {
      box(chair, [armX, 0.84, -0.04], [0.09, 0.09, 0.58], 'metal')
      box(chair, [armX, 0.68, 0.18], [0.08, 0.28, 0.08], 'darkMetal')
    }
    for (const [legX, legZ] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]]) {
      box(chair, [legX, 0.07, legZ], [0.13, 0.1, 0.13], 'metal')
    }
    mergeStaticBoxChildren(chair)
  }
  addChair(-1.85, -1.34, Math.PI)
  addChair(1.05, 1.0, Math.PI)

  // A compact instrument bench and floor-level cable trunking.
  box(scene, [3.45, 0.98, -2.25], [2.2, 0.14, 1.32], 'wood')
  for (const x of [2.55, 4.34]) box(scene, [x, 0.64, -2.25], [0.12, 0.64, 1.1], 'darkMetal')
  box(scene, [3.48, 1.09, -2.23], [0.8, 0.055, 0.55], 'darkMetal')
  box(scene, [3.5, 1.15, -2.2], [0.42, 0.09, 0.4], 'amber')
  box(scene, [3.55, 0.51, -3.15], [2.5, 0.09, 0.12], 'metal')

  // Physical interactive kiosk faces the open room; a transparent hit volume
  // makes the screen reliably selectable while the DOM button remains available.
  const terminal = new Group()
  terminal.position.set(4.85, ROOM.floorTop, 0.35)
  terminal.rotation.y = -Math.PI / 2
  terminal.userData.isTerminal = true
  scene.add(terminal)
  box(terminal, [0, 0.72, 0], [0.9, 1.44, 0.64], 'shellLight')
  box(terminal, [0, 0.09, 0.03], [1.32, 0.18, 0.9], 'darkMetal')
  box(terminal, [0, 0.48, 0.34], [0.68, 0.34, 0.045], 'teal', { castShadow: false })
  box(terminal, [0, 1.13, 0.34], [0.68, 0.66, 0.045], 'darkMetal', { castShadow: false })
  const terminalTexture = createLabelTexture('PROJECT TERMINAL', '#67e8cf')
  if (terminalTexture) resources.add(terminalTexture)
  const terminalSurface = new Mesh(new PlaneGeometry(0.6, 0.58), new MeshBasicMaterial({ map: terminalTexture || null, color: terminalTexture ? '#fff' : '#67e8cf', toneMapped: false }))
  resources.add(terminalSurface.geometry)
  resources.add(terminalSurface.material)
  terminalSurface.position.set(0, 1.13, 0.369)
  terminal.add(terminalSurface)
  const terminalHit = new Mesh(new BoxGeometry(0.85, 1.23, 0.08), new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
  resources.add(terminalHit.geometry)
  resources.add(terminalHit.material)
  terminalHit.position.set(0, 1.05, 0.4)
  terminalHit.userData.isTerminal = true
  terminal.add(terminalHit)
  const terminalAccent = box(terminal, [0, 1.58, 0.38], [0.7, 0.045, 0.035], 'ledMint', { castShadow: false })
  animated.glow.push(terminalAccent.material)
  mergeStaticBoxChildren(terminal)

  const districtPortal = NAVIGATION.portal
  box(scene, [districtPortal.position.x - 0.95, 1.28, districtPortal.position.z], [0.14, 2.56, 0.22], 'shellLight')
  box(scene, [districtPortal.position.x + 0.95, 1.28, districtPortal.position.z], [0.14, 2.56, 0.22], 'shellLight')
  box(scene, [districtPortal.position.x, 2.49, districtPortal.position.z], [2.05, 0.16, 0.22], 'shellLight')
  for (const side of [-1, 1]) {
    const portalGlow = box(scene, [districtPortal.position.x + side * 0.86, 1.3, districtPortal.position.z + 0.125], [0.055, 2.16, 0.035], side < 0 ? 'ledViolet' : 'ledMint', { castShadow: false })
    animated.glow.push(portalGlow.material)
  }
  const portalLabel = createLabelTexture('OPERATIONS HQ · EXIT', '#fcd34d')
  if (portalLabel) resources.add(portalLabel)
  const portalSignMaterial = new MeshBasicMaterial({ map: portalLabel || null, color: portalLabel ? '#fff' : '#fcd34d', toneMapped: false })
  resources.add(portalSignMaterial)
  const portalSign = new Mesh(new PlaneGeometry(1.7, 0.5), portalSignMaterial)
  resources.add(portalSign.geometry)
  portalSign.position.set(districtPortal.position.x, 2.0, districtPortal.position.z + 0.15)
  scene.add(portalSign)
  const portalHit = new Mesh(new BoxGeometry(1.72, 2.28, 0.14), new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
  resources.add(portalHit.geometry)
  resources.add(portalHit.material)
  portalHit.position.set(districtPortal.position.x, 1.26, districtPortal.position.z)
  portalHit.userData.isDistrictPortal = true
  scene.add(portalHit)

  // Wall-mounted pegboard tools, a framed project map, and an entry light.
  box(scene, [0.48, 2.68, -4.08], [2.05, 1.15, 0.13], 'wood')
  box(scene, [0.48, 2.68, -3.995], [1.88, 0.98, 0.04], 'darkMetal', { castShadow: false })
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      box(scene, [-0.28 + col * 0.25, 2.35 + row * 0.22, -3.966], [0.045, 0.045, 0.018], (col + row) % 3 ? 'metal' : 'teal', { castShadow: false })
    }
  }
  box(scene, [4.8, 2.2, -4.065], [0.92, 1.7, 0.12], 'wood')
  box(scene, [4.8, 2.2, -3.985], [0.72, 1.5, 0.04], 'darkMetal', { castShadow: false })
  box(scene, [4.8, 2.2, -3.951], [0.48, 1.2, 0.018], 'amber', { castShadow: false })
  box(scene, [5.55, 1.95, -3.97], [0.1, 2.5, 0.12], 'teal', { castShadow: false })

  // Plant pots, stacked work crates, and a small box-shaped assistant bot.
  function addPlant(x, z, scale = 1) {
    box(scene, [x, ROOM.floorTop + 0.2 * scale, z], [0.42 * scale, 0.4 * scale, 0.42 * scale], 'wood')
    for (let i = 0; i < 5; i += 1) {
      const angle = i * Math.PI * 0.4
      box(scene, [x + Math.sin(angle) * 0.18 * scale, ROOM.floorTop + (0.63 + (i % 2) * 0.12) * scale, z + Math.cos(angle) * 0.16 * scale], [0.13 * scale, 0.52 * scale, 0.13 * scale], 'leaf', { rotation: [0.12 * Math.cos(angle), angle, 0.18 * Math.sin(angle)] })
    }
  }
  addPlant(4.45, -3.05, 1)
  addPlant(-3.82, 1.86, 0.78)
  box(scene, [3.85, ROOM.floorTop + 0.26, 1.72], [0.64, 0.52, 0.62], 'violet')
  box(scene, [4.45, ROOM.floorTop + 0.22, 2.25], [0.52, 0.44, 0.52], 'amber')
  box(scene, [4.43, ROOM.floorTop + 0.52, 2.25], [0.5, 0.12, 0.5], 'wood')

  const robot = new Group()
  robot.position.set(2.9, ROOM.floorTop, 1.15)
  robot.rotation.y = -0.32
  scene.add(robot)
  box(robot, [0, 0.35, 0], [0.52, 0.62, 0.42], 'metal')
  box(robot, [0, 0.86, 0], [0.64, 0.48, 0.52], 'shellLight')
  box(robot, [0, 0.86, 0.275], [0.43, 0.22, 0.025], 'screen', { castShadow: false })
  box(robot, [-0.11, 0.86, 0.295], [0.075, 0.07, 0.03], 'ledMint', { castShadow: false })
  box(robot, [0.11, 0.86, 0.295], [0.075, 0.07, 0.03], 'ledMint', { castShadow: false })
  box(robot, [-0.4, 0.35, 0], [0.18, 0.5, 0.18], 'teal')
  box(robot, [0.4, 0.35, 0], [0.18, 0.5, 0.18], 'teal')
  box(robot, [-0.15, 0.015, 0], [0.22, 0.11, 0.3], 'darkMetal')
  box(robot, [0.15, 0.015, 0], [0.22, 0.11, 0.3], 'darkMetal')
  mergeStaticBoxChildren(robot)

  // Original voxel Mark avatar. The hair cap is recessed behind the forehead;
  // the fringe meets, rather than overlaps, the face plane to avoid z-fighting.
  const avatar = new Group()
  avatar.position.set(RESET_POSITION.x, ROOM.floorTop, RESET_POSITION.z)
  scene.add(avatar)
  function avatarBox(parent, position, size, material, options = {}) {
    return box(parent, position, size, material, { ...options, castShadow: false })
  }
  const bodyPivot = new Group()
  bodyPivot.position.y = 0.55
  avatar.add(bodyPivot)
  const torso = new Group()
  torso.position.y = -0.55
  bodyPivot.add(torso)
  avatarBox(torso, [0, 0.86, 0], [0.52, 0.74, 0.36], 'jacket')
  avatarBox(torso, [0, 1.24, 0.195], [0.15, 0.13, 0.045], 'teal')
  avatarBox(torso, [0, 1.29, 0.222], [0.04, 0.035, 0.014], 'ledWarm')
  mergeStaticBoxChildren(torso)

  const head = new Group()
  head.position.y = 0.93
  bodyPivot.add(head)
  avatarBox(head, [0, 0.04, 0], [0.56, 0.58, 0.5], 'skin')
  avatarBox(head, [0, 0.30, -0.035], [0.62, 0.18, 0.46], 'hair')
  avatarBox(head, [0, 0.17, 0.2675], [0.46, 0.09, 0.035], 'hair')
  avatarBox(head, [-0.235, 0.13, -0.035], [0.13, 0.20, 0.39], 'hair')
  avatarBox(head, [0.235, 0.13, -0.035], [0.13, 0.20, 0.39], 'hair')
  // Rear shell closes the exposed back of the scalp; the narrower nape block
  // keeps a stepped voxel silhouette while staying above the jacket shoulders.
  avatarBox(head, [0, 0.14, -0.235], [0.48, 0.28, 0.05], 'hair')
  avatarBox(head, [0, -0.04, -0.232], [0.36, 0.16, 0.05], 'hair')
  avatarBox(head, [-0.13, 0.06, 0.268], [0.055, 0.055, 0.025], 'darkMetal')
  avatarBox(head, [0.13, 0.06, 0.268], [0.055, 0.055, 0.025], 'darkMetal')
  mergeStaticBoxChildren(head)

  const leftLeg = new Group()
  leftLeg.position.set(-0.14, 0.55, 0)
  avatar.add(leftLeg)
  avatarBox(leftLeg, [0, -0.26, 0], [0.2, 0.53, 0.22], 'darkMetal')
  avatarBox(leftLeg, [-0.02, -0.48, 0.035], [0.28, 0.14, 0.36], 'teal')
  mergeStaticBoxChildren(leftLeg)
  const rightLeg = new Group()
  rightLeg.position.set(0.14, 0.55, 0)
  avatar.add(rightLeg)
  avatarBox(rightLeg, [0, -0.26, 0], [0.2, 0.53, 0.22], 'darkMetal')
  avatarBox(rightLeg, [0.02, -0.48, 0.035], [0.28, 0.14, 0.36], 'teal')
  mergeStaticBoxChildren(rightLeg)

  function addArm(side) {
    const arm = new Group()
    arm.position.set(side * 0.27, 0.62, 0)
    bodyPivot.add(arm)
    avatarBox(arm, [side * 0.08, -0.28, 0], [0.2, 0.67, 0.23], 'jacket', { rotation: [0, 0, side * 0.1] })
    avatarBox(arm, [side * 0.09, -0.62, 0.02], [0.16, 0.15, 0.17], 'skin')
    mergeStaticBoxChildren(arm)
    return arm
  }
  const leftArm = addArm(-1)
  const rightArm = addArm(1)
  const contactShadow = new Mesh(new CircleGeometry(0.34, 8), new MeshBasicMaterial({ color: '#07101e', transparent: true, opacity: 0.38, depthWrite: false, side: DoubleSide }))
  contactShadow.rotation.x = -Math.PI / 2
  contactShadow.position.y = 0.01
  contactShadow.renderOrder = 1
  avatar.add(contactShadow)
  resources.add(contactShadow.geometry)
  resources.add(contactShadow.material)
  animated.avatar = {
    root: avatar,
    bodyPivot,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    moveState: 'idle',
    walkCycle: 0,
    lastPoseTime: null,
    interactionOpened: false,
    interactionOpenedAt: 0,
    interactionPanelOpen: false,
  }

  // Warm practical lights and restrained neon embedded along the floor edge.
  const floorStrip = box(scene, [0.4, ROOM.floorTop + 0.032, 4.36], [2.2, 0.025, 0.045], 'ledMint', { castShadow: false })
  animated.glow.push(floorStrip.material)
  const warmStrip = box(scene, [4.96, ROOM.floorTop + 0.032, 2.78], [0.045, 0.025, 1.7], 'ledWarm', { castShadow: false })
  animated.glow.push(warmStrip.material)
  // A restrained floor inlay frames the shared work zone without changing the
  // walkable surface or introducing extra draw calls after static batching.
  box(scene, [0.7, ROOM.floorTop + 0.029, -1.02], [3.25, 0.018, 0.035], 'ledMint', { castShadow: false })
  box(scene, [2.34, ROOM.floorTop + 0.029, 0.38], [0.035, 0.018, 2.82], 'ledMint', { castShadow: false })
  box(scene, [0.7, ROOM.floorTop + 0.029, 1.79], [3.25, 0.018, 0.035], 'ledMint', { castShadow: false })
  box(scene, [-0.93, ROOM.floorTop + 0.029, 0.38], [0.035, 0.018, 2.82], 'ledMint', { castShadow: false })

  // Batch static room boxes by material so software renderers do not issue one draw per prop.
  const animatedMeshes = new Set(animated.scanBars.map(({ mesh }) => mesh))
  const staticBoxesByMaterial = new Map()
  for (const child of [...scene.children]) {
    if (!child.isMesh || child.geometry !== geometry || animatedMeshes.has(child)) continue
    child.updateMatrixWorld(true)
    const batchKey = `${child.material.uuid}:${Number(child.castShadow)}:${Number(child.receiveShadow)}`
    const batch = staticBoxesByMaterial.get(batchKey) || { material: child.material, castShadow: child.castShadow, receiveShadow: child.receiveShadow, geometries: [] }
    const transformedGeometry = geometry.clone()
    transformedGeometry.applyMatrix4(child.matrixWorld)
    batch.geometries.push(transformedGeometry)
    staticBoxesByMaterial.set(batchKey, batch)
    scene.remove(child)
  }
  for (const { material, castShadow, receiveShadow, geometries } of staticBoxesByMaterial.values()) {
    const mergedGeometry = mergeBoxGeometries(geometries)
    mergedGeometry.computeBoundingSphere()
    resources.add(mergedGeometry)
    const mergedMesh = new Mesh(mergedGeometry, material)
    mergedMesh.castShadow = castShadow
    mergedMesh.receiveShadow = receiveShadow
    scene.add(mergedMesh)
  }

  const terminalTargets = [terminalHit, portalHit]
  const raycaster = new Raycaster()
  const pointer = new Vector2()
  const canvas = renderer.domElement
  const walkPlane = new Mesh(new PlaneGeometry(ROOM.width - 0.34, ROOM.depth - 0.34), new MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0, side: DoubleSide }))
  walkPlane.rotation.x = -Math.PI / 2
  walkPlane.position.y = ROOM.floorTop + 0.03
  scene.add(walkPlane)
  resources.add(walkPlane.geometry)
  resources.add(walkPlane.material)
  const navigation = {
    x: RESET_POSITION.x,
    z: RESET_POSITION.z,
    path: [],
    pathIndex: 0,
    mode: 'idle',
    heldKeys: new Set(),
    accumulator: 0,
    lastTime: null,
    interactionStarted: 0,
    interactionAngle: 0,
    facingTarget: 0,
    terminalPending: false,
    portalPending: false,
    portalOpened: false,
    interactionOpened: false,
    interactionOpenedAt: 0,
    interactionPanelOpen: false,
    message: '',
    announcedMessage: '',
    lastPathfindingMs: 0,
    lastPathFound: true,
    lastPathNodes: 0,
    lastPathDistance: 0,
    lastPathStart: { x: RESET_POSITION.x, z: RESET_POSITION.z },
    lastPathDestination: null,
    lastRoute: [],
  }
  const directionKeys = {
    w: [0, -1], arrowup: [0, -1],
    s: [0, 1], arrowdown: [0, 1],
    a: [-1, 0], arrowleft: [-1, 0],
    d: [1, 0], arrowright: [1, 0],
  }
  const terminalAngle = NAVIGATION.interactions.projectTerminal.facingAngle

  function setMoveDirection(key, active) {
    const normalized = String(key).toLowerCase()
    if (!directionKeys[normalized]) return
    if (active) {
      navigation.heldKeys.add(normalized)
      navigation.path = []
      navigation.terminalPending = false
      navigation.portalPending = false
      navigation.mode = 'walking'
    } else {
      navigation.heldKeys.delete(normalized)
      if (!navigation.heldKeys.size && !navigation.path.length && navigation.mode !== 'interacting') navigation.mode = 'idle'
    }
  }

  function requestMoveTo(destination) {
    navigation.terminalPending = false
    navigation.portalPending = false
    navigation.portalOpened = false
    navigation.interactionOpened = false
    navigation.interactionPanelOpen = false
    navigation.lastPathStart = { x: navigation.x, z: navigation.z }
    navigation.lastPathDestination = { x: destination.x, z: destination.z }
    const pathStarted = performance.now()
    const path = findAvatarPath({ x: navigation.x, z: navigation.z }, destination, NAVIGATION)
    navigation.lastPathfindingMs = performance.now() - pathStarted
    navigation.lastPathFound = Boolean(path)
    navigation.lastPathNodes = path?.length || 0
    navigation.lastPathDistance = measureAvatarPath(path)
    navigation.lastRoute = path || []
    if (!path) {
      navigation.path = []
      navigation.mode = 'idle'
      navigation.terminalPending = false
      navigation.message = 'No clear route. Project details remain available from the open project button.'
      return false
    }
    navigation.heldKeys.clear()
    navigation.path = path.slice(1)
    navigation.pathIndex = 0
    navigation.mode = navigation.path.length ? 'walking' : 'idle'
    navigation.message = navigation.path.length ? 'Walking to the selected position.' : 'Mark is already at that position.'
    return true
  }

  function requestTerminal() {
    navigation.interactionAngle = terminalAngle
    if (!requestMoveTo(TERMINAL_APPROACH)) {
      navigation.message = 'No clear route to the terminal. Open project details from the button above.'
      return false
    } else {
      navigation.terminalPending = true
      if (!navigation.path.length) navigation.mode = 'approaching'
      navigation.message = 'Walking to the project terminal.'
      return true
    }
  }

  function requestPortal() {
    navigation.interactionAngle = NAVIGATION.portal.facingAngle
    if (!requestMoveTo(NAVIGATION.portal.approach)) return false
    navigation.portalPending = true
    if (!navigation.path.length) navigation.mode = 'approaching'
    navigation.message = `Walking to the ${NAVIGATION.portal.destinationId.replaceAll('-', ' ')} portal.`
    return true
  }

  function cancelMovement() {
    navigation.heldKeys.clear()
    navigation.path = []
    navigation.terminalPending = false
    navigation.portalPending = false
    navigation.portalOpened = false
    navigation.interactionOpened = false
    navigation.interactionPanelOpen = false
    navigation.mode = 'idle'
  }

  function resetAvatar() {
    cancelMovement()
    navigation.x = RESET_POSITION.x
    navigation.z = RESET_POSITION.z
    navigation.mode = 'idle'
    navigation.lastTime = null
    avatar.rotation.y = 0
    avatar.position.set(navigation.x, ROOM.floorTop, navigation.z)
  }

  function pointerRay(event, camera) {
    const bounds = canvas.getBoundingClientRect()
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
  }

  function pickPointer(event, camera) {
    pointerRay(event, camera)
    const hits = raycaster.intersectObjects(scene.children, true)
    const first = hits.find((hit) => {
      let node = hit.object
      while (node) {
        if (node === avatar) return false
        node = node.parent
      }
      return true
    })
    if (!first) return null
    let node = first.object
    while (node) {
      if (node.userData?.isTerminal) return { type: 'terminal' }
      if (node.userData?.isDistrictPortal) return { type: 'portal' }
      node = node.parent
    }
    if (first.object === walkPlane || first.object === tiles) {
      const floorHit = first.object === walkPlane ? first : raycaster.intersectObject(walkPlane, false)[0]
      return floorHit ? { type: 'floor', point: floorHit.point } : null
    }
    return null
  }

  const interaction = {
    scene,
    renderer,
    terminalTargets,
    raycaster,
    pointer,
    camera: null,
    hitTerminal(event, camera) {
      pointerRay(event, camera)
      return raycaster.intersectObjects(terminalTargets, false).length > 0
    },
    pickPointer,
    setMoveDirection,
    requestMoveTo,
    requestTerminal,
    requestPortal,
    cancelMovement,
    setProjectPanelOpen(open) {
      if (open && navigation.mode === 'interacting' && navigation.interactionOpened) {
        navigation.interactionPanelOpen = true
      } else if (!open) {
        navigation.interactionPanelOpen = false
        if (navigation.mode === 'interacting' && navigation.interactionOpened) {
          navigation.mode = 'idle'
          navigation.interactionOpened = false
          navigation.terminalPending = false
        }
      }
    },
    resetAvatar,
    getNavigationDiagnostics() {
      return {
        mode: navigation.mode,
        position: { x: Number(navigation.x.toFixed(2)), z: Number(navigation.z.toFixed(2)) },
        pendingWaypoints: Math.max(0, navigation.path.length - navigation.pathIndex),
        terminalPending: navigation.terminalPending,
        lastPathMs: Number(navigation.lastPathfindingMs.toFixed(2)),
        lastPathFound: navigation.lastPathFound,
        lastPathNodes: navigation.lastPathNodes,
        lastPathDistance: Number(navigation.lastPathDistance.toFixed(2)),
        hasPathPlan: Boolean(navigation.lastPathDestination),
        lastPathStart: navigation.lastPathStart,
        lastPathDestination: navigation.lastPathDestination,
        lastRoute: navigation.lastRoute,
        terminalApproach: TERMINAL_APPROACH,
      }
    },
    avatar,
    update(time, openTerminal, onStatus, onPortalApproach) {
      const rig = animated.avatar
      if (navigation.lastTime === null) navigation.lastTime = time
      navigation.accumulator += Math.min(0.05, Math.max(0, time - navigation.lastTime))
      navigation.lastTime = time
      const fixedStep = 1 / 60
      let didWalk = false
      while (navigation.accumulator >= fixedStep) {
        const keys = [...navigation.heldKeys].map((key) => directionKeys[key])
        let dx = keys.reduce((sum, value) => sum + value[0], 0)
        let dz = keys.reduce((sum, value) => sum + value[1], 0)
        const digitalActive = Math.hypot(dx, dz) > 0
        if (digitalActive) {
          const length = Math.hypot(dx, dz)
          dx /= length
          dz /= length
          navigation.path = []
          navigation.pathIndex = 0
          didWalk = true
          const next = moveAvatarStep(navigation, { x: dx, z: dz }, 2.05 * fixedStep, NAVIGATION)
          navigation.x = next.x
          navigation.z = next.z
          navigation.facingTarget = Math.atan2(dx, dz)
          const facingDelta = Math.atan2(Math.sin(navigation.facingTarget - rig.root.rotation.y), Math.cos(navigation.facingTarget - rig.root.rotation.y))
          rig.root.rotation.y += facingDelta * (1 - Math.exp(-12 * fixedStep))
        } else if (navigation.pathIndex < navigation.path.length) {
          const waypoint = navigation.path[navigation.pathIndex]
          const vx = waypoint.x - navigation.x
          const vz = waypoint.z - navigation.z
          const distance = Math.hypot(vx, vz)
          if (distance < 0.045) {
            navigation.x = waypoint.x
            navigation.z = waypoint.z
            navigation.pathIndex += 1
          } else {
            const speed = 2.35
            const step = Math.min(distance, speed * fixedStep)
            const direction = { x: vx / distance, z: vz / distance }
            const next = moveAvatarStep(navigation, direction, step, NAVIGATION)
            if (Math.hypot(next.x - navigation.x, next.z - navigation.z) < 0.0001) {
              navigation.path = []
              navigation.pathIndex = 0
              navigation.terminalPending = false
              navigation.mode = 'idle'
              navigation.message = 'Movement stopped at a blocked area. Project details remain available from the button above.'
              navigation.accumulator -= fixedStep
              continue
            }
            navigation.x = next.x
            navigation.z = next.z
            didWalk = true
            const desiredAngle = Math.atan2(direction.x, direction.z)
            navigation.facingTarget = desiredAngle
            const angleDelta = Math.atan2(Math.sin(navigation.facingTarget - rig.root.rotation.y), Math.cos(navigation.facingTarget - rig.root.rotation.y))
            rig.root.rotation.y += angleDelta * (1 - Math.exp(-12 * fixedStep))
          }
          if (navigation.pathIndex >= navigation.path.length) {
            navigation.path = []
            navigation.pathIndex = 0
            if (navigation.terminalPending || navigation.portalPending) {
              navigation.mode = 'approaching'
            } else navigation.mode = 'idle'
          }
        }
        if (navigation.mode === 'approaching') {
          const targetAngle = navigation.interactionAngle
          navigation.facingTarget = targetAngle
          const delta = Math.atan2(Math.sin(targetAngle - rig.root.rotation.y), Math.cos(targetAngle - rig.root.rotation.y))
          rig.root.rotation.y += delta * (1 - Math.exp(-12 * fixedStep))
          if (Math.abs(delta) < 0.035) {
            navigation.mode = 'interacting'
            navigation.interactionStarted = time
            navigation.message = 'Mark is interacting with the project terminal.'
          }
        }
        navigation.accumulator -= fixedStep
      }

      if (rig) {
        const moving = didWalk || navigation.heldKeys.size > 0
        rig.moveState = moving ? 'walking' : navigation.mode
        if (navigation.mode === 'interacting' && navigation.portalPending && !navigation.portalOpened && time - navigation.interactionStarted >= 0.42) {
          navigation.portalOpened = true
          navigation.portalPending = false
          navigation.mode = 'idle'
          navigation.message = 'At the district portal. Choose whether to travel.'
          onPortalApproach?.(NAVIGATION.portal.destinationId, renderer.domElement)
        } else if (navigation.mode === 'interacting' && !navigation.interactionOpened && time - navigation.interactionStarted >= 0.86) {
          navigation.interactionOpened = true
          navigation.interactionOpenedAt = time
          navigation.message = 'Project terminal opened.'
          openTerminal?.()
        } else if (navigation.mode === 'interacting' && navigation.interactionOpened && !navigation.interactionPanelOpen && time - navigation.interactionOpenedAt >= 2) {
          // If a parent UI callback fails, release the actor instead of leaving
          // the avatar stuck in a workstation pose. Project access stays available.
          navigation.mode = 'idle'
          navigation.terminalPending = false
          navigation.interactionOpened = false
        }
        rig.root.position.set(navigation.x, ROOM.floorTop, navigation.z)
        const poseDelta = rig.lastPoseTime === null ? 0 : MathUtils.clamp(time - rig.lastPoseTime, 0, 0.1)
        rig.lastPoseTime = time
        rig.walkCycle += poseDelta * (moving ? 9.2 : 0)
        rig.walkBlend = MathUtils.damp(rig.walkBlend || 0, moving ? 1 : 0, moving ? 10 : 7, poseDelta)
        const interacting = navigation.mode === 'interacting'
        rig.interactionBlend = MathUtils.damp(rig.interactionBlend || 0, interacting ? 1 : 0, interacting ? 8 : 7, poseDelta)
        const walkBlend = rig.walkBlend
        const interactionBlend = rig.interactionBlend
        const idleBlend = Math.max(0, 1 - walkBlend - interactionBlend)
        const walkSwing = Math.sin(rig.walkCycle) * 0.46 * walkBlend
        const breathing = Math.sin(time * 1.35) * 0.014 * idleBlend
        const typing = interacting && navigation.interactionOpened ? Math.sin(time * 18) * 0.035 : 0
        const dampPose = (current, target, speed = 10) => MathUtils.damp(current, target, speed, poseDelta)

        // Body parts stay under named pivots so breath, stride, and workstation
        // poses ease between states instead of snapping on a single frame.
        rig.bodyPivot.position.y = dampPose(rig.bodyPivot.position.y, 0.55 + breathing - interactionBlend * 0.025)
        rig.bodyPivot.rotation.x = dampPose(rig.bodyPivot.rotation.x, interactionBlend * 0.11)
        rig.bodyPivot.rotation.z = dampPose(rig.bodyPivot.rotation.z, Math.sin(time * 0.46) * 0.018 * idleBlend, 5)
        rig.torso.rotation.z = dampPose(rig.torso.rotation.z, Math.sin(time * 0.72) * 0.012 * idleBlend, 5)
        rig.leftLeg.rotation.x = dampPose(rig.leftLeg.rotation.x, walkSwing)
        rig.rightLeg.rotation.x = dampPose(rig.rightLeg.rotation.x, -walkSwing)
        rig.leftArm.rotation.x = dampPose(rig.leftArm.rotation.x, -walkSwing * 0.68 - interactionBlend * 0.92 + typing)
        rig.rightArm.rotation.x = dampPose(rig.rightArm.rotation.x, walkSwing * 0.68 - interactionBlend * 0.92 - typing)
        rig.leftArm.rotation.y = dampPose(rig.leftArm.rotation.y, -interactionBlend * 0.08)
        rig.rightArm.rotation.y = dampPose(rig.rightArm.rotation.y, interactionBlend * 0.08)
        rig.head.rotation.x = dampPose(rig.head.rotation.x, -interactionBlend * (0.08 + (navigation.interactionOpened ? 0.015 : 0)))
        const idleLook = Math.sin(time * 0.31) * 0.12 + Math.sin(time * 0.13 + 1.6) * 0.045
        rig.head.rotation.y = dampPose(rig.head.rotation.y, idleLook * idleBlend, 4)
      }
      if (navigation.message && navigation.message !== navigation.announcedMessage) {
        navigation.announcedMessage = navigation.message
        onStatus?.(navigation.message)
      }
      animated.scanBars.forEach(({ mesh, phase }) => {
        mesh.position.y = 1.62 + Math.sin(time * 1.1 + phase) * 0.19
      })
      animated.glow.forEach((item, index) => {
        if (item.isMaterial) item.emissiveIntensity = 1.35 + Math.sin(time * 1.3 + index) * 0.35
        else item.intensity = (index === 0 ? 20 : 12) + Math.sin(time * 0.7 + index) * 1.5
      })
    },
    resources,
    materials,
    screenMaterials,
  }
  return interaction
}

function setCameraView(camera, state, aspect, config = CAMERA_CONFIG) {
  const target = new Vector3(config.target.x, config.target.y, config.target.z)
  const azimuth = MathUtils.degToRad(state.azimuth)
  const elevation = MathUtils.degToRad(state.elevation)
  const radius = config.orbitRadius
  camera.position.set(
    target.x + Math.sin(azimuth) * Math.cos(elevation) * radius,
    target.y + Math.sin(elevation) * radius,
    target.z + Math.cos(azimuth) * Math.cos(elevation) * radius,
  )
  camera.lookAt(target)
  camera.zoom = MathUtils.clamp(state.zoom, config.limits.zoom[0], config.limits.zoom[1])
  const viewHeight = config.viewHeight
  camera.left = -(viewHeight * aspect) / 2
  camera.right = (viewHeight * aspect) / 2
  camera.top = viewHeight / 2
  camera.bottom = -viewHeight / 2
  camera.updateProjectionMatrix()
}

export function AutomationLab3D({ cameraView, onCameraChange, onOpenTerminal, onFallback, onReady, onPortalApproach, sceneControllerRef, debug3d = false, debugNav = false, onDiagnostics, terminalOpen = false }) {
  const hostRef = useRef(null)
  const stateRef = useRef(null)
  const terminalReturnTargetRef = useRef(null)
  const cameraViewRef = useRef(cameraView)
  const onCameraChangeRef = useRef(onCameraChange)
  const onOpenTerminalRef = useRef(onOpenTerminal)
  const onPortalApproachRef = useRef(onPortalApproach)
  const onFallbackRef = useRef(onFallback)
  const onReadyRef = useRef(onReady)
  const onDiagnosticsRef = useRef(onDiagnostics)
  const [movementStatus, setMovementStatus] = useState('Focus the room and use WASD, arrow keys, or the movement pad.')
  const [failed, setFailed] = useState(false)

  cameraViewRef.current = cameraView
  onCameraChangeRef.current = onCameraChange
  onOpenTerminalRef.current = onOpenTerminal
  onPortalApproachRef.current = onPortalApproach
  onFallbackRef.current = onFallback
  onReadyRef.current = onReady
  onDiagnosticsRef.current = onDiagnostics

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined

    let renderer
    let sceneReady = false
    let frame = 0
    let lastRender = 0
    let renderedFrames = 0
    let performanceStarted = null
    let lastActiveRenderAt = 0
    let lastDiagnosticsAt = 0
    let currentFps = 0
    let currentFrameTime = 0
    let currentRenderTime = 0
    let currentGpuTime = 0
    let lastRafAt = 0
    let activeGpuQuery = null
    let gpuTimerExtension = null
    let lowPerformanceWindows = 0
    let fallbackDecision = 'no low-FPS sample yet'
    let windowRenderCpuTotal = 0
    let windowRenderCpuCount = 0
    let webglDetails = null
    const frameIntervals = []
    const rafIntervals = []
    const renderDurations = []
    const gpuDurations = []
    let labState
    let camera
    let consecutiveLowPerformanceSamples = 0
    let accumulatedPointerX = 0
    let accumulatedPointerY = 0
    let lastCameraStateUpdate = 0
    let pointerDown
    let lastPointerX = 0
    let lastPointerY = 0
    let dragged = false
    const heldKeys = new Set()

    const clearHeldKeys = () => {
      heldKeys.forEach((key) => stateRef.current?.setMoveDirection(key, false))
      heldKeys.clear()
    }

    try {
      const width = Math.max(1, host.clientWidth)
      const height = Math.max(1, host.clientHeight)
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4))
      renderer.setSize(width, height, false)
      renderer.outputColorSpace = SRGBColorSpace
      renderer.toneMapping = ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.08
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = PCFShadowMap
      renderer.setClearColor('#080d18', 0)
      renderer.domElement.tabIndex = 0
      renderer.domElement.setAttribute('role', 'application')
      renderer.domElement.setAttribute('aria-label', 'Interactive Automation Lab. Focus this room and use WASD or arrow keys to move Mark. Click or tap open floor to walk.')
      renderer.domElement.className = 'markverse-webgl-canvas'
      host.appendChild(renderer.domElement)

      const scene = new Scene()
      camera = new OrthographicCamera(-10, 10, 7, -7, 0.1, 90)
      setCameraView(camera, cameraViewRef.current, width / height, CAMERA_CONFIG)
      labState = buildLab(scene, renderer)
      labState.camera = camera
      labState.goToTerminalFromControls = goToTerminal
      stateRef.current = labState
      if (sceneControllerRef) sceneControllerRef.current = labState
      const gl = renderer.getContext()
      if (debug3d) gpuTimerExtension = gl.getExtension('EXT_disjoint_timer_query_webgl2')

      const resizeObserver = new ResizeObserver(() => {
        const nextWidth = Math.max(1, host.clientWidth)
        const nextHeight = Math.max(1, host.clientHeight)
        renderer.setSize(nextWidth, nextHeight, false)
        setCameraView(camera, cameraViewRef.current, nextWidth / nextHeight, CAMERA_CONFIG)
      })
      resizeObserver.observe(host)

      const handlePointerDown = (event) => {
        if (event.button !== undefined && event.button !== 0) return
        renderer.domElement.focus({ preventScroll: true })
        pointerDown = { id: event.pointerId, x: event.clientX, y: event.clientY }
        dragged = false
        lastPointerX = event.clientX
        lastPointerY = event.clientY
        accumulatedPointerX = 0
        accumulatedPointerY = 0
        renderer.domElement.setPointerCapture?.(event.pointerId)
      }
      const applyCameraMovement = (now = performance.now()) => {
        if (!accumulatedPointerX && !accumulatedPointerY) return
        const current = cameraViewRef.current
        onCameraChangeRef.current?.({
          ...current,
          azimuth: MathUtils.clamp(current.azimuth - accumulatedPointerX * 0.12, CAMERA_CONFIG.limits.azimuth[0], CAMERA_CONFIG.limits.azimuth[1]),
          elevation: MathUtils.clamp(current.elevation + accumulatedPointerY * 0.08, CAMERA_CONFIG.limits.elevation[0], CAMERA_CONFIG.limits.elevation[1]),
        })
        accumulatedPointerX = 0
        accumulatedPointerY = 0
        lastCameraStateUpdate = now
      }
      const handlePointerMove = (event) => {
        if (!pointerDown || pointerDown.id !== event.pointerId) {
          const hovering = labState.hitTerminal(event, camera)
          renderer.domElement.style.cursor = hovering ? 'pointer' : 'grab'
          labState.materials.teal.emissiveIntensity = hovering ? 0.65 : 0.2
          return
        }
        const dx = event.clientX - lastPointerX
        const dy = event.clientY - lastPointerY
        if (Math.abs(event.clientX - pointerDown.x) + Math.abs(event.clientY - pointerDown.y) > 5) dragged = true
        accumulatedPointerX += dx
        accumulatedPointerY += dy
        lastPointerX = event.clientX
        lastPointerY = event.clientY
        const now = performance.now()
        if (now - lastCameraStateUpdate >= 1000 / 30) applyCameraMovement(now)
      }
      const handlePointerUp = (event) => {
        if (!pointerDown || pointerDown.id !== event.pointerId) return
        const picked = !dragged ? labState.pickPointer(event, camera) : null
        applyCameraMovement()
        pointerDown = null
        renderer.domElement.releasePointerCapture?.(event.pointerId)
        if (picked?.type === 'terminal') {
          const routed = labState.requestTerminal()
          setMovementStatus(routed ? 'Walking to the project terminal.' : 'No clear route. Opening project details directly.')
          if (!routed) onOpenTerminalRef.current?.(renderer.domElement)
        } else if (picked?.type === 'portal') {
          const routed = labState.requestPortal()
          setMovementStatus(routed ? 'Mini Mark is approaching the district portal.' : 'Could not route to the portal. Use the district selector to continue.')
          if (!routed) onPortalApproachRef.current?.(NAVIGATION.portal.destinationId, renderer.domElement)
        } else if (picked?.type === 'floor') {
          const routed = labState.requestMoveTo({ x: picked.point.x, z: picked.point.z })
          setMovementStatus(routed ? 'Walking to the selected floor position.' : 'No clear route to that floor position. Use the project button above to open project details.')
        }
      }
      const handlePointerCancel = () => { pointerDown = null }
      const handleKeyDown = (event) => {
        if (event.target !== renderer.domElement || event.altKey || event.ctrlKey || event.metaKey) return
        if (event.key === 'Escape') {
          labState.cancelMovement()
          clearHeldKeys()
          setMovementStatus('Movement cancelled.')
          event.preventDefault()
          return
        }
        const key = event.key.toLowerCase()
        if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) return
        event.preventDefault()
        if (!heldKeys.has(key)) {
          heldKeys.add(key)
          labState.setMoveDirection(key, true)
        }
      }
      const handleKeyUp = (event) => {
        const key = event.key.toLowerCase()
        if (!heldKeys.has(key)) return
        heldKeys.delete(key)
        labState.setMoveDirection(key, false)
      }
      const handleCanvasBlur = clearHeldKeys
      const handleWindowBlur = clearHeldKeys
      const handleContextLost = (event) => {
        event.preventDefault()
        onFallbackRef.current?.('webgl-unavailable', debug3d ? emitDiagnostics('WebGL context lost') : null)
        setFailed(true)
      }
      renderer.domElement.addEventListener('pointerdown', handlePointerDown)
      renderer.domElement.addEventListener('pointermove', handlePointerMove)
      renderer.domElement.addEventListener('pointerup', handlePointerUp)
      renderer.domElement.addEventListener('pointercancel', handlePointerCancel)
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost)
      renderer.domElement.addEventListener('keydown', handleKeyDown)
      renderer.domElement.addEventListener('keyup', handleKeyUp)
      renderer.domElement.addEventListener('blur', handleCanvasBlur)
      window.addEventListener('blur', handleWindowBlur)

      const pageIsActive = () => document.visibilityState === 'visible' && document.hasFocus()
      const resetPerformanceWindow = () => {
        performanceStarted = null
        renderedFrames = 0
        lastRender = 0
        lastActiveRenderAt = 0
        currentFps = 0
        currentFrameTime = 0
        currentRenderTime = 0
        currentGpuTime = 0
        windowRenderCpuTotal = 0
        windowRenderCpuCount = 0
        lastRafAt = 0
        currentFps = 0
        currentFrameTime = 0
        currentRenderTime = 0
        currentGpuTime = 0
        consecutiveLowPerformanceSamples = 0
        lowPerformanceWindows = 0
        frameIntervals.length = 0
        rafIntervals.length = 0
        renderDurations.length = 0
        gpuDurations.length = 0
      }
      const emitDiagnostics = (status = 'active', now = performance.now()) => {
        if (!debug3d || !renderer) return
        const canvas = renderer.domElement
        const movement = labState?.getNavigationDiagnostics?.()
        const intervals = [...frameIntervals].sort((a, b) => a - b)
        const renderTimes = [...renderDurations].sort((a, b) => a - b)
        const rafTimes = [...rafIntervals].sort((a, b) => a - b)
        const gpuTimes = [...gpuDurations]
        const percentile95 = (values) => values.length ? values[Math.min(values.length - 1, Math.ceil(values.length * 0.95) - 1)] : 0
        const intervalAverage = frameIntervals.length ? frameIntervals.reduce((sum, value) => sum + value, 0) / frameIntervals.length : 0
        const renderAverage = renderDurations.length ? renderDurations.reduce((sum, value) => sum + value, 0) / renderDurations.length : 0
        const rafAverage = rafIntervals.length ? rafIntervals.reduce((sum, value) => sum + value, 0) / rafIntervals.length : 0
        const gpuAverage = gpuTimes.length ? gpuTimes.reduce((sum, value) => sum + value, 0) / gpuTimes.length : 0
        if (!webglDetails) {
          const gl = renderer.getContext()
          try {
            const rendererExtension = gl.getExtension('WEBGL_debug_renderer_info')
            webglDetails = {
              rendererName: gl.getParameter(rendererExtension?.UNMASKED_RENDERER_WEBGL || gl.RENDERER) || 'Unknown renderer',
              webglVersion: gl.getParameter(gl.VERSION) || 'Unknown WebGL version',
            }
          } catch { webglDetails = { rendererName: 'Restricted by browser privacy settings', webglVersion: 'Unavailable' } }
        }
        const snapshot = {
          status,
          pageVisibility: document.visibilityState,
          pageFocused: document.hasFocus(),
          renderCapFps: 30,
          fallbackWindows: lowPerformanceWindows,
          fallbackDecision,
          fps: currentFps,
          averageFps: intervalAverage ? 1000 / intervalAverage : 0,
          frameTime: currentFrameTime,
          averageFrameTime: intervalAverage,
          p95FrameTime: percentile95(intervals),
          averageRafTime: rafAverage,
          p95RafTime: percentile95(rafTimes),
          cpuRenderTime: currentRenderTime,
          averageCpuRenderTime: renderAverage,
          p95CpuRenderTime: percentile95(renderTimes),
          gpuRenderTime: currentGpuTime,
          averageGpuRenderTime: gpuAverage,
          gpuTimerAvailable: Boolean(gpuTimerExtension),
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          devicePixelRatio: window.devicePixelRatio || 1,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          cssWidth: canvas.clientWidth,
          cssHeight: canvas.clientHeight,
          rendererName: webglDetails.rendererName,
          webglVersion: webglDetails.webglVersion,
          movement,
          navigationGrid: debugNav ? getAvatarNavigationDebugGrid(NAVIGATION) : null,
          sampleCount: frameIntervals.length,
          updatedAt: now,
        }
        onDiagnosticsRef.current?.(snapshot)
        return snapshot
      }
      const scheduleRender = () => {
        if (!frame && pageIsActive()) frame = window.requestAnimationFrame(render)
      }
      const handlePageActivity = () => {
        resetPerformanceWindow()
        emitDiagnostics(pageIsActive() ? 'warming up after focus/visibility change' : 'paused · tab hidden or unfocused')
        if (pageIsActive()) scheduleRender()
        else if (frame) {
          window.cancelAnimationFrame(frame)
          frame = 0
        }
      }
      const render = (now) => {
        frame = 0
        if (lastRafAt) {
          rafIntervals.push(now - lastRafAt)
          if (rafIntervals.length > 180) rafIntervals.shift()
        }
        lastRafAt = now
        if (!pageIsActive()) {
          resetPerformanceWindow()
          emitDiagnostics('paused · tab hidden or unfocused', now)
          return
        }
        // Allow slight callback jitter so browsers delivering around 30 Hz do not
        // lose every other frame at the 30 FPS cap.
        if (now - lastRender < (1000 / 30) - 2) {
          scheduleRender()
          return
        }
        lastRender = now
        if (performanceStarted === null) performanceStarted = now
        renderedFrames += 1
        if (lastActiveRenderAt) {
          currentFrameTime = now - lastActiveRenderAt
          currentFps = currentFrameTime > 0 ? 1000 / currentFrameTime : 0
          if (debug3d) {
            frameIntervals.push(currentFrameTime)
            if (frameIntervals.length > 120) frameIntervals.shift()
          }
        }
        lastActiveRenderAt = now
        const elapsed = now - performanceStarted
        if (elapsed > 4500) {
          const fps = renderedFrames / (elapsed / 1000)
          const averageRaf = rafIntervals.length ? rafIntervals.reduce((sum, value) => sum + value, 0) / rafIntervals.length : 0
          const averageCpu = windowRenderCpuCount ? windowRenderCpuTotal / windowRenderCpuCount : 0
          const averageGpu = gpuDurations.length ? gpuDurations.reduce((sum, value) => sum + value, 0) / gpuDurations.length : 0
          const schedulerThrottled = averageRaf > 45 && averageCpu < 24 && (!gpuTimerExtension || averageGpu < 24)
          // Browser/automation scheduling delays are not evidence that the
          // renderer itself is slow. Apply this guard in normal browsing too;
          // tying it to the diagnostics HUD caused false static fallbacks.
          if (fps < 19 && schedulerThrottled) {
            consecutiveLowPerformanceSamples = 0
            lowPerformanceWindows = 0
            fallbackDecision = `sample ignored · RAF ${Math.round(averageRaf)} ms, CPU ${averageCpu.toFixed(1)} ms${gpuTimerExtension ? `, GPU ${averageGpu.toFixed(1)} ms` : ', GPU timing unavailable'}`
          } else if (fps < 19) {
            consecutiveLowPerformanceSamples += 1
            lowPerformanceWindows = consecutiveLowPerformanceSamples
            fallbackDecision = `qualifying active sample · ${fps.toFixed(1)} FPS, CPU ${averageCpu.toFixed(1)} ms${gpuTimerExtension ? `, GPU ${averageGpu.toFixed(1)} ms` : ''}`
            if (consecutiveLowPerformanceSamples >= 2) {
              const snapshot = emitDiagnostics('low-performance fallback · two active windows below 19 FPS', now)
              onFallbackRef.current?.('low-performance', snapshot)
              setFailed(true)
              return
            }
          } else {
            consecutiveLowPerformanceSamples = 0
            lowPerformanceWindows = 0
            fallbackDecision = `within threshold · ${fps.toFixed(1)} FPS`
          }
          renderedFrames = 0
          performanceStarted = now
          windowRenderCpuTotal = 0
          windowRenderCpuCount = 0
        }
        const renderStarted = performance.now()
        const gl = debug3d ? renderer.getContext() : null
        if (debug3d && gpuTimerExtension && activeGpuQuery && gl.getQueryParameter(activeGpuQuery, gl.QUERY_RESULT_AVAILABLE)) {
          const disjoint = gl.getParameter(gpuTimerExtension.GPU_DISJOINT_EXT)
          if (!disjoint) {
            currentGpuTime = gl.getQueryParameter(activeGpuQuery, gl.QUERY_RESULT) / 1e6
            gpuDurations.push(currentGpuTime)
            if (gpuDurations.length > 60) gpuDurations.shift()
          }
          gl.deleteQuery(activeGpuQuery)
          activeGpuQuery = null
        }
        if (debug3d && gpuTimerExtension && !activeGpuQuery) {
          activeGpuQuery = gl.createQuery()
          gl.beginQuery(gpuTimerExtension.TIME_ELAPSED_EXT, activeGpuQuery)
        }
        labState.update(now / 1000, () => {
          const returnTarget = terminalReturnTargetRef.current || renderer.domElement
          terminalReturnTargetRef.current = null
          onOpenTerminalRef.current?.(returnTarget)
        }, setMovementStatus, (destinationId, returnTarget) => onPortalApproachRef.current?.(destinationId, returnTarget))
        renderer.render(scene, camera)
        if (!sceneReady) {
          sceneReady = true
          onReadyRef.current?.()
        }
        currentRenderTime = performance.now() - renderStarted
        windowRenderCpuTotal += currentRenderTime
        windowRenderCpuCount += 1
        if (debug3d) {
          if (gpuTimerExtension && activeGpuQuery) gl.endQuery(gpuTimerExtension.TIME_ELAPSED_EXT)
          renderDurations.push(currentRenderTime)
          if (renderDurations.length > 120) renderDurations.shift()
          if (now - lastDiagnosticsAt >= 250) {
            emitDiagnostics('active · capped at 30 FPS', now)
            lastDiagnosticsAt = now
          }
        }
        scheduleRender()
      }
      document.addEventListener('visibilitychange', handlePageActivity)
      window.addEventListener('focus', handlePageActivity)
      window.addEventListener('blur', handlePageActivity)
      scheduleRender()

      return () => {
        document.removeEventListener('visibilitychange', handlePageActivity)
        window.removeEventListener('focus', handlePageActivity)
        window.removeEventListener('blur', handlePageActivity)
        window.cancelAnimationFrame(frame)
        resizeObserver.disconnect()
        renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
        renderer.domElement.removeEventListener('pointermove', handlePointerMove)
        renderer.domElement.removeEventListener('pointerup', handlePointerUp)
        renderer.domElement.removeEventListener('pointercancel', handlePointerCancel)
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost)
        renderer.domElement.removeEventListener('keydown', handleKeyDown)
        renderer.domElement.removeEventListener('keyup', handleKeyUp)
        renderer.domElement.removeEventListener('blur', handleCanvasBlur)
        window.removeEventListener('blur', handleWindowBlur)
        clearHeldKeys()
        if (activeGpuQuery) {
          try { renderer.getContext().deleteQuery(activeGpuQuery) } catch { /* The WebGL context may already be lost. */ }
          activeGpuQuery = null
        }
        const disposable = new Set(labState.resources)
        disposable.forEach((resource) => resource.dispose?.())
        renderer.dispose()
        renderer.domElement.remove()
        stateRef.current = null
        if (sceneControllerRef?.current === labState) sceneControllerRef.current = null
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('MARKVERSE Automation Lab renderer initialization failed:', error)
      labState?.resources?.forEach((resource) => resource.dispose?.())
      renderer?.dispose()
      renderer?.domElement?.remove()
      if (sceneControllerRef) sceneControllerRef.current = null
      const webglUnavailable = /webgl|context/i.test(error?.message || '')
      onFallbackRef.current?.(webglUnavailable ? 'webgl-unavailable' : 'scene-error', error)
      setFailed(true)
      return undefined
    }
  }, [debug3d, debugNav, sceneControllerRef])

  useEffect(() => {
    const state = stateRef.current
    if (state?.camera && hostRef.current) {
      setCameraView(state.camera, cameraView, hostRef.current.clientWidth / Math.max(1, hostRef.current.clientHeight), CAMERA_CONFIG)
    }
  }, [cameraView])

  useEffect(() => {
    stateRef.current?.setProjectPanelOpen(terminalOpen)
  }, [terminalOpen])

  if (failed) return <AutomationLabFallback />
  const setDirection = (key, active) => stateRef.current?.setMoveDirection(key, active)
  const goToTerminal = (returnTarget = null) => {
    terminalReturnTargetRef.current = returnTarget
    const canvas = hostRef.current?.querySelector('canvas')
    const routed = stateRef.current?.requestTerminal()
    setMovementStatus(routed ? 'Mark is walking to the project terminal.' : 'No clear route; opening project details directly.')
    if (!routed) {
      const target = returnTarget || canvas
      terminalReturnTargetRef.current = null
      onOpenTerminalRef.current?.(target)
    }
  }
  const moveOneStep = (x, z) => {
    const state = stateRef.current
    if (!state) return
    const target = { x: state.avatar.position.x + x * 0.8, z: state.avatar.position.z + z * 0.8 }
    const routed = state.requestMoveTo(target)
    setMovementStatus(routed ? 'Walking in the selected direction.' : 'No clear path in that direction.')
  }
  const directionalButton = (label, glyph, key, x, z) => (
    <button
      type="button"
      className="markverse-move-button"
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)
        setDirection(key, true)
      }}
      onPointerUp={() => setDirection(key, false)}
      onPointerCancel={() => setDirection(key, false)}
      onLostPointerCapture={() => setDirection(key, false)}
      onClick={(event) => { if (event.detail === 0) moveOneStep(x, z) }}
    >{glyph}</button>
  )
  return (
    <div className="markverse-world-interactive">
      <div ref={hostRef} className="automation-lab-webgl" aria-label="Three-dimensional Automation Lab room" />
      <div className="markverse-avatar-toolbar">
        <div className="markverse-avatar-pad" role="group" aria-label="Move Mark around the Automation Lab">
          {directionalButton('Move Mark forward', '↑', 'arrowup', 0, -1)}
          {directionalButton('Move Mark left', '←', 'arrowleft', -1, 0)}
          {directionalButton('Move Mark back', '↓', 'arrowdown', 0, 1)}
          {directionalButton('Move Mark right', '→', 'arrowright', 1, 0)}
        </div>
        <button type="button" className="markverse-avatar-terminal" onClick={(event) => goToTerminal(event.currentTarget)}>Go to terminal</button>
        <button type="button" className="markverse-avatar-reset" onClick={() => { stateRef.current?.resetAvatar(); setMovementStatus('Mark returned to the starting position.') }}>Reset Mark</button>
        <p className="markverse-avatar-status" role="status" aria-live="polite">{movementStatus}</p>
      </div>
    </div>
  )
}
