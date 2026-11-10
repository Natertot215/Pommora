import { pickerRow, steppedRow } from '@pommora/uix/Menus/MenuIndex'
import type { PickerOption } from '@pommora/uix/Menus/PickerControl'
import { ROOT_ROW_LOOK } from '@pommora/uix/Menus/frames.css'
import { TENTHS_SCALE } from '../../Settings/personalization'
import { type CardBanner, TITLE_ICONS, type ViewFormat, viewOption } from '../views'
import type { ViewKindRecord } from '../Host/viewKinds'
import { VisibilityFrame } from '../Settings/VisibilityFrame'
import { CardsView } from './CardsView'

const BANNERS: PickerOption<CardBanner>[] = [
  { value: 'preview', label: 'Preview' },
  { value: 'banner', label: 'Banner' },
  { value: 'none', label: 'None' },
]

const FORMATS: PickerOption<ViewFormat>[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'standard', label: 'Standard' },
]

export const CARDS_KIND: ViewKindRecord = {
  Renderer: CardsView,
  nests: false,
  layout: {
    leaf: 'switches',
    Properties: VisibilityFrame,
    switches: [
      { icon: 'map', label: 'Hide Location', key: 'hide_location' },
      { icon: 'wrap-text', label: 'Wrap Titles', key: 'wrap_titles' },
      TITLE_ICONS,
      { icon: 'folder-closed', label: 'Set Cards', key: 'set_cards' },
    ],
    rows: (view, write) => [
      pickerRow(
        'image',
        'Card Image',
        viewOption(view, 'card_banner'),
        BANNERS,
        (v) => write({ card_banner: v }),
        ROOT_ROW_LOOK,
      ),
      pickerRow(
        'palette',
        'Card Style',
        viewOption(view, 'format'),
        FORMATS,
        (v) => write({ format: v }),
        ROOT_ROW_LOOK,
      ),
      steppedRow(
        'scaling',
        'Card Scale',
        {
          range: TENTHS_SCALE,
          value: view.card_size ?? TENTHS_SCALE.default,
          onPick: (v) => write({ card_size: v === TENTHS_SCALE.default ? undefined : v }),
        },
        ROOT_ROW_LOOK,
      ),
    ],
  },
}
