import { cx } from '../Utilities/cx'
import { paneInflow, paneOverlay, paneOverlayOpen } from './pane-slide.css'
import './slide-progress.css'

export function paneSlide({
  side,
  mode,
  open,
}: {
  side: 'left' | 'right'
  mode: 'overlay' | 'inflow'
  open: boolean
}): string {
  if (mode === 'overlay') return cx(paneOverlay[side], open && paneOverlayOpen)
  return paneInflow[open ? 'open' : 'closed']
}
