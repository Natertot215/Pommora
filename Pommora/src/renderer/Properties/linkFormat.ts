import { LINK_DISPLAY_LABELS, LINK_DISPLAYS, type LinkDisplay } from '@shared/properties'
import type { PickerOption } from '@renderer/DesignSystem/Elements/PickerControl'

/** The three link forms as a picker's rows — read by a URL property's own Format control and by the
 *  nexus-wide default in Settings.
 *
 *  Default first, so `labelOf`'s fallback reads as the default for a value it doesn't recognize. */
export const LINK_FORMAT_OPTIONS: PickerOption<LinkDisplay>[] = LINK_DISPLAYS.map((value) => ({
  value,
  label: LINK_DISPLAY_LABELS[value],
}))
