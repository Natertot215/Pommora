import { GlassSurface } from '@renderer/design-system/materials'
import './inspector-panel.css'

/**
 * `open` only sets aria-hidden here — the actual reserve/push happens in the shell.
 * Empty scaffold for now: selection-aware content (frontmatter → properties → page info)
 * mounts in `.inspector-body`.
 */
export function InspectorPanel({ open }: { open: boolean }): React.JSX.Element {
  return (
    <GlassSurface className="inspector-glass" aria-hidden={!open}>
      <div className="inspector-body" />
    </GlassSurface>
  )
}
