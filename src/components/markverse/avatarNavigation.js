import { AUTOMATION_LAB_NAVIGATION } from './districts/automationLabNavigation.js'

const DEFAULT_NAVIGATION = AUTOMATION_LAB_NAVIGATION
export const RESET_POSITION = DEFAULT_NAVIGATION.spawn
export const TERMINAL_APPROACH = DEFAULT_NAVIGATION.interactions.projectTerminal.approach
const walkabilityCache = new WeakMap()

const NEIGHBORS = [
  [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],
  [-1, -1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, 1, Math.SQRT2],
]

function gridIndex(col, row, navigation) {
  return row * navigation.grid.cols + col
}

function worldToGrid(point, navigation = DEFAULT_NAVIGATION) {
  const { cellSize, minX, minZ } = navigation.grid
  return {
    col: Math.round((point.x - minX) / cellSize),
    row: Math.round((point.z - minZ) / cellSize),
  }
}

function gridToWorld(col, row, navigation = DEFAULT_NAVIGATION) {
  const { cellSize, minX, minZ } = navigation.grid
  return { x: minX + col * cellSize, z: minZ + row * cellSize }
}

function insideRoom(point, navigation = DEFAULT_NAVIGATION) {
  const { minX, maxX, minZ, maxZ } = navigation.bounds
  return point.x >= minX && point.x <= maxX && point.z >= minZ && point.z <= maxZ
}

function distanceToBoxSquared(point, box) {
  const nearestX = Math.max(box.x1, Math.min(point.x, box.x2))
  const nearestZ = Math.max(box.z1, Math.min(point.z, box.z2))
  return (point.x - nearestX) ** 2 + (point.z - nearestZ) ** 2
}

function intersectsObstacle(point, navigation = DEFAULT_NAVIGATION, radius = navigation.avatarRadius) {
  const radiusSquared = radius * radius
  return navigation.obstacles.some((obstacle) => distanceToBoxSquared(point, obstacle) < radiusSquared - 1e-8)
}

export function isAvatarWalkable(point, navigation = DEFAULT_NAVIGATION) {
  return insideRoom(point, navigation) && !intersectsObstacle(point, navigation)
}

function getWalkableCells(navigation) {
  let walkable = walkabilityCache.get(navigation)
  if (walkable) return walkable
  const { cols, rows } = navigation.grid
  walkable = new Uint8Array(cols * rows)
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (isAvatarWalkable(gridToWorld(col, row, navigation), navigation)) walkable[gridIndex(col, row, navigation)] = 1
    }
  }
  walkabilityCache.set(navigation, walkable)
  return walkable
}

function isCellWalkable(col, row, navigation) {
  const { cols, rows } = navigation.grid
  return col >= 0 && col < cols && row >= 0 && row < rows
    && getWalkableCells(navigation)[gridIndex(col, row, navigation)] === 1
}

function pointForCell(col, row, navigation) {
  return gridToWorld(col, row, navigation)
}

function nearestOpenCell(point, navigation) {
  const origin = worldToGrid(point, navigation)
  const { cols, rows } = navigation.grid
  let nearest = null
  // Search the entire snap window. Returning from the first nonempty Chebyshev
  // ring can pick a farther diagonal cell while a nearer one exists next ring.
  for (let radius = 0; radius <= 5; radius += 1) {
    for (let row = origin.row - radius; row <= origin.row + radius; row += 1) {
      for (let col = origin.col - radius; col <= origin.col + radius; col += 1) {
        if (col < 0 || col >= cols || row < 0 || row >= rows) continue
        if (radius > 0 && Math.max(Math.abs(col - origin.col), Math.abs(row - origin.row)) !== radius) continue
        const cellPoint = pointForCell(col, row, navigation)
        if (!isCellWalkable(col, row, navigation)) continue
        const distance = (cellPoint.x - point.x) ** 2 + (cellPoint.z - point.z) ** 2
        if (!nearest || distance < nearest.distance) nearest = { col, row, distance }
      }
    }
  }
  return nearest
}

function orientation(a, b, c) {
  const value = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)
  if (Math.abs(value) < 1e-9) return 0
  return value > 0 ? 1 : 2
}

function onSegment(a, b, point) {
  return point.x >= Math.min(a.x, b.x) - 1e-9 && point.x <= Math.max(a.x, b.x) + 1e-9
    && point.z >= Math.min(a.z, b.z) - 1e-9 && point.z <= Math.max(a.z, b.z) + 1e-9
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c)
  const o2 = orientation(a, b, d)
  const o3 = orientation(c, d, a)
  const o4 = orientation(c, d, b)
  if (o1 !== o2 && o3 !== o4) return true
  return (o1 === 0 && onSegment(a, b, c)) || (o2 === 0 && onSegment(a, b, d))
    || (o3 === 0 && onSegment(c, d, a)) || (o4 === 0 && onSegment(c, d, b))
}

function pointSegmentDistanceSquared(point, start, end) {
  const dx = end.x - start.x
  const dz = end.z - start.z
  const lengthSquared = dx * dx + dz * dz
  if (lengthSquared < 1e-12) return (point.x - start.x) ** 2 + (point.z - start.z) ** 2
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared))
  return (point.x - (start.x + dx * t)) ** 2 + (point.z - (start.z + dz * t)) ** 2
}

function segmentSegmentDistanceSquared(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0
  return Math.min(
    pointSegmentDistanceSquared(a, c, d),
    pointSegmentDistanceSquared(b, c, d),
    pointSegmentDistanceSquared(c, a, b),
    pointSegmentDistanceSquared(d, a, b),
  )
}

function segmentIntersectsObstacle(start, end, obstacle, radius) {
  const corners = [
    { x: obstacle.x1, z: obstacle.z1 }, { x: obstacle.x2, z: obstacle.z1 },
    { x: obstacle.x2, z: obstacle.z2 }, { x: obstacle.x1, z: obstacle.z2 },
  ]
  const edges = corners.map((corner, index) => [corner, corners[(index + 1) % corners.length]])
  if (distanceToBoxSquared(start, obstacle) < radius * radius - 1e-8
    || distanceToBoxSquared(end, obstacle) < radius * radius - 1e-8) return true
  return edges.some(([edgeStart, edgeEnd]) => segmentSegmentDistanceSquared(start, end, edgeStart, edgeEnd) < radius * radius - 1e-8)
}

function segmentIsClear(start, end, navigation = DEFAULT_NAVIGATION) {
  if (!insideRoom(start, navigation) || !insideRoom(end, navigation)) return false
  return !navigation.obstacles.some((obstacle) => segmentIntersectsObstacle(start, end, obstacle, navigation.avatarRadius))
}

function pathDistance(points) {
  let distance = 0
  for (let index = 1; index < points.length; index += 1) {
    distance += Math.hypot(points[index].x - points[index - 1].x, points[index].z - points[index - 1].z)
  }
  return distance
}

function smoothPath(points, navigation) {
  if (points.length < 3) return points
  const result = [points[0]]
  let anchor = 0
  while (anchor < points.length - 1) {
    let next = points.length - 1
    while (next > anchor + 1 && !segmentIsClear(points[anchor], points[next], navigation)) next -= 1
    result.push(points[next])
    anchor = next
  }
  return result
}

function octileDistance(col, row, goalCol, goalRow) {
  const dx = Math.abs(goalCol - col)
  const dz = Math.abs(goalRow - row)
  const diagonal = Math.min(dx, dz)
  return Math.max(dx, dz) + (Math.SQRT2 - 1) * diagonal
}

function comesBefore(a, b) {
  if (Math.abs(a.f - b.f) > 1e-6) return a.f < b.f
  return a.g > b.g
}

function pushOpen(heap, item) {
  let index = heap.length
  heap.push(item)
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2)
    if (!comesBefore(heap[index], heap[parent])) break
    ;[heap[index], heap[parent]] = [heap[parent], heap[index]]
    index = parent
  }
}

function popOpen(heap) {
  const first = heap[0]
  const last = heap.pop()
  if (heap.length) {
    heap[0] = last
    let index = 0
    while (true) {
      const left = index * 2 + 1
      const right = left + 1
      let smallest = index
      if (left < heap.length && comesBefore(heap[left], heap[smallest])) smallest = left
      if (right < heap.length && comesBefore(heap[right], heap[smallest])) smallest = right
      if (smallest === index) break
      ;[heap[index], heap[smallest]] = [heap[smallest], heap[index]]
      index = smallest
    }
  }
  return first
}

export function findAvatarPath(start, destination, navigation = DEFAULT_NAVIGATION) {
  if (!isAvatarWalkable(start, navigation) || !insideRoom(destination, navigation)) return null

  // The true destination is the best waypoint when the avatar can walk to it
  // directly; grid snapping is reserved for blocked or obstructed destinations.
  if (isAvatarWalkable(destination, navigation) && segmentIsClear(start, destination, navigation)) {
    return pathDistance([start, destination]) < 1e-4 ? [start] : [start, destination]
  }

  const startCell = nearestOpenCell(start, navigation)
  const goalCell = nearestOpenCell(destination, navigation)
  if (!startCell || !goalCell) return null

  const { cols, rows } = navigation.grid
  const total = cols * rows
  const open = []
  const cameFrom = new Int32Array(total).fill(-1)
  const gScore = new Float32Array(total).fill(Infinity)
  const fScore = new Float32Array(total).fill(Infinity)
  const closed = new Uint8Array(total)
  const startIndex = gridIndex(startCell.col, startCell.row, navigation)
  const goalIndex = gridIndex(goalCell.col, goalCell.row, navigation)
  gScore[startIndex] = 0
  fScore[startIndex] = octileDistance(startCell.col, startCell.row, goalCell.col, goalCell.row)
  pushOpen(open, { index: startIndex, g: 0, f: fScore[startIndex] })

  while (open.length) {
    const queued = popOpen(open)
    const current = queued.index
    if (closed[current] || queued.g > gScore[current] + 1e-6) continue
    if (current === goalIndex) {
      const path = []
      let cursor = current
      while (cursor !== -1) {
        path.push(pointForCell(cursor % cols, Math.floor(cursor / cols), navigation))
        cursor = cameFrom[cursor]
      }
      path.reverse()
      path[0] = start
      path[path.length - 1] = pointForCell(goalCell.col, goalCell.row, navigation)
      const smoothed = smoothPath(path, navigation)
      if (isAvatarWalkable(destination, navigation)) {
        if (smoothed.length === 1) return segmentIsClear(start, destination, navigation) ? [start, destination] : smoothed
        if (segmentIsClear(smoothed[smoothed.length - 2], destination, navigation)) smoothed[smoothed.length - 1] = destination
      }
      return smoothed
    }

    closed[current] = 1
    const col = current % cols
    const row = Math.floor(current / cols)
    for (const [dx, dz, cost] of NEIGHBORS) {
      const nextCol = col + dx
      const nextRow = row + dz
      if (!isCellWalkable(nextCol, nextRow, navigation)) continue
      const next = gridIndex(nextCol, nextRow, navigation)
      if (closed[next]) continue
      // Both cardinal neighbors must be open before taking a diagonal.
      if (dx && dz && (!isCellWalkable(col + dx, row, navigation) || !isCellWalkable(col, row + dz, navigation))) continue
      const tentative = gScore[current] + cost
      if (tentative >= gScore[next]) continue
      cameFrom[next] = current
      gScore[next] = tentative
      fScore[next] = tentative + octileDistance(nextCol, nextRow, goalCell.col, goalCell.row)
      pushOpen(open, { index: next, g: tentative, f: fScore[next] })
    }
  }
  return null
}

export function isAvatarPathClear(path, navigation = DEFAULT_NAVIGATION) {
  if (!Array.isArray(path) || !path.length) return false
  return path.every((point) => isAvatarWalkable(point, navigation))
    && path.slice(1).every((point, index) => segmentIsClear(path[index], point, navigation))
}

export function measureAvatarPath(path) {
  return pathDistance(path || [])
}

function makeNavigationDebugGrid(navigation) {
  const blockedCells = []
  const { cols, rows, cellSize, minX, minZ } = navigation.grid
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!isCellWalkable(col, row, navigation)) blockedCells.push([col, row])
    }
  }
  return Object.freeze({
    districtId: navigation.districtId,
    cols,
    rows,
    cellSize,
    minX,
    minZ,
    blockedCells: Object.freeze(blockedCells),
  })
}

const navigationDebugGridCache = new WeakMap()

export function getAvatarNavigationDebugGrid(navigation = DEFAULT_NAVIGATION) {
  let grid = navigationDebugGridCache.get(navigation)
  if (!grid) {
    grid = makeNavigationDebugGrid(navigation)
    navigationDebugGridCache.set(navigation, grid)
  }
  return grid
}

export function avatarPointToDebugCell(point, navigation = DEFAULT_NAVIGATION) {
  const cell = worldToGrid(point, navigation)
  return { col: cell.col + 0.5, row: cell.row + 0.5 }
}

export function moveAvatarStep(position, direction, distance, navigation = DEFAULT_NAVIGATION) {
  const next = { x: position.x + direction.x * distance, z: position.z + direction.z * distance }
  const resolved = { ...position }
  // Per-axis resolution prevents corner tunnelling while still allowing sliding.
  if (isAvatarWalkable({ x: next.x, z: resolved.z }, navigation)) resolved.x = next.x
  if (isAvatarWalkable({ x: resolved.x, z: next.z }, navigation)) resolved.z = next.z
  return resolved
}
