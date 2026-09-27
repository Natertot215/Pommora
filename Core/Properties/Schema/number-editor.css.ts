import { style } from '@vanilla-extract/css'

// No flex `gap`: a collapsed Reveal would still consume one on each side, so each row carries its own top margin, which rides inside the Reveal and collapses with it.
export const section = style({ display: 'flex', flexDirection: 'column', paddingTop: '6px' })

export const rowRhythm = style({
  marginTop: '8px',
  selectors: { '&:first-child': { marginTop: 0 } },
})
