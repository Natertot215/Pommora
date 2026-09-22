import { lockLabel } from '@pommora/core/Actions/toggleLabels'
import { type TileHostRef, tileHostKey } from '@pommora/core/Tiles/tiles'
import { FooterLockButton } from '@pommora/uix/Menus'
import { useSession } from '../Session/store'

export function BoardLock({ host }: { host: TileHostRef }): React.JSX.Element {
  const locked = useSession((s) => s.hostLocks[tileHostKey(host)] ?? false)
  const setHostLock = useSession((s) => s.setHostLock)
  return (
    <FooterLockButton
      ariaLabel={lockLabel(locked, 'Board')}
      locked={locked}
      onToggle={() => setHostLock(host, !locked)}
    />
  )
}
