import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { SavedView } from '@pommora/core/Views/views'
import { MenuIndex } from '@pommora/uix/Menus'
import { useSaveView } from './ViewTileScope'
import { switchRows, type SwitchEntry } from './switchRows'

const SWITCHES: SwitchEntry[] = [
  { icon: 'map', label: 'Hide Location', key: 'hide_location' },
  { icon: 'wrap-text', label: 'Wrap Titles', key: 'wrap_titles' },
  { icon: 'eye-off', label: 'Hide Icons', key: 'hide_page_icons' },
  { icon: 'folder-closed', label: 'Set Cards', key: 'set_cards', defaultOn: true },
]

export function CardsOptions({
  source,
  view,
}: {
  source: CollectionNode | SetNode
  view: SavedView
}): React.JSX.Element {
  const saveView = useSaveView(source)

  return (
    <MenuIndex sections={[{ rows: switchRows(SWITCHES, view, (next) => void saveView(next)) }]} />
  )
}
