import { style } from '@vanilla-extract/css'

/** KNOB — the hierarchy's disclosed sub-group chips render a step smaller than table chips. */
export const subChip = style({ zoom: 0.85 })

export const rowHoverScope = style({})

export const revealEye = style({
  selectors: {
    '&&': { opacity: 0 },
    [`${rowHoverScope}:hover &&`]: { opacity: 'var(--state-ghost)' },
    [`${rowHoverScope}:hover &&:hover`]: { opacity: 1 },
  },
})
