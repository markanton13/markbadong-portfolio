export function VoxelBlock({ className = '', x, y, z = 0, width, height, depth, tone = 'teal' }) {
  const style = {
    '--block-width': `${width}px`,
    '--block-height': `${height}px`,
    '--block-depth': `${depth}px`,
    '--block-x': `${x}px`,
    '--block-y': `${y}px`,
    '--block-z': `${z}px`,
  }

  return (
    <div className={`voxel-block voxel-block-${tone} ${className}`} style={style} aria-hidden="true">
      <span className="voxel-face voxel-face-front" />
      <span className="voxel-face voxel-face-right" />
      <span className="voxel-face voxel-face-top" />
    </div>
  )
}
