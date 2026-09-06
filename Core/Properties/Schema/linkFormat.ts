import {
  LINK_DISPLAY_LABELS,
  LINK_DISPLAYS,
  type LinkDisplay,
} from '@pommora/core/Properties/properties'
import type { PickerOption } from '@pommora/uix/Pickers/PickerControl'

/** Default first, so `labelOf`'s fallback reads as the default for a value it doesn't recognize. */
export const LINK_FORMAT_OPTIONS: PickerOption<LinkDisplay>[] = LINK_DISPLAYS.map((value) => ({
  value,
  label: LINK_DISPLAY_LABELS[value],
}))
