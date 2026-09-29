import type { Rect, RememberedSize } from '@pommora/uix/Interactions/useResizable'
import { useSession } from '../../Session/store'
import { chromePartEl } from '../chromeParts'

/** A window's remembered size, machine-local per Nexus, as it stands at the call. */
export const windowGeometry = (id: string): RememberedSize => ({
  initialSize: useSession.getState().devicePrefs.windows?.[id],
  onSizeChange: (size) => {
    const s = useSession.getState()
    s.setDevicePref('windows', { ...s.devicePrefs.windows, [id]: size })
  },
})

/** The same, re-read whenever that size changes. */
export function useWindowGeometry(id: string): RememberedSize {
  useSession((s) => s.devicePrefs.windows?.[id])
  return windowGeometry(id)
}

/** The area the shell's panes leave free. A window centred on the viewport sits under the sidebar, which reads as off-centre. */
export function shellRegion(): Rect | null {
  const shell = chromePartEl('shell')
  if (!shell) return null
  const probe = document.createElement('div')
  probe.style.cssText = 'position:absolute;height:0;visibility:hidden'
  shell.append(probe)
  // The clearances are `calc()` over custom properties, which resolve to pixels only as a used value.
  const clearance = (token: string): number => {
    probe.style.width = `var(${token})`
    return probe.getBoundingClientRect().width
  }
  const left = clearance('--sidebar-clearance')
  const right = clearance('--side-pane-clearance')
  probe.remove()
  const box = shell.getBoundingClientRect()
  return { x: box.x + left, y: box.y, w: box.width - left - right, h: box.height }
}
