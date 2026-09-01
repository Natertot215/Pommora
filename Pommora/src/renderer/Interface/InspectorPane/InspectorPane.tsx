import { GlassPane } from '@renderer/DesignSystem/Glass'
import { paneSlide } from '@renderer/DesignSystem/Animation'
import { cx } from '@renderer/DesignSystem/Util/cx'
import './inspectorPane.css'

/** `open` only sets aria-hidden here — the actual reserve/push happens in the shell.
 *  `.inspector-body` is where selection-aware content mounts. */
export function InspectorPane({ open }: { open: boolean }): React.JSX.Element {
  return (
    <GlassPane
      className={cx('inspector-glass', paneSlide({ side: 'right', mode: 'overlay' }))}
      aria-hidden={!open}
    >
      <div className="inspector-body" />
    </GlassPane>
  )
}
