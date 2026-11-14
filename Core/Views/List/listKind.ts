import { switchRow } from '@pommora/uix/Menus/MenuIndex'
import { ROOT_ROW_LOOK } from '@pommora/uix/Menus/frames.css'
import type { ViewKindRecord } from '../Host/viewKinds'
import { SidesFrame } from '../Settings/SidesFrame'
import { switchRows, TITLE_ICONS, type ViewSwitch } from '../Settings/switchRows'
import { viewOption } from '../views'
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
  outlines: true,
  layout: {
    leaf: 'visibility',
    footing: (view, write) => [
      ...switchRows(SWITCHES, view, write),
      switchRow(
        'list',
        'Markers',
        viewOption(view, 'marker') !== 'none',
        (next) => void write({ marker: next ? 'bullet' : 'none' }),
        ROOT_ROW_LOOK,
      ),
    ],
  },
}
