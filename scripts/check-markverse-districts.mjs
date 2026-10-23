import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  findAvatarPath,
  getAvatarNavigationDebugGrid,
  isAvatarPathClear,
  isAvatarWalkable,
  measureAvatarPath,
  moveAvatarStep,
  RESET_POSITION,
  TERMINAL_APPROACH,
} from '../src/components/markverse/avatarNavigation.js'
import { AUTOMATION_LAB_NAVIGATION as labNavigation } from '../src/components/markverse/districts/automationLabNavigation.js'
import { OPERATIONS_HQ_SCENE_CONFIG } from '../src/components/markverse/districts/operationsHQSceneConfig.js'
import { DISTRICT_REGISTRY, getAvailableDistricts, getDistrictById, validateDistrictRegistry } from '../src/components/markverse/districtRegistry.js'
import { featuredProjects } from '../src/data/projects.js'

const worldEntrySource = readFileSync(new URL('../src/components/markverse/WorldEntry.jsx', import.meta.url), 'utf8')
const automationLabSource = readFileSync(new URL('../src/components/markverse/AutomationLab3D.jsx', import.meta.url), 'utf8')
const operationsHQSource = readFileSync(new URL('../src/components/markverse/districts/OperationsHQ3D.jsx', import.meta.url), 'utf8')
const markverseCss = readFileSync(new URL('../src/styles/markverse.css', import.meta.url), 'utf8')
const assistantSource = readFileSync(new URL('../src/components/assistant/AskMarkAssistant.jsx', import.meta.url), 'utf8')
const assistantCss = readFileSync(new URL('../src/styles/assistant.css', import.meta.url), 'utf8')

const routeCases = [
  { name: 'spawn to open center', start: RESET_POSITION, end: { x: 0, z: 0 }, distance: 2.746177077052027, waypoints: 3 },
  { name: 'spawn around workflow workstation', start: RESET_POSITION, end: { x: -2.5, z: -1.5 }, distance: 5.128541887030947, waypoints: 3 },
  { name: 'spawn to project terminal anchor', start: RESET_POSITION, end: TERMINAL_APPROACH, distance: 8.927226314149824, waypoints: 5 },
  { name: 'west to east around desks', start: { x: -4.2, z: 0.8 }, end: { x: 3.8, z: 0.8 }, distance: 9.54185006441675, waypoints: 5 },
  { name: 'lower floor around racks and benches', start: { x: -3.8, z: 3.2 }, end: { x: 3.9, z: -3.45 }, distance: 10.870575415751269, waypoints: 4 },
  { name: 'desk to project terminal anchor', start: { x: -1.9, z: -0.5 }, end: TERMINAL_APPROACH, distance: 6.429061878592304, waypoints: 4 },
]

assert.equal(DISTRICT_REGISTRY.length, 2, 'Only complete district scenes belong in the runtime registry.')
assert.deepEqual(getAvailableDistricts().map(({ id }) => id), ['automation-lab', 'operations-hq'])
assert.equal(getDistrictById('automation-lab'), DISTRICT_REGISTRY[0])
assert.equal(getDistrictById('operations-hq')?.status, 'available', 'Operations HQ is part of the public district selector.')
assert.deepEqual(getAvailableDistricts({ includePreview: true }).map(({ id }) => id), ['automation-lab', 'operations-hq'])
assert.match(worldEntrySource, /const operationsHQLocalReview = operationsHQPreview && activeDistrict\.status === 'preview' && import\.meta\.env\.DEV/, 'Local review labels must never appear for a publicly available district.')
assert.match(worldEntrySource, /const avatarRigQA = import\.meta\.env\.DEV && operationsHQPreview/, 'Avatar rig capture controls must remain development-only.')
assert.equal(typeof DISTRICT_REGISTRY[0].sceneLoader, 'function')
assert.deepEqual(DISTRICT_REGISTRY[0].contentIds, ['personalvabot', 'markhq'])
assert.equal(DISTRICT_REGISTRY[0].contentIds, labNavigation.interactions.projectTerminal.contentIds, 'Registry content IDs should derive from the interaction configuration.')
assert.ok(DISTRICT_REGISTRY[0].contentIds.every((id) => featuredProjects.some((project) => project.slug === id)), 'District content IDs must resolve through canonical project data.')
assert.equal(DISTRICT_REGISTRY[0].navigation, labNavigation)
assert.equal(DISTRICT_REGISTRY[1].navigation, OPERATIONS_HQ_SCENE_CONFIG.navigation)
assert.equal(typeof DISTRICT_REGISTRY[1].sceneLoader, 'function')
assert.equal(validateDistrictRegistry(), true)
assert.throws(() => validateDistrictRegistry([DISTRICT_REGISTRY[0], DISTRICT_REGISTRY[0]]), /duplicated/)
assert.equal((worldEntrySource.match(/setFallbackReason\(getFallbackReason\(\)\)/g) || []).length, 2, 'District changes and browser history must reset scene-local fallback to current device policy.')
assert.match(worldEntrySource, /<Suspense key=\{activeDistrict\.id\}/, 'Scene changes must key the lazy boundary to unmount the outgoing district.')
assert.match(worldEntrySource, /<Suspense key=\{activeDistrict\.id\} fallback=\{<SceneLoading districtLabel=\{activeDistrict\.label\} \/>\}>/, 'Lazy loading must show a neutral scene loader, not falsely claim WebGL is unavailable.')
assert.match(worldEntrySource, /sceneReadyDistrictId !== activeDistrict\.id && <SceneLoading/, 'The loader must stay visible until the selected district renders its first frame.')
assert.match(worldEntrySource, /fallbackReason \? <SceneFallback \/>/, 'Genuine device fallbacks must remain available.')
assert.match(worldEntrySource, /className="markverse-mobile-scene-actions"/, 'Mobile scene actions must live outside the 3D viewport.')
assert.match(worldEntrySource, /automationLabControllerRef\.current\?\.goToTerminalFromControls/, 'Mobile terminal action must preserve the existing avatar approach behavior.')
assert.match(worldEntrySource, /className="markverse-mobile-scene-help"/, 'Mobile movement help must remain available outside the 3D viewport.')
assert.match(worldEntrySource, /className="markverse-camera-toggle"/, 'Mobile camera actions must be available through a labeled disclosure.')
assert.match(worldEntrySource, /aria-controls="markverse-camera-controls"/, 'The camera disclosure must identify its controlled toolbar.')
assert.match(markverseCss, /@media \(max-width:600px\) \{[\s\S]*?\.markverse-move-button\s*\{[^}]*min-width:\s*44px/, 'Movement controls must retain at least 44px touch targets on mobile.')
assert.match(markverseCss, /@media \(max-width:600px\) \{[\s\S]*?\.markverse-avatar-toolbar\s*\{[^}]*env\(safe-area-inset-bottom/, 'Floating mobile movement controls must respect the device safe area.')
assert.match(markverseCss, /\.markverse-avatar-terminal,\.markverse-avatar-reset\s*\{\s*display:\s*none/, 'Secondary actions must not remain inside the mobile scene overlay.')
assert.match(markverseCss, /@media \(max-width:600px\) \{[\s\S]*?\.markverse-avatar-status\s*\{[^}]*clip-path/, 'Movement status should remain accessible without occupying mobile scene space.')
assert.match(assistantSource, /markverse-hq-direct-access[\s\S]*markverse-avatar-toolbar[\s\S]*markverse-mobile-scene-actions/, 'Ask Mark launcher collision detection must account for Operations HQ shortcuts and mobile scene controls.')
assert.match(assistantCss, /data-markverse-position='top-right'[\s\S]*data-markverse-position='top-left'[\s\S]*data-markverse-position='bottom-left'/, 'Ask Mark must have safe mobile fallback positions when its default corner covers a MARKVERSE control.')
assert.match(automationLabSource, /markverse-avatar-pad[\s\S]{0,300}Move Mark around the Automation Lab/)
assert.match(operationsHQSource, /markverse-avatar-pad[\s\S]{0,300}Move Mini Mark around Operations HQ/)
assert.match(markverseCss, /\.markverse-scene-loading-indicator \{ animation:none;/, 'The scene loader must respect reduced motion.')
assert.match(automationLabSource, /renderer\.render\(scene, camera\)[\s\S]{0,180}onReadyRef\.current\?\.\(\)/, 'Automation Lab reports ready only after a successful rendered frame.')
assert.match(operationsHQSource, /renderer\.render\(scene, camera\)[\s\S]{0,180}onReadyRef\.current\?\.\(\)/, 'Operations HQ reports ready only after a successful rendered frame.')
assert.match(automationLabSource, /avatarBox\(head, \[0, 0\.14, -0\.235\], \[0\.48, 0\.28, 0\.05\], 'hair'\)/, 'Automation Lab avatar needs connected rear scalp coverage.')
assert.match(automationLabSource, /avatarBox\(head, \[0, -0\.04, -0\.232\], \[0\.36, 0\.16, 0\.05\], 'hair'\)/, 'Automation Lab avatar needs a narrow rear nape layer.')
assert.match(operationsHQSource, /cube\(head, 'avatarHair', \[0, 0\.14, -0\.235\], \[0\.48, 0\.28, 0\.05\]\)/, 'Operations HQ avatar needs matching connected rear scalp coverage.')
assert.match(operationsHQSource, /cube\(head, 'avatarHair', \[0, -0\.04, -0\.232\], \[0\.36, 0\.16, 0\.05\]\)/, 'Operations HQ avatar needs the matching narrow rear nape layer.')
assert.match(automationLabSource, /if \(fps < 19 && schedulerThrottled\)/, 'Scheduler-throttled samples must be ignored in normal and debug views.')

for (const routeCase of routeCases) {
  const defaultPath = findAvatarPath(routeCase.start, routeCase.end)
  const configuredPath = findAvatarPath(routeCase.start, routeCase.end, labNavigation)
  assert.deepEqual(configuredPath, defaultPath, `${routeCase.name}: explicit and compatibility-default routes differ`)
  assert.ok(configuredPath, `${routeCase.name}: expected a route`)
  assert.ok(isAvatarPathClear(configuredPath, labNavigation), `${routeCase.name}: route intersects an obstacle or leaves room bounds`)
  assert.ok(Math.abs(measureAvatarPath(configuredPath) - routeCase.distance) < 1e-9, `${routeCase.name}: route length changed`)
  assert.equal(configuredPath.length, routeCase.waypoints, `${routeCase.name}: waypoint count changed`)
}

for (const obstacle of labNavigation.obstacles) {
  const center = { x: (obstacle.x1 + obstacle.x2) / 2, z: (obstacle.z1 + obstacle.z2) / 2 }
  assert.equal(isAvatarWalkable(center, labNavigation), false, `${obstacle.label}: obstacle center must be blocked`)
}
assert.equal(labNavigation.portal.destinationId, 'operations-hq')
assert.ok(isAvatarPathClear(findAvatarPath(labNavigation.spawn, labNavigation.portal.approach, labNavigation), labNavigation), 'Automation Lab portal must be reachable.')
assert.equal(isAvatarWalkable({ x: labNavigation.bounds.minX - 0.01, z: 0 }, labNavigation), false)
assert.equal(getAvatarNavigationDebugGrid(labNavigation).districtId, 'automation-lab')

const edgeStep = moveAvatarStep({ x: labNavigation.bounds.maxX - 0.01, z: 2.8 }, { x: 1, z: 0 }, 0.5, labNavigation)
assert.ok(edgeStep.x <= labNavigation.bounds.maxX, 'Movement step escaped the room boundary.')

const hqNavigation = OPERATIONS_HQ_SCENE_CONFIG.navigation
const hqAnchors = [hqNavigation.spawn, ...Object.values(hqNavigation.interactions), hqNavigation.portal.approach]
for (const start of hqAnchors) {
  for (const destination of hqAnchors) {
    if (start === destination) continue
    const route = findAvatarPath(start, destination, hqNavigation)
    assert.ok(route, `Operations HQ route ${start.id || 'spawn'} → ${destination.id || 'spawn'} should exist.`)
    assert.ok(isAvatarPathClear(route, hqNavigation), 'Operations HQ district route must remain collision-free.')
  }
}
assert.equal(hqNavigation.portal.destinationId, 'automation-lab')
assert.ok(isAvatarWalkable(hqNavigation.portal.approach, hqNavigation), 'Operations HQ portal interaction point must be walkable.')

// Small synthetic map proves that the reusable algorithms accept independent district data.
const fixtureNavigation = {
  districtId: 'test-fixture',
  grid: { cellSize: 1, minX: 0, minZ: 0, cols: 3, rows: 3 },
  bounds: { minX: 0, maxX: 2, minZ: 0, maxZ: 2 },
  avatarRadius: 0.2,
  spawn: { x: 0, z: 1 },
  obstacles: [{ x1: 0.8, x2: 1.2, z1: 0.8, z2: 1.2, label: 'fixture obstacle' }],
  interactions: {},
}
const fixturePath = findAvatarPath({ x: 0, z: 1 }, { x: 2, z: 1 }, fixtureNavigation)
assert.ok(fixturePath, 'Generic route helper should route around a fixture obstacle.')
assert.ok(isAvatarPathClear(fixturePath, fixtureNavigation))
assert.equal(isAvatarWalkable({ x: 1, z: 1 }, fixtureNavigation), false)
assert.equal(getAvatarNavigationDebugGrid(fixtureNavigation).districtId, 'test-fixture')

console.log(`MARKVERSE district/navigation checks passed (${routeCases.length} Automation Lab parity routes, ${labNavigation.obstacles.length} lab obstacles, ${hqAnchors.length ** 2 - hqAnchors.length} HQ routes, and both portal approaches).`)
