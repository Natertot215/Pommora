import { GlassPane } from '@pommora/uix/Glass/glass-pane'
import { paneSlide } from '@pommora/uix/Animations/paneSlide'
import { cx } from '@pommora/uix/Utilities/cx'
import { publishChromePart } from '../chromeParts'
import './side-pane.css'

export function SidePane({ open }: { open: boolean }): React.JSX.Element {
  return (
    <GlassPane
      ref={publishChromePart('sidePane')}
      className={cx('side-pane-glass', paneSlide({ side: 'right', mode: 'overlay' }))}
      aria-hidden={!open}
    >
      <div className="side-pane-body" />
    </GlassPane>
  )
}
