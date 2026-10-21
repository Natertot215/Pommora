import { globalStyle, style } from '@vanilla-extract/css'
import { REVEAL_FADE } from '../Interactions/hover-reveal.css'

export const swap = style({ display: 'inline-grid' })
// Zero specificity, so a host's own class sets how the faces sit.
globalStyle(`:where(${swap})`, { placeItems: 'center' })

// A grid of its own, so an icon face draws with no line box; it fades at its host's beat, so a surface that slows its fades (the code block's tag) slows its swap with them.
export const face = style({
  gridArea: '1 / 1',
  display: 'grid',
  transition: REVEAL_FADE,
  selectors: { '&[data-face="hidden"]': { opacity: 0 } },
})
