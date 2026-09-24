import type { Rect, ResizeGrip, Size } from '@pommora/uix/Interactions/ResizeFrame'
import { useSession } from '../../Session/store'
import { chromePartEl } from '../chromeParts'

/** A floating window's remembered size, machine-local per Nexus. */
export function useWindowGeometry(id: string): {
  initialSize?: Size
  onSizeChange: (size: Size, grip: ResizeGrip) => void
} {
  const stored = useSession((s) => s.devicePrefs.windows?.[id])
  // A move reports the size it started at, and that size may have been clamped onto a smaller viewport at the open — storing it would shrink a window that was only dragged.
  const onSizeChange = (size: Size, grip: ResizeGrip): void => {
    if (grip === 'move') return
    const s = useSession.getState()
    s.setDevicePref('windows', { ...s.devicePrefs.windows, [id]: size })
  }
  return { initialSize: stored, onSizeChange }
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
