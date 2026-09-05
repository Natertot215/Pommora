import type { CollectionNode, SetNode } from '@shared/types'
import type { SavedView } from '@shared/views'
import { MenuIndex, MenuSeparator } from '@renderer/DesignSystem/Menus'
import { useSaveView } from '@renderer/Tiles/ViewTileScope'
import { switchRows, type SwitchEntry } from './switchRows'

const SWITCHES: SwitchEntry[] = [
  {
    icon: 'columns-3-cog',
    label: 'Column Icons',
    key: 'hide_column_icons',
    invert: true,
    defaultOn: true,
  },
  { icon: 'table', label: 'Hide Borders', key: 'hide_borders' },
  { icon: 'file-text', label: 'Page Icons', key: 'hide_page_icons', invert: true },
]

export function LayoutToggles({
  source,
  view,
}: {
  source: CollectionNode | SetNode
  view: SavedView
}): React.JSX.Element {
  const saveView = useSaveView(source)

  return (
    <>
      <MenuSeparator flush />
      <MenuIndex sections={[{ rows: switchRows(SWITCHES, view, (next) => void saveView(next)) }]} />
    </>
  )
}
