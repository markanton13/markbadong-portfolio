import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DISTRICT_REGISTRY, validateDistrictRegistry } from '../src/components/markverse/districtRegistry.js'
import { OPERATIONS_HQ_SCENE_CONFIG } from '../src/components/markverse/districts/operationsHQSceneConfig.js'
import { OPERATIONS_HQ_CAREER_ITEMS, OPERATIONS_HQ_CONTENT_BY_ID, OPERATIONS_HQ_STATION_CONTENT } from '../src/components/markverse/districts/operationsHQContent.js'
import { findAvatarPath, isAvatarPathClear, isAvatarWalkable, measureAvatarPath, moveAvatarStep } from '../src/components/markverse/avatarNavigation.js'

const { room, navigation, stations, careerPlinths, trainingSeats } = OPERATIONS_HQ_SCENE_CONFIG
const sceneSource = readFileSync(new URL('../src/components/markverse/districts/OperationsHQ3D.jsx', import.meta.url), 'utf8')
const stationIds = ['career-journey', 'training-command', 'quality-process', 'impact-evidence']

const torsoRigSource = sceneSource.slice(sceneSource.indexOf('const torso = new Object3D()'), sceneSource.indexOf('const head = new Object3D()'))
const armRigSource = sceneSource.slice(sceneSource.indexOf('const makeArm = (side) => {'), sceneSource.indexOf('return { root, bodyPivot'))
assert.doesNotMatch(torsoRigSource, /avatarSkin/, 'Skin hands must not be duplicated as fixed torso children.')
assert.match(armRigSource, /bodyPivot\.add\(pivot\)/, 'Arm pivots must attach to the animated body pivot.')
assert.match(armRigSource, /cube\(pivot, 'avatarShirt'/, 'The sleeve must be parented to the shoulder pivot.')
assert.match(armRigSource, /cube\(pivot, 'avatarSkin'/, 'The hand must share the shoulder pivot transform chain.')
assert.match(armRigSource, /pivot\.position\.set\(side \* 0\.3, 0\.62, 0\)/, 'Left and right shoulder pivots must be symmetric and below the head.')

assert.equal(DISTRICT_REGISTRY.length, 2, 'Both complete districts should be registered.')
assert.equal(DISTRICT_REGISTRY[0].id, 'automation-lab')
assert.equal(DISTRICT_REGISTRY[1].id, 'operations-hq')
assert.equal(DISTRICT_REGISTRY[1].status, 'available')
assert.match(sceneSource, /Interactive Operations HQ\./, 'The public scene accessibility label must not call the district a preview.')
assert.equal(validateDistrictRegistry(), true)
assert.equal(room.width, 14)
assert.equal(room.depth, 11)
assert.equal(room.wallHeight, 4.15)
assert.match(sceneSource, /const westParapetHeight = 0\.96/, 'The west wall must use the continuous low parapet geometry.')
assert.doesNotMatch(sceneSource, /box\('amber', -6\.36, 3\.57/, 'Task-light accents must not remain suspended above the lowered west parapet.')
assert.match(sceneSource, /box\('amber', 6\.36, 3\.57/, 'Amber task lights attached to the full-height east wall remain part of the scene.')
assert.match(sceneSource, /box\('amber', x, 2\.08, -4\.6, 0\.045, 2\.48, 0\.025\)/, 'Rear pilaster accents must overlap their front trim without a floating gap.')
assert.match(sceneSource, /const frameZ = \(offset = 0\) => localZ\(offset\) \+ Math\.cos\(rotationY\) \* 0\.09/, 'Amber display rails must overlap their backing instead of hovering in front of it.')
assert.doesNotMatch(sceneSource, /cameraCutawayGroup|west-career-wall|cutawayMeshes/, 'Wall visibility must not split the west architectural assembly.')
assert.match(sceneSource, /const portalZ = portal\.z[\s\S]*?box\('dark', portal\.x, 0\.085, portalZ, 1\.34, 0\.08, 0\.92\)/, 'District travel must use a floor-integrated portal pad.')
assert.match(sceneSource, /const onPortalPad = Math\.abs\(point\.x - portal\.x\) <= 0\.67 && Math\.abs\(point\.z - portal\.z\) <= 0\.46[\s\S]*?startPortalInteraction\(portal\.destinationId\)/, 'Floor clicks on the portal pad must retain the travel confirmation flow.')
assert.equal(navigation.obstacles.some(({ label }) => label.toLowerCase().includes('portal')), false, 'The low floor portal pad must not add obsolete arch collision footprints.')
assert.deepEqual(stations.map(({ id }) => id), stationIds)
assert.equal(careerPlinths.length, 4)
assert.equal(trainingSeats.length, 3)
assert.deepEqual(Object.keys(navigation.interactions), ['careerJourney', 'trainingCommand', 'qualityProcess', 'impactEvidence'])
assert.equal(OPERATIONS_HQ_SCENE_CONFIG.interactables.length, 7, 'Four career milestones and three operations stations must be independently selectable.')
assert.deepEqual(OPERATIONS_HQ_CAREER_ITEMS.map(({ id }) => id), ['career-support', 'career-production', 'career-trainer', 'career-training-lead'])
for (const interactable of OPERATIONS_HQ_SCENE_CONFIG.interactables) {
  assert.ok(OPERATIONS_HQ_CONTENT_BY_ID[interactable.contentId], `${interactable.id} must resolve to canonical visitor content.`)
  assert.ok(Object.values(navigation.interactions).some(({ id }) => id === interactable.anchorId), `${interactable.id} must route to a configured approach anchor.`)
}
assert.match(OPERATIONS_HQ_CONTENT_BY_ID['career-training-lead'].note, /effective date and responsibilities.*not been documented/i)
assert.doesNotMatch(JSON.stringify(OPERATIONS_HQ_STATION_CONTENT['impact-evidence']), /90%|5\/5|LILO LIVE|FlowTrack/i, 'Unverified metrics and confidential internal workflows must not appear in visitor-facing impact content.')

function pointInsideRect(point, rect, padding = 0) {
  const closestX = Math.max(rect.x1 - padding, Math.min(rect.x2 + padding, point.x))
  const closestZ = Math.max(rect.z1 - padding, Math.min(rect.z2 + padding, point.z))
  return Math.hypot(point.x - closestX, point.z - closestZ) < navigation.avatarRadius
}

function insideBounds(point) {
  return point.x >= navigation.bounds.minX && point.x <= navigation.bounds.maxX
    && point.z >= navigation.bounds.minZ && point.z <= navigation.bounds.maxZ
}

function coveredByWalkableRegion(point) {
  return navigation.walkableRegions.some((region) => point.x >= region.x1 && point.x <= region.x2 && point.z >= region.z1 && point.z <= region.z2)
}

const routePoints = [navigation.spawn, navigation.portal, navigation.portal.approach, ...Object.values(navigation.interactions)]
for (const point of routePoints) {
  assert.equal(insideBounds(point), true, `${point.id || 'spawn'} must be inside room navigation bounds.`)
  assert.equal(coveredByWalkableRegion(point), true, `${point.id || 'spawn'} must be covered by the proposed walkable regions.`)
  for (const obstacle of navigation.obstacles) {
    assert.equal(pointInsideRect(point, obstacle), false, `${point.id || 'spawn'} must clear ${obstacle.label}.`)
  }
}

assert.ok(Math.hypot(navigation.spawn.x - navigation.portal.x, navigation.spawn.z - navigation.portal.z) < 2.5, 'Spawn and future portal should remain close to the entry.')
assert.equal(navigation.portal.destinationId, 'automation-lab')
for (const station of stations) {
  const anchor = Object.values(navigation.interactions).find(({ id }) => id === station.id)
  assert.ok(anchor, `${station.label} needs a proposed Stage B interaction anchor.`)
}

const anchors = Object.values(navigation.interactions)
const destinations = [navigation.spawn, ...anchors]
for (let startIndex = 0; startIndex < destinations.length; startIndex += 1) {
  for (let destinationIndex = startIndex + 1; destinationIndex < destinations.length; destinationIndex += 1) {
    const start = destinations[startIndex]
    const destination = destinations[destinationIndex]
    const route = findAvatarPath(start, destination, navigation)
    assert.ok(route, `Route ${start.id || 'spawn'} → ${destination.id || 'spawn'} must exist.`)
    assert.ok(isAvatarPathClear(route, navigation), `Route ${start.id || 'spawn'} → ${destination.id || 'spawn'} must remain collision-free.`)
    assert.ok(measureAvatarPath(route) > 0, 'Distinct points must produce a nonzero route.')
  }
}
for (const anchor of anchors) assert.equal(isAvatarWalkable(anchor, navigation), true, `${anchor.id} should be a reachable approach.`)
assert.equal(isAvatarWalkable({ x: -6.72, z: 2.5 }, navigation), false, 'The continuous west parapet footprint remains blocked at floor level.')
assert.equal(isAvatarWalkable({ x: -6.42, z: 2.5 }, navigation), false, 'Avatar clearance must prevent clipping through the west parapet footprint.')
assert.equal(isAvatarWalkable({ x: -5.55, z: -3.78 }, navigation), false, 'Career plinth row must block movement.')
assert.equal(isAvatarWalkable({ x: 3.9, z: -3.34 }, navigation), false, 'Training lectern must block movement.')
assert.equal(isAvatarWalkable({ x: -4.82, z: 3.18 }, navigation), false, 'Quality workstation must block movement.')
assert.equal(isAvatarWalkable({ x: 4.98, z: 3.63 }, navigation), false, 'Evidence cabinet must block movement.')
const blockedWallStep = moveAvatarStep({ x: -6.3, z: 2.5 }, { x: -1, z: 0 }, 0.2, navigation)
assert.ok(blockedWallStep.x > -6.56, 'Swept movement must not enter the lowered west wall.')

console.log('Operations HQ scene contract passed (7 information targets, continuous west parapet, floor portal pad, destination and approach registered, all spawn/anchor/portal routes reachable, wall and furniture collision clear; district is available).')
