import { GlassPane } from '@pommora/uix/Glass'
import { paneSlide } from '@pommora/uix/Animations'
import { cx } from '@pommora/uix/Utilities/cx'
import './side-pane.css'

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
