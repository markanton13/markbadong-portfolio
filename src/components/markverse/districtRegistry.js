import { AUTOMATION_LAB_NAVIGATION } from './districts/automationLabNavigation.js'
import { OPERATIONS_HQ_CAMERA_CONFIG, OPERATIONS_HQ_SCENE_CONFIG } from './districts/operationsHQSceneConfig.js'
import { OPERATIONS_HQ_DIRECT_ACCESS_ITEMS } from './districts/operationsHQContent.js'

/**
 * @typedef {Object} DistrictDefinition
 * @property {string} id Stable, URL-safe district identifier.
 * @property {string} label Visible district name for a future selector.
 * @property {string} summary Concise accessible description.
 * @property {number} order Stable selector ordering.
 * @property {'available'|'preview'} status Preview districts are exposed only by local development builds.
 * @property {() => Promise<{default: import('react').ComponentType}>} sceneLoader Lazy scene module loader. Scene modules own and clean up their renderer resources and listeners in effect cleanup.
 * @property {typeof AUTOMATION_LAB_NAVIGATION} navigation District-owned walkability and interaction data.
 * @property {string[]} contentIds Canonical content identifiers; copy stays in shared content sources.
 * @property {{defaultView: {azimuth: number, elevation: number, zoom: number}, limits: {azimuth: number[], elevation: number[], zoom: number[]}, target: {x: number, y: number, z: number}, orbitRadius: number, viewHeight: number}} cameraConfig District camera defaults, framing and clamps.
 * @property {string} fallbackKey Key for the accessible static equivalent.
 */

/** @type {DistrictDefinition} */
export const AUTOMATION_LAB_DISTRICT = Object.freeze({
  id: 'automation-lab',
  label: 'Automation Lab',
  summary: 'An interactive room for automation, AI-assisted tools, and practical systems.',
  order: 1,
  status: 'available',
  sceneLoader: () => import('./AutomationLab3D.jsx').then((module) => ({ default: module.AutomationLab3D })),
  navigation: AUTOMATION_LAB_NAVIGATION,
  cameraConfig: Object.freeze({
    defaultView: Object.freeze({ azimuth: 45, elevation: 36, zoom: 1 }),
    target: Object.freeze({ x: 0, y: 1.52, z: 0 }),
    orbitRadius: 25,
    viewHeight: 13.4,
    limits: Object.freeze({
      azimuth: Object.freeze([34, 56]),
      elevation: Object.freeze([31, 48]),
      zoom: Object.freeze([0.94, 1.12]),
    }),
  }),
  contentIds: AUTOMATION_LAB_NAVIGATION.interactions.projectTerminal.contentIds,
  fallbackKey: 'automation-lab',
})

export const OPERATIONS_HQ_DISTRICT = Object.freeze({
  id: 'operations-hq',
  label: 'Operations HQ',
  summary: 'A career and operations command center for training, quality, process, and evidence.',
  order: 2,
  status: 'available',
  sceneLoader: () => import('./districts/OperationsHQ3D.jsx').then((module) => ({ default: module.OperationsHQ3D })),
  navigation: OPERATIONS_HQ_SCENE_CONFIG.navigation,
  cameraConfig: OPERATIONS_HQ_CAMERA_CONFIG,
  contentIds: Object.freeze(OPERATIONS_HQ_DIRECT_ACCESS_ITEMS.map((item) => item.id)),
  fallbackKey: 'operations-hq',
})

// Operations HQ and Automation Lab share one lazy, single-scene world host.
// Scene modules own their renderer and release it on unmount; the world host mounts
// exactly one keyed lazy scene at a time.
export const DISTRICT_REGISTRY = Object.freeze([AUTOMATION_LAB_DISTRICT, OPERATIONS_HQ_DISTRICT])

export function getDistrictById(id) {
  return DISTRICT_REGISTRY.find((district) => district.id === id) || null
}

export function getAvailableDistricts({ includePreview = false } = {}) {
  return DISTRICT_REGISTRY.filter((district) => district.status === 'available' || (includePreview && district.status === 'preview'))
}

export function validateDistrictRegistry(districts = DISTRICT_REGISTRY) {
  const ids = new Set()
  for (const district of districts) {
    if (!district.id || ids.has(district.id)) throw new Error(`District ID is missing or duplicated: ${district.id || '(empty)'}`)
    if (!['available', 'preview'].includes(district.status) || typeof district.sceneLoader !== 'function') {
      throw new Error(`District ${district.id} must have a registered status and lazy scene loader.`)
    }
    if (!district.label || !district.summary || !district.fallbackKey || !district.navigation || !district.cameraConfig) {
      throw new Error(`District ${district.id} is missing selector or runtime metadata.`)
    }
    ids.add(district.id)
  }
  return true
}

validateDistrictRegistry()
