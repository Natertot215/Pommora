import { lockLabel } from '../Actions/toggleLabels'
import type { TileHostRef } from './tiles'
import { FooterLockButton } from '@pommora/uix/Menus'
import { setTileDocLock } from './tileDocStore'
import { useDocState } from './useTileDoc'

export function BoardLock({ host }: { host: TileHostRef }): React.JSX.Element {
  const { locked, ready } = useDocState(host)
  return (
    <FooterLockButton
      ariaLabel={lockLabel(locked, 'Board')}
      locked={locked}
      onToggle={() => setTileDocLock(host, !locked)}
      disabled={!ready}
    />
  )
}
