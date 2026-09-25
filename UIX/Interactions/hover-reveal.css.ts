import { globalStyle, style } from '@vanilla-extract/css'
import { STATE_OPACITY } from '../Theme/color.css'
import { duration, easing } from '../Animations/motion'

const HOST = '[data-reveal-host]'
const HOVER_HOST = '[data-reveal-host=""]'
const SHOWN = { vars: { '--reveal': '1', '--reveal-hits': 'auto' } }

// ── Hosts ──
globalStyle(':root', { vars: { '--reveal-fade': duration.fast } })
globalStyle(HOST, { vars: { '--reveal': '0', '--reveal-hits': 'none' } })
globalStyle(`${HOVER_HOST}:hover, ${HOVER_HOST}:focus-visible, [data-reveal-host="on"]`, SHOWN)
globalStyle(HOVER_HOST, { '@media': { '(hover: none)': SHOWN } })

// ── Targets ──
export const REVEAL_FADE = `opacity var(--reveal-fade) ${easing.baseEase}`

export const revealTarget = style({
  selectors: {
    '&&': { opacity: 'var(--reveal, 0)', pointerEvents: 'var(--reveal-hits, none)' },
    '&&:focus-visible, &&[data-reveal-held]': { opacity: 1, pointerEvents: 'auto' },
  },
})

export const revealDim = style({
  selectors: {
    '&&': {
      opacity: `calc(var(--reveal, 0) * ${STATE_OPACITY.ghost})`,
      pointerEvents: 'var(--reveal-hits, none)',
    },
    '&&:hover, &&:focus-visible, &&[data-reveal-held]': { opacity: 1, pointerEvents: 'auto' },
  },
})
