import type { ViewKindRecord } from '../Host/viewKinds'
import { SidesFrame } from '../Settings/SidesFrame'
import { switchRows, TITLE_ICONS, type ViewSwitch } from '../Settings/switchRows'
import { ListView } from './ListView'

const SWITCHES: ViewSwitch[] = [
  TITLE_ICONS,
  { icon: 'list-tree', label: 'Outlines', key: 'hide_outlines', invert: true },
  { icon: 'wrap-text', label: 'Wrap Rows', key: 'wrap_rows' },
]

export const LIST_KIND: ViewKindRecord = {
  Renderer: ListView,
  Visibility: SidesFrame,
  nests: true,
  layout: {
    leaf: 'visibility',
    switches: [],
    rows: (view, write) => switchRows(SWITCHES, view, write),
  },
}
