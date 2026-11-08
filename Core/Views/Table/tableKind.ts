import type { ViewKindRecord } from '../Host/viewKinds'
import { TableView } from './TableView'

export const TABLE_KIND: ViewKindRecord = {
  Renderer: TableView,
  nests: true,
  layout: {
    leaf: 'visibility',
    switches: [
      { icon: 'columns-3-cog', label: 'Column Icons', key: 'hide_column_icons', invert: true },
      { icon: 'view-table', label: 'Hide Borders', key: 'hide_borders' },
      { icon: 'file-text', label: 'Page Icons', key: 'hide_page_icons', invert: true },
    ],
  },
}
