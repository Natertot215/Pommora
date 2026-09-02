import { paneInflow, paneOverlay } from './pane-slide.css'

export function paneSlide({
  side,
  mode,
  open = true,
}: {
  side: 'left' | 'right'
  mode: 'overlay' | 'inflow'
  open?: boolean
}): string {
  if (mode === 'overlay') return paneOverlay[side]
  return paneInflow[open ? 'open' : 'closed']
}
