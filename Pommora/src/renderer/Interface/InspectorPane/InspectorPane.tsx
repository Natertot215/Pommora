import { GlassPane } from '@renderer/DesignSystem/Glass'
import './inspectorPane.css'

/**
 * `open` only sets aria-hidden here — the actual reserve/push happens in the shell.
 * Empty scaffold for now: selection-aware content (frontmatter → properties → page info)
 * mounts in `.inspector-body`.
 */
export function InspectorPane({ open }: { open: boolean }): React.JSX.Element {
  return (
    <GlassPane className="inspector-glass" aria-hidden={!open}>
      <div className="inspector-body" />
    </GlassPane>
  )
}
