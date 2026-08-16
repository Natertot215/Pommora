import type { LinkDisplay } from '@shared/properties'
import type { PickerChoice } from './PickerControl'

/** The three link forms, as a person picks them — read by a URL property's own Format control and by
 *  the nexus-wide default in Settings, so the two can never name the same form differently.
 *
 *  Default first, so `labelOf`'s fallback reads as the default for a value it doesn't recognize. */
export const LINK_FORMAT_OPTIONS: PickerChoice<LinkDisplay>[] = [
  { value: 'link-full', label: 'Full Link' },
  { value: 'link-short', label: 'Short Link' },
  { value: 'link-title', label: 'Page Title' },
]
