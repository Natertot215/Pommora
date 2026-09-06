import { GlassPane } from '@pommora/uix/Glass/glass-pane'
import { paneSlide } from '@pommora/uix/Animations/paneSlide'
import { cx } from '@pommora/uix/Utilities/cx'
import './side-pane.css'

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
