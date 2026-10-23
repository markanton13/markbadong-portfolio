import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { automationTerminalProjects } from '../../data/markverseContent'
import { AutomationLabFallback } from './AutomationLabFallback'
import { AUTOMATION_LAB_DISTRICT, DISTRICT_REGISTRY, getAvailableDistricts, getDistrictById } from './districtRegistry.js'
import { avatarPointToDebugCell } from './avatarNavigation'
import { OperationsHQFallback } from './districts/OperationsHQFallback.jsx'
import { OPERATIONS_HQ_CAREER_ITEMS, OPERATIONS_HQ_CONTENT_BY_ID, OPERATIONS_HQ_DIRECT_ACCESS_ITEMS } from './districts/operationsHQContent.js'

const DISTRICT_SCENES = Object.freeze(Object.fromEntries(DISTRICT_REGISTRY.map((district) => [district.id, lazy(district.sceneLoader)])))

function SceneLoading({ districtLabel }) {
  return (
    <div className="markverse-scene-loading" role="status" aria-live="polite" aria-atomic="true">
      <span className="markverse-scene-loading-indicator" aria-hidden="true" />
      <span>{`Loading ${districtLabel}…`}</span>
    </div>
  )
}

function readDistrictId() {
  const params = new URLSearchParams(window.location.search)
  const requestedId = params.get('district') || (import.meta.env.DEV && params.get('hqPreview') === 'operations-hq' ? 'operations-hq' : AUTOMATION_LAB_DISTRICT.id)
  const requested = getDistrictById(requestedId)
  return requested && (requested.status === 'available' || import.meta.env.DEV) ? requested.id : AUTOMATION_LAB_DISTRICT.id
}

class DistrictSceneErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) {
    if (import.meta.env.DEV) console.error('MARKVERSE district failed to load:', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function formatDebugDiagnostics(snapshot, fallbackReason = '') {
  const value = (number, digits = 1) => Number.isFinite(number) ? number.toFixed(digits) : '—'
  const point = (position) => position ? `(${value(position.x, 2)}, ${value(position.z, 2)})` : '—'
  const movement = snapshot?.movement
  return [
    'MARKVERSE 3D · LOCAL DIAGNOSTICS',
    `State: ${fallbackReason ? `fallback · ${fallbackReason}` : snapshot?.status || 'waiting for renderer'}`,
    snapshot?.renderMode === 'on-demand'
      ? 'FPS: on-demand idle · camera updates capped at 30 FPS'
      : `FPS: ${value(snapshot?.fps)} current · ${value(snapshot?.averageFps)} rolling avg · ${snapshot?.sampleCount || 0} frames`,
    snapshot?.renderMode === 'on-demand'
      ? 'Frame time: on-demand scene · no continuous idle frame loop'
      : `Frame: ${value(snapshot?.frameTime)} ms current · ${value(snapshot?.averageFrameTime)} avg · ${value(snapshot?.p95FrameTime)} p95`,
    snapshot?.renderMode === 'on-demand'
      ? 'RAF: one-shot redraw on camera or resize changes'
      : `RAF callbacks: ${value(snapshot?.averageRafTime)} ms avg · ${value(snapshot?.p95RafTime)} p95`,
    `CPU update + render submission: ${value(snapshot?.cpuRenderTime)} ms current · ${value(snapshot?.averageCpuRenderTime)} rolling avg · ${value(snapshot?.p95CpuRenderTime)} p95`,
    `GPU render time: ${snapshot?.gpuTimerAvailable ? `${value(snapshot.gpuRenderTime)} ms current · ${value(snapshot.averageGpuRenderTime)} avg` : 'timer-query extension unavailable'}`,
    `Draw calls: ${snapshot?.drawCalls ?? '—'} · triangles: ${snapshot?.triangles ?? '—'}`,
    snapshot?.geometryCount !== undefined ? `Renderer memory: ${snapshot.geometryCount} geometries · ${snapshot.textureCount} textures` : '',
    `DPR: ${value(snapshot?.devicePixelRatio, 2)} · canvas: ${snapshot ? `${snapshot.canvasWidth}×${snapshot.canvasHeight}` : '—'} px`,
    `Canvas CSS: ${snapshot ? `${snapshot.cssWidth}×${snapshot.cssHeight}` : '—'} · WebGL: ${snapshot?.webglVersion || '—'}`,
    `Page: ${snapshot?.pageVisibility || '—'} · focused: ${snapshot ? snapshot.pageFocused : '—'} · cap: ${snapshot?.renderCapFps || 30} FPS`,
    `GPU renderer: ${snapshot?.rendererName || '—'}`,
    movement ? `Avatar: ${movement.mode} · (${movement.position.x}, ${movement.position.z}) · ${movement.pendingWaypoints} waypoints` : 'Avatar: —',
    movement?.hasPathPlan ? `Last path: ${movement.lastPathFound ? 'found' : 'blocked'} · ${value(movement.lastPathDistance, 2)}u · ${movement.lastPathNodes} waypoints · ${value(movement.lastPathMs, 2)} ms` : movement ? 'Last path: none requested' : '',
    movement ? `Route ${point(movement.lastPathStart)} → ${point(movement.lastPathDestination)} · terminal: ${movement.terminalPending ? 'pending' : 'idle'}` : '',
    `Fallback: 2 active windows below 19 FPS (${snapshot?.fallbackWindows || 0}/2) · ${snapshot?.fallbackDecision || 'waiting'}`,
    'Diagnostic data stays in this browser tab and is not transmitted.',
  ].filter(Boolean).join('\n')
}

function NavigationDebugOverlay({ snapshot, navigation }) {
  const grid = snapshot?.navigationGrid
  const movement = snapshot?.movement
  if (!grid || !movement) return null
  const hasPathPlan = movement.hasPathPlan
  const gridPath = [
    ...Array.from({ length: grid.cols + 1 }, (_, col) => `M${col} 0V${grid.rows}`),
    ...Array.from({ length: grid.rows + 1 }, (_, row) => `M0 ${row}H${grid.cols}`),
  ].join(' ')
  const blockedPath = grid.blockedCells.map(([col, row]) => `M${col} ${row}h1v1h-1Z`).join(' ')
  const routePoints = (movement.lastRoute || []).map((point) => {
    const cell = avatarPointToDebugCell(point, navigation)
    return `${cell.col},${cell.row}`
  }).join(' ')
  const marker = (point) => point ? avatarPointToDebugCell(point, navigation) : null
  const start = marker(movement.lastPathStart)
  const destination = marker(movement.lastPathDestination)
  const terminal = marker(movement.terminalApproach)
  const anchors = movement.interactionAnchors || []
  const spawn = marker(movement.spawn)
  const portal = marker(movement.portal)

  return (
    <aside className="markverse-navigation-debug" aria-label="Development navigation map">
      <div className="markverse-navigation-debug-heading">NAV GRID · {!hasPathPlan ? 'NO PLAN' : movement.lastPathFound ? 'ROUTE FOUND' : 'NO ROUTE'}</div>
      <svg viewBox={`0 0 ${grid.cols} ${grid.rows}`} style={{ aspectRatio: `${grid.cols}/${grid.rows}` }} role="img" aria-label="Top-down navigation grid showing walkable and blocked areas, route, spawn, station anchors, active district portal, and destination">
        <rect width={grid.cols} height={grid.rows} fill="#091322" />
        <path className="nav-debug-grid-lines" d={gridPath} />
        <path className="nav-debug-blocked-cells" d={blockedPath} />
        {hasPathPlan && routePoints && <polyline className="nav-debug-route" points={routePoints} />}
        {start && <circle className="nav-debug-start" cx={start.col} cy={start.row} r="0.42" />}
        {destination && <circle className="nav-debug-destination" cx={destination.col} cy={destination.row} r="0.38" />}
        {terminal && <path className="nav-debug-terminal" d={`M${terminal.col - 0.5} ${terminal.row}H${terminal.col + 0.5} M${terminal.col} ${terminal.row - 0.5}V${terminal.row + 0.5}`} />}
        {spawn && <path className="nav-debug-spawn" d={`M${spawn.col - 0.42} ${spawn.row}H${spawn.col + 0.42} M${spawn.col} ${spawn.row - 0.42}V${spawn.row + 0.42}`} />}
        {anchors.map((anchor) => {
          const point = marker(anchor)
          return point && <circle key={anchor.id} className="nav-debug-anchor" cx={point.col} cy={point.row} r="0.32"><title>{anchor.id} interaction anchor</title></circle>
        })}
        {portal && <rect className="nav-debug-portal" x={portal.col - 0.36} y={portal.row - 0.36} width="0.72" height="0.72" />}
      </svg>
      <p>{!hasPathPlan ? 'Click a floor target to inspect a route' : movement.lastPathFound ? `${movement.lastPathDistance.toFixed(2)} world units · ${movement.lastPathNodes} waypoints` : 'Destination is blocked or unreachable'}</p>
      <div className="nav-debug-legend"><span>Spawn</span><span>Goal</span><span>Anchors</span><span>Portal</span></div>
    </aside>
  )
}

function getFallbackReason() {
  if (typeof window === 'undefined') return 'static'
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'reduced-motion'
  const memory = Number(navigator.deviceMemory || 0)
  const cores = Number(navigator.hardwareConcurrency || 0)
  if ((memory > 0 && memory <= 2) || (cores > 0 && cores <= 2)) return 'low-power'
  return ''
}

function HQContentPanel({ item }) {
  return (
    <div className="markverse-hq-content" aria-live="polite">
      {item.type === 'career' ? <>
        <div className="markverse-hq-content-meta"><span className="terminal-project-status">{item.period}</span><strong>{item.organization}</strong></div>
        <h3>Career milestone</h3>
        <p>{item.summary}</p>
        {item.note && <p className="markverse-hq-content-note">{item.note}</p>}
      </> : <>
        <p className="markverse-hq-content-summary">{item.summary}</p>
        {item.points?.length > 0 && <ul className="markverse-hq-content-points">{item.points.map((point) => <li key={point}>{point}</li>)}</ul>}
        {item.note && <p className="markverse-hq-content-note">{item.note}</p>}
        {item.related?.length > 0 && <div className="markverse-hq-related">
          <h3>{item.id === 'impact-evidence' ? 'Selected portfolio evidence' : 'Related portfolio case studies'}</h3>
          {item.id !== 'impact-evidence' && <p>These personal and portfolio projects illustrate related system-building and QA practice; they are separate from employment history.</p>}
          <ul>{item.related.map((project) => <li key={project.id}>
            <div><span className="terminal-project-status">{project.status}</span><strong>{project.title}</strong><p>{project.summary}</p></div>
            <a className="terminal-case-link" href={project.href}>Open case study <span aria-hidden="true">↗</span></a>
          </li>)}</ul>
        </div>}
      </>}
    </div>
  )
}

export function WorldEntry({ onViewChange }) {
  const [districtId, setDistrictId] = useState(readDistrictId)
  const activeDistrict = getDistrictById(districtId) || AUTOMATION_LAB_DISTRICT
  const operationsHQPreview = activeDistrict.id === 'operations-hq'
  const operationsHQLocalReview = operationsHQPreview && activeDistrict.status === 'preview' && import.meta.env.DEV
  const districtOptions = getAvailableDistricts({ includePreview: import.meta.env.DEV })
  const SceneComponent = DISTRICT_SCENES[activeDistrict.id]
  const searchParams = new URLSearchParams(window.location.search)
  const avatarRigQA = import.meta.env.DEV && operationsHQPreview && searchParams.get('avatarRigQA') === '1'
  const debug3d = import.meta.env.DEV && searchParams.get('debug3d') === '1'
  const debugNav = debug3d && searchParams.get('debugnav') === '1'
  const activeCameraConfig = activeDistrict.cameraConfig
  const activeNavigation = activeDistrict.navigation
  const cameraDefault = activeCameraConfig.defaultView
  const SceneFallback = operationsHQPreview ? OperationsHQFallback : AutomationLabFallback
  const [cameraView, setCameraView] = useState(() => ({ ...cameraDefault }))
  const [mobileCameraOpen, setMobileCameraOpen] = useState(false)
  const cameraViewRef = useRef(cameraView)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [activeHQContentId, setActiveHQContentId] = useState(null)
  const [selectedProject, setSelectedProject] = useState(automationTerminalProjects[0])
  const [fallbackReason, setFallbackReason] = useState(getFallbackReason)
  const [sceneReadyDistrictId, setSceneReadyDistrictId] = useState(null)
  const [navigationDiagnostics, setNavigationDiagnostics] = useState(null)
  const [travelTarget, setTravelTarget] = useState(null)
  const [transitioning, setTransitioning] = useState(false)
  const terminalButtonRef = useRef(null)
  const careerFocusFrameRef = useRef(0)
  const closeButtonRef = useRef(null)
  const terminalRef = useRef(null)
  const returnFocusRef = useRef(null)
  const diagnosticsRef = useRef(null)
  const latestDiagnosticsRef = useRef(null)
  const operationsHQControllerRef = useRef(null)
  const automationLabControllerRef = useRef(null)
  const districtSelectRef = useRef(null)
  const transitionTimerRef = useRef(null)
  const activeHQContent = activeHQContentId ? OPERATIONS_HQ_CONTENT_BY_ID[activeHQContentId] : null
  const dialogOpen = terminalOpen || Boolean(activeHQContent)
  const modalOpen = dialogOpen || Boolean(travelTarget)

  cameraViewRef.current = cameraView

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setFallbackReason(query.matches ? 'reduced-motion' : getFallbackReason())
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    if (modalOpen) closeButtonRef.current?.focus()
  }, [modalOpen])

  useEffect(() => {
    const handlePopState = () => {
      setDistrictId(readDistrictId())
      setSceneReadyDistrictId(null)
      setFallbackReason(getFallbackReason())
      setTravelTarget(null)
      setTerminalOpen(false)
      setActiveHQContentId(null)
      setTransitioning(false)
      setMobileCameraOpen(false)
      setCameraView({ ...getDistrictById(readDistrictId()).cameraConfig.defaultView })
      setNavigationDiagnostics(null)
      latestDiagnosticsRef.current = null
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current)
    }
  }, [])

  const closeTerminal = useCallback(() => {
    setTerminalOpen(false)
    setActiveHQContentId(null)
    setTravelTarget(null)
    window.requestAnimationFrame(() => returnFocusRef.current?.focus?.())
  }, [])

  const changeDistrict = useCallback((nextId, { replace = false } = {}) => {
    const nextDistrict = getDistrictById(nextId)
    if (!nextDistrict || (nextDistrict.status === 'preview' && !import.meta.env.DEV)) return
    const url = new URL(window.location.href)
    url.searchParams.set('district', nextDistrict.id)
    url.searchParams.delete('hqPreview')
    if (!url.hash || url.hash === '#markverse-entry') url.hash = 'markverse-entry'
    const historyMethod = replace ? 'replaceState' : 'pushState'
    window.history[historyMethod]({ ...window.history.state, districtId: nextDistrict.id }, '', url)
    setDistrictId(nextDistrict.id)
    setSceneReadyDistrictId(null)
    // Renderer failures and sustained-FPS fallback are scene-local. Re-evaluate
    // device-level policy so a healthy destination gets its own initialization.
    setFallbackReason(getFallbackReason())
    setCameraView({ ...nextDistrict.cameraConfig.defaultView })
    setMobileCameraOpen(false)
    setNavigationDiagnostics(null)
    latestDiagnosticsRef.current = null
    setTravelTarget(null)
    setTerminalOpen(false)
    setActiveHQContentId(null)
    setTransitioning(false)
    operationsHQControllerRef.current = null
    automationLabControllerRef.current = null
    window.requestAnimationFrame(() => districtSelectRef.current?.focus())
  }, [])

  const askToTravel = useCallback((destinationId, returnTarget = null) => {
    const destination = getDistrictById(destinationId)
    if (!destination || (destination.status === 'preview' && !import.meta.env.DEV)) return
    returnFocusRef.current = returnTarget || document.querySelector('.markverse-hq-canvas, .automation-lab-webgl canvas')
    setTerminalOpen(false)
    setActiveHQContentId(null)
    setTravelTarget(destination)
  }, [])

  const confirmTravel = useCallback(() => {
    if (!travelTarget) return
    const destinationId = travelTarget.id
    setTravelTarget(null)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      changeDistrict(destinationId)
      return
    }
    setTransitioning(true)
    transitionTimerRef.current = window.setTimeout(() => changeDistrict(destinationId), 260)
  }, [changeDistrict, travelTarget])

  const requestPortalTravel = useCallback((destinationId, returnTarget = null) => {
    askToTravel(destinationId, returnTarget)
  }, [askToTravel])

  const handleRendererFallback = useCallback((reason, snapshot = null) => {
    if (snapshot?.updatedAt !== undefined) latestDiagnosticsRef.current = snapshot
    if (debug3d && diagnosticsRef.current) {
      diagnosticsRef.current.textContent = formatDebugDiagnostics(latestDiagnosticsRef.current, reason)
    }
    setFallbackReason(reason)
  }, [debug3d])

  const handleDiagnostics = useCallback((snapshot) => {
    latestDiagnosticsRef.current = snapshot
    if (debugNav) setNavigationDiagnostics(snapshot)
    if (debug3d && diagnosticsRef.current) diagnosticsRef.current.textContent = formatDebugDiagnostics(snapshot)
  }, [debug3d, debugNav])

  const openTerminal = useCallback((returnTarget = terminalButtonRef.current) => {
    returnFocusRef.current = returnTarget
    setActiveHQContentId(null)
    setTerminalOpen(true)
  }, [])

  const focusCareerStation = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    window.cancelAnimationFrame(careerFocusFrameRef.current)
    const initial = cameraViewRef.current
    const target = { ...initial, azimuth: 12, elevation: Math.max(initial.elevation, 34), zoom: Math.max(initial.zoom, Math.min(1.12, activeCameraConfig.limits.zoom[1])) }
    const startedAt = performance.now()
    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / 280)
      const eased = 1 - (1 - progress) ** 3
      setCameraView({
        azimuth: initial.azimuth + (target.azimuth - initial.azimuth) * eased,
        elevation: initial.elevation + (target.elevation - initial.elevation) * eased,
        zoom: initial.zoom + (target.zoom - initial.zoom) * eased,
      })
      if (progress < 1) careerFocusFrameRef.current = window.requestAnimationFrame(animate)
    }
    careerFocusFrameRef.current = window.requestAnimationFrame(animate)
  }, [activeCameraConfig])

  useEffect(() => () => window.cancelAnimationFrame(careerFocusFrameRef.current), [])

  const openHQContent = useCallback((contentId, returnTarget = null) => {
    if (!OPERATIONS_HQ_CONTENT_BY_ID[contentId]) return
    if (contentId.startsWith('career-')) focusCareerStation()
    returnFocusRef.current = returnTarget || document.querySelector('.markverse-hq-canvas')
    operationsHQControllerRef.current?.cancelMovement?.()
    setTerminalOpen(false)
    setActiveHQContentId(contentId)
  }, [focusCareerStation])

  const handleTerminalKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeTerminal()
      return
    }
    if (event.key !== 'Tab') return
    const controls = terminalRef.current?.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')
    if (!controls?.length) return
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const changeCamera = (patch) => {
    setCameraView((current) => {
      const next = { ...current, ...patch }
      const { azimuth, elevation, zoom } = activeCameraConfig.limits
      return {
        azimuth: Math.max(azimuth[0], Math.min(azimuth[1], next.azimuth)),
        elevation: Math.max(elevation[0], Math.min(elevation[1], next.elevation)),
        zoom: Math.max(zoom[0], Math.min(zoom[1], next.zoom)),
      }
    })
  }

  const cameraDisabled = Boolean(fallbackReason)

  return (
    <section id="markverse-entry" className={`markverse-entry${operationsHQPreview ? ' markverse-hq-preview' : ''}`} aria-labelledby="markverse-title">
      <div className="markverse-entry-inner">
        <div className="markverse-story">
          <p className="markverse-kicker"><span /> OPERATIONS · AUTOMATION · SYSTEMS</p>
          <h1 id="markverse-title">Welcome to <em>MARKVERSE.</em></h1>
          <p className="markverse-lead">Real workflows. Useful systems. A world built from the work behind them.</p>
          <p className="markverse-copy">I’m Mark Anton. I combine my current Training Lead experience with operations, automation, web development, and interactive systems to build useful workflows and products.</p>
          <div className="markverse-entry-actions">
            {!operationsHQPreview && <button
              ref={terminalButtonRef}
              className="markverse-primary-action"
              type="button"
              onClick={(event) => openTerminal(event.currentTarget)}
              aria-expanded={terminalOpen}
              aria-controls="markverse-project-terminal"
            >
              <span aria-hidden="true">▣</span> Open the project terminal
            </button>}
            <button className="markverse-secondary-action" type="button" onClick={() => onViewChange?.('professional')}>Professional View <span aria-hidden="true">↓</span></button>
          </div>
          {operationsHQLocalReview && <p className="markverse-preview-note">LOCAL DEVELOPMENT PREVIEW · Operations HQ can be selected here; it is not exposed by production builds.</p>}
          <div className="markverse-credentials" aria-label="Professional highlights">
            <span><b>8+</b> years in operations & support</span>
            <span><b>4</b> career chapters</span>
            <span><b>3D</b> interactive systems in progress</span>
          </div>
        </div>

        <div className="markverse-world-column">
          <div className={`markverse-scene-interaction${transitioning ? ' is-transitioning' : ''}`} aria-label={`${activeDistrict.label} interactive three-dimensional room`}>
            {fallbackReason ? <SceneFallback /> : (
              <DistrictSceneErrorBoundary key={activeDistrict.id} fallback={<SceneFallback />}>
                <Suspense key={activeDistrict.id} fallback={<SceneLoading districtLabel={activeDistrict.label} />}>
                  {operationsHQPreview ? <SceneComponent
                    cameraView={cameraView}
                    onCameraChange={changeCamera}
                    onReady={() => setSceneReadyDistrictId(activeDistrict.id)}
                    onFallback={handleRendererFallback}
                    onDiagnostics={handleDiagnostics}
                    debug3d={debug3d}
                    debugNav={debugNav}
                    avatarRigQA={avatarRigQA}
                    sceneControllerRef={operationsHQControllerRef}
                    onStationOpen={openHQContent}
                    onPortalApproach={requestPortalTravel}
                  /> : <SceneComponent
                    cameraView={cameraView}
                    onCameraChange={changeCamera}
                    onReady={() => setSceneReadyDistrictId(activeDistrict.id)}
                    onOpenTerminal={(returnTarget) => openTerminal(returnTarget || terminalButtonRef.current)}
                    onFallback={handleRendererFallback}
                    debug3d={debug3d}
                    debugNav={debugNav}
                    onDiagnostics={handleDiagnostics}
                    terminalOpen={terminalOpen}
                    sceneControllerRef={automationLabControllerRef}
                    onPortalApproach={requestPortalTravel}
                  />}
                  {sceneReadyDistrictId !== activeDistrict.id && <SceneLoading districtLabel={activeDistrict.label} />}
                </Suspense>
              </DistrictSceneErrorBoundary>
            )}
            {debugNav && <NavigationDebugOverlay snapshot={navigationDiagnostics} navigation={activeNavigation} />}
            <p className="markverse-scene-hint">
              {fallbackReason === 'reduced-motion' ? 'Static room · reduced motion preference' : fallbackReason === 'low-power' ? 'Lightweight room · device capability' : fallbackReason === 'low-performance' ? 'Static room · 3D performance is limited' : fallbackReason === 'webgl-unavailable' ? 'Static room · WebGL is unavailable' : fallbackReason === 'scene-error' ? 'Static room · scene initialization failed' : operationsHQPreview ? 'OPERATIONS HQ · SELECT A STATION · DRAG TO ORBIT' : 'AUTOMATION LAB · DRAG TO ORBIT · CAMERA MOVEMENT IS LIMITED'}
            </p>
              {operationsHQLocalReview && !fallbackReason && <div className="markverse-hq-preview-stamp" aria-hidden="true">LOCAL REVIEW · OPERATIONS HQ</div>}
            {debug3d && <pre ref={diagnosticsRef} className="markverse-debug3d" aria-label="Local Three.js performance diagnostics">{formatDebugDiagnostics(latestDiagnosticsRef.current, fallbackReason)}</pre>}
          </div>
          <div className="markverse-mobile-scene-actions" aria-label={`${activeDistrict.label} quick controls`}>
            {operationsHQPreview ? <>
              <a className="markverse-mobile-scene-action" href="#markverse-hq-direct-access">Explore stations</a>
              <button className="markverse-mobile-scene-action" type="button" onClick={() => operationsHQControllerRef.current?.resetAvatar?.()}>Reset Mini Mark</button>
            </> : <>
              <button className="markverse-mobile-scene-action" type="button" onClick={(event) => {
                const activateTerminal = automationLabControllerRef.current?.goToTerminalFromControls
                if (activateTerminal) activateTerminal(event.currentTarget)
                else openTerminal(event.currentTarget)
              }}>Go to terminal</button>
              <button className="markverse-mobile-scene-action" type="button" onClick={() => automationLabControllerRef.current?.resetAvatar?.()}>Reset Mark</button>
            </>}
          </div>
          <p className="markverse-mobile-scene-help">
            {operationsHQPreview
              ? 'Use the arrow pad or WASD / arrow keys to move. Tap open floor to walk; station shortcuts open information directly.'
              : 'Use the arrow pad or WASD / arrow keys to move. Tap open floor to walk; drag the room to orbit.'}
          </p>
          {districtOptions.length > 1 && <nav className="markverse-district-nav" aria-label="MARKVERSE district navigation">
            <label htmlFor="markverse-district-select">Current district</label>
            <select
              ref={districtSelectRef}
              id="markverse-district-select"
              value={activeDistrict.id}
              onChange={(event) => changeDistrict(event.target.value)}
              aria-describedby="markverse-district-help"
            >
              {districtOptions.map((district) => <option key={district.id} value={district.id}>{district.label}{district.status === 'preview' ? ' · Local preview' : ''}</option>)}
            </select>
            <span id="markverse-district-help">Choose a room here or use its in-world floor portal.</span>
          </nav>}
          <div className="markverse-scene-actions">
            <span className="markverse-room-caption"><b>{String(activeDistrict.order).padStart(2, '0')}</b> {activeDistrict.label.toUpperCase()} <i /> {activeDistrict.summary}</span>
            <button
              className="markverse-camera-toggle"
              type="button"
              aria-expanded={mobileCameraOpen}
              aria-controls="markverse-camera-controls"
              onClick={() => setMobileCameraOpen((open) => !open)}
            >Camera controls <span aria-hidden="true">{mobileCameraOpen ? '−' : '+'}</span></button>
            <div id="markverse-camera-controls" className={`markverse-camera-controls${mobileCameraOpen ? ' is-open' : ''}`} role="group" aria-label={operationsHQPreview ? 'Operations HQ camera controls' : 'Room camera controls'}>
              <span>CAMERA</span>
              <button type="button" disabled={cameraDisabled} onClick={() => changeCamera({ azimuth: cameraView.azimuth - 5 })} aria-label="Rotate camera left">←</button>
              <button type="button" disabled={cameraDisabled} onClick={() => changeCamera({ azimuth: cameraView.azimuth + 5 })} aria-label="Rotate camera right">→</button>
              <button type="button" disabled={cameraDisabled} onClick={() => changeCamera({ zoom: cameraView.zoom + 0.04 })} aria-label="Zoom in">+</button>
              <button type="button" disabled={cameraDisabled} onClick={() => changeCamera({ zoom: cameraView.zoom - 0.04 })} aria-label="Zoom out">−</button>
              <button type="button" disabled={cameraDisabled} onClick={() => setCameraView(cameraDefault)} aria-label="Reset camera">Reset</button>
            </div>
          </div>

          {operationsHQPreview && <nav id="markverse-hq-direct-access" tabIndex="-1" className="markverse-hq-direct-access" aria-labelledby="markverse-hq-direct-title">
            <div className="markverse-hq-direct-heading"><h2 id="markverse-hq-direct-title">Explore Operations HQ</h2><span>Open any area directly, without walking Mini Mark.</span></div>
            <div className="markverse-hq-direct-groups">
              <div className="markverse-hq-career-access" role="group" aria-labelledby="markverse-hq-career-heading">
                <h3 id="markverse-hq-career-heading">Career Journey</h3>
                {OPERATIONS_HQ_CAREER_ITEMS.map((item, index) => <button key={item.id} type="button" onClick={(event) => openHQContent(item.id, event.currentTarget)}>
                  <small>{String(index + 1).padStart(2, '0')}</small>{item.title}
                </button>)}
              </div>
              <div className="markverse-hq-station-access" role="group" aria-labelledby="markverse-hq-stations-heading">
                <h3 id="markverse-hq-stations-heading">Operations Stations</h3>
                {OPERATIONS_HQ_DIRECT_ACCESS_ITEMS.filter((item) => item.type === 'station').map((item) => <button key={item.id} type="button" onClick={(event) => openHQContent(item.id, event.currentTarget)}>{item.title}</button>)}
              </div>
            </div>
          </nav>}

          {dialogOpen && (
            <div className="markverse-terminal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeTerminal() }}>
              <aside
                className="markverse-terminal-panel"
                id="markverse-project-terminal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="terminal-title"
                ref={terminalRef}
                onKeyDown={handleTerminalKeyDown}
              >
                <div className="terminal-panel-heading">
                  <div><p className="markverse-kicker">{activeHQContent ? activeHQContent.eyebrow || (activeHQContent.type === 'career' ? `CAREER JOURNEY · ${activeHQContent.period}` : 'OPERATIONS HQ') : 'PROJECT TERMINAL · AUTOMATION LAB'}</p><h2 id="terminal-title">{activeHQContent ? activeHQContent.title : 'Systems built from real workflows.'}</h2></div>
                  <button ref={closeButtonRef} type="button" className="terminal-close" onClick={closeTerminal} aria-label={activeHQContent ? 'Close Operations HQ information' : 'Close project terminal'}>×</button>
                </div>
                {activeHQContent ? <div className="terminal-panel-scroll" role="region" aria-label={`${activeHQContent.title} details`} tabIndex="0">
                  <HQContentPanel item={activeHQContent} />
                </div> : <div className="terminal-panel-scroll" role="region" aria-label={`${selectedProject.name} project details`} tabIndex="0">
                  <div className="terminal-project-tabs" role="group" aria-label="Choose a project">
                    {automationTerminalProjects.map((project) => (
                      <button
                        type="button"
                        key={project.slug}
                        className={selectedProject.slug === project.slug ? 'is-selected' : ''}
                        onClick={() => setSelectedProject(project)}
                        aria-pressed={selectedProject.slug === project.slug}
                      >
                        {project.name}
                      </button>
                    ))}
                  </div>
                  <div className="terminal-project-detail" aria-live="polite">
                    <div><span className="terminal-project-status">{selectedProject.status}</span><h3>{selectedProject.name}</h3><p>{selectedProject.summary}</p></div>
                    <div className="terminal-project-meta"><span>MY ROLE</span><strong>{selectedProject.role}</strong><span>TOOLS</span><strong>{selectedProject.tools.join(' · ')}</strong></div>
                    <a className="terminal-case-link" href={selectedProject.caseStudyUrl}>Open full case study <span aria-hidden="true">↗</span></a>
                  </div>
                </div>}
              </aside>
            </div>
          )}
          {travelTarget && <div className="markverse-terminal-backdrop markverse-travel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeTerminal() }}>
            <section className="markverse-travel-dialog" role="dialog" aria-modal="true" aria-labelledby="markverse-travel-title" onKeyDown={(event) => {
              if (event.key === 'Escape') { event.preventDefault(); closeTerminal() }
              if (event.key === 'Tab') {
                const controls = event.currentTarget.querySelectorAll('button:not(:disabled)')
                if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1]?.focus() }
                else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0]?.focus() }
              }
            }}>
              <div className="terminal-panel-heading">
                <div><p className="markverse-kicker">DISTRICT PORTAL</p><h2 id="markverse-travel-title">Travel to {travelTarget.label}?</h2></div>
                <button ref={closeButtonRef} type="button" className="terminal-close" aria-label="Stay in this district" onClick={closeTerminal}>×</button>
              </div>
              <p>{travelTarget.summary} Mini Mark will appear at the district entrance. You can also change districts from the accessible selector at any time.</p>
              <div className="markverse-travel-actions">
                <button type="button" className="markverse-primary-action" onClick={confirmTravel}>Travel to {travelTarget.label}</button>
                <button type="button" className="markverse-secondary-action" onClick={closeTerminal}>Stay here</button>
              </div>
            </section>
          </div>}
          {transitioning && <div className="markverse-district-transition" role="status" aria-live="polite">Opening {travelTarget?.label || 'the next district'}…</div>}
        </div>
      </div>
    </section>
  )
}
