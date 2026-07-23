import { globalStyle, style } from '@vanilla-extract/css'

/** The heading wearing its Space's color: the icon button AND the title field take the house
 *  input ring (the TextPicker inset recipe) in the color supplied via `--space-ring`; unset
 *  stays ringless. */
export const headerRing = style({})
globalStyle(`${headerRing} > div > *`, {
  boxShadow: 'inset 0 0 0 1px var(--space-ring, transparent)',
})
