import type { ViewKindRecord } from '../Host/viewKinds'
import { VisibilityFrame } from '../Settings/VisibilityFrame'
import { TITLE_ICONS } from '../Settings/switchRows'
import { TableView } from './TableView'

export const TABLE_KIND: ViewKindRecord = {
  Renderer: TableView,
  Visibility: VisibilityFrame,
  nests: true,
  outlines: false,
  layout: {
    leaf: 'visibility',
    leafSwitches: [
      { icon: 'columns-3-cog', label: 'Column Icons', key: 'hide_column_icons', invert: true },
      { icon: 'view-table', label: 'Hide Borders', key: 'hide_borders' },
      TITLE_ICONS,
    ],
  },
}
