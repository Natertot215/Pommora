import type { ResizeGrip, Size } from '@pommora/uix/Interactions/ResizeFrame'
import { isGlanceSize } from '../../Contract/validators'
import { useSession } from '../../Session/store'

/** A floating window's remembered size, machine-local per Nexus. The stored map arrives from `nexus.db` unvalidated, so an entry that is not a pair of finite numbers opens at the default instead. */
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
  return { initialSize: isGlanceSize(stored) ? stored : undefined, onSizeChange }
}
