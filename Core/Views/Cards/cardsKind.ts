import { pickerRow, steppedRow } from '@pommora/uix/Menus/MenuIndex'
import type { PickerOption } from '@pommora/uix/Menus/PickerControl'
import { ICON } from '@pommora/uix/Menus/frames.css'
import { TENTHS_SCALE } from '../../Settings/personalization'
import { type CardBanner, type ViewFormat, viewOption } from '../views'
import type { ViewKindRecord } from '../Host/viewKinds'
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

const CARD_ROW_LOOK = { iconSize: ICON.rootEntry, solid: true } as const

export const CARDS_KIND: ViewKindRecord = {
  Renderer: CardsView,
  nests: false,
  layout: {
    switches: [
      { icon: 'map', label: 'Hide Location', key: 'hide_location' },
      { icon: 'wrap-text', label: 'Wrap Titles', key: 'wrap_titles' },
      { icon: 'eye-off', label: 'Hide Icons', key: 'hide_page_icons' },
      { icon: 'folder-closed', label: 'Set Cards', key: 'set_cards' },
    ],
    rows: (view, write) => [
      pickerRow(
        'image',
        'Card Image',
        viewOption(view, 'card_banner'),
        BANNERS,
        (v) => write({ card_banner: v }),
        CARD_ROW_LOOK,
      ),
      pickerRow(
        'palette',
        'Card Style',
        viewOption(view, 'format'),
        FORMATS,
        (v) => write({ format: v }),
        CARD_ROW_LOOK,
      ),
      steppedRow(
        'scaling',
        'Card Scale',
        {
          range: TENTHS_SCALE,
          value: view.card_size ?? TENTHS_SCALE.default,
          onPick: (v) => write({ card_size: v === TENTHS_SCALE.default ? undefined : v }),
        },
        CARD_ROW_LOOK,
      ),
    ],
  },
}
