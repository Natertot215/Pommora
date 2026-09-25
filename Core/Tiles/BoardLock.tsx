import { lockLabel } from '@pommora/core/Actions/toggleLabels'
import type { TileHostRef } from '@pommora/core/Tiles/tiles'
import { FooterLockButton } from '@pommora/uix/Menus'
import { setTileDocLock } from './tileDocStore'
import { useTileDocLock } from './useTileDoc'

export function BoardLock({ host }: { host: TileHostRef }): React.JSX.Element {
  const { locked, ready } = useTileDocLock(host)
  return (
    <FooterLockButton
      ariaLabel={lockLabel(locked, 'Board')}
      locked={locked}
      onToggle={() => setTileDocLock(host, !locked)}
      disabled={!ready}
    />
  )
}
