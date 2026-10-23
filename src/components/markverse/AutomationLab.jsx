import { VoxelBlock } from './VoxelBlock'

export function AutomationLab({ camera, onOpenTerminal, terminalOpen }) {
  const stageStyle = {
    '--camera-yaw': `${camera.yaw}deg`,
    '--camera-pitch': `${camera.pitch}deg`,
  }

  return (
    <div className="automation-lab" aria-label="Isometric Automation Lab room">
      <div className="lab-scene-glow" aria-hidden="true" />
      <div className="lab-scene-horizon" aria-hidden="true" />
      <div className="lab-scene" style={stageStyle} aria-hidden="true">
        <div className="lab-floor" />
        <div className="lab-back-wall">
          <div className="lab-window"><span /><span /><span /></div>
          <div className="lab-wall-sign"><i />MARKVERSE <b>SYS 01</b></div>
          <div className="lab-light-bar" />
        </div>
        <div className="lab-floor-line lab-floor-line-one" />
        <div className="lab-floor-line lab-floor-line-two" />

        <VoxelBlock className="lab-desk" x={5} y={8} z={72} width={220} height={30} depth={102} tone="violet" />
        <VoxelBlock className="lab-desk-base" x={5} y={8} z={28} width={148} height={68} depth={70} tone="navy" />
        <VoxelBlock className="lab-monitor" x={20} y={8} z={119} width={104} height={70} depth={17} tone="teal" />
        <VoxelBlock className="lab-monitor-stand" x={20} y={8} z={92} width={22} height={28} depth={16} tone="silver" />
        <VoxelBlock className="lab-console" x={-92} y={52} z={43} width={84} height={55} depth={70} tone="gold" />
        <VoxelBlock className="lab-shelf" x={130} y={-45} z={50} width={40} height={112} depth={58} tone="navy" />
        <VoxelBlock className="lab-shelf-top" x={130} y={-45} z={112} width={55} height={13} depth={72} tone="violet" />
        <VoxelBlock className="lab-cabinet" x={-190} y={-46} z={38} width={62} height={78} depth={62} tone="navy" />
        <VoxelBlock className="lab-cabinet-top" x={-190} y={-46} z={82} width={70} height={12} depth={70} tone="teal" />
        <VoxelBlock className="lab-floor-crate" x={-152} y={104} z={22} width={47} height={42} depth={45} tone="gold" />
        <VoxelBlock className="lab-floor-crate lab-floor-crate-two" x={153} y={98} z={23} width={46} height={44} depth={42} tone="violet" />
        <VoxelBlock className="lab-plant-pot" x={190} y={-108} z={19} width={38} height={28} depth={38} tone="navy" />
        <span className="lab-plant-leaf lab-plant-leaf-one" />
        <span className="lab-plant-leaf lab-plant-leaf-two" />
        <span className="lab-plant-leaf lab-plant-leaf-three" />
      </div>

      <div className="lab-floating-pixels" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
      <button
        className={`lab-terminal-hotspot${terminalOpen ? ' is-active' : ''}`}
        type="button"
        onClick={onOpenTerminal}
        aria-expanded={terminalOpen}
        aria-controls="markverse-project-terminal"
      >
        <span className="terminal-hotspot-icon" aria-hidden="true"><i /><i /><i /></span>
        <span><small>INTERACTIVE OBJECT</small><strong>Project terminal</strong></span>
        <span className="terminal-hotspot-arrow" aria-hidden="true">↗</span>
      </button>
      <div className="lab-status-chip" aria-hidden="true"><span /> SYSTEMS ONLINE <b>02</b></div>
    </div>
  )
}
