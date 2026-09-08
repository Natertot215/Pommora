import type { Size } from '@pommora/uix/Interactions/ResizeFrame'
import { isGlanceSize } from '../../Contract/validators'
import { useSession } from '../../Session/store'

/** A floating window's remembered size, machine-local per Nexus. The stored map arrives from `nexus.db` unvalidated, so an entry that is not a pair of finite numbers opens at the default instead. */
export function useWindowGeometry(id: string): {
  initialSize?: Size
  onSizeChange: (size: Size) => void
} {
  const stored = useSession((s) => s.devicePrefs.windows?.[id])
  // A drop reports whenever any rect key moved, which a window move always does; only a size that differs is worth a write.
  const onSizeChange = (size: Size): void => {
    const s = useSession.getState()
    const windows = s.devicePrefs.windows
    const prev = windows?.[id]
    if (prev?.w === size.w && prev.h === size.h) return
    s.setDevicePref('windows', { ...windows, [id]: size })
  }
  return { initialSize: isGlanceSize(stored) ? stored : undefined, onSizeChange }
}
