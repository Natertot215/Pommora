import { globalStyle, style } from '@vanilla-extract/css'

/** The heading wearing its Space's color: the title field takes the house input ring (the
 *  TextPicker inset recipe) in the color supplied via `--space-ring`; unset stays ringless. */
export const headerRing = style({})
globalStyle(`${headerRing} > div > :not(button)`, {
  boxShadow: 'inset 0 0 0 1px var(--space-ring, transparent)',
})
