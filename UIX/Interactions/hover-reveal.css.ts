import { globalStyle, style } from '@vanilla-extract/css'
import { STATE_OPACITY } from '../Theme/color.css'
import { duration, easing } from '../Animations/motion'

const HOST = '[data-reveal-host]'
const HOVER_HOST = '[data-reveal-host=""]'
const SHOWN = { vars: { '--reveal': '1', '--reveal-hits': 'auto' } }
const HIDDEN = { vars: { '--reveal': '0', '--reveal-hits': 'none' } }

// ── Hosts ──
globalStyle(':root', { vars: { '--reveal-fade': duration.fast } })
globalStyle(HOST, HIDDEN)
// A line row or a sortable item takes keyboard focus for the row inside it, so its focus reveals that row.
const FOCUSED_ROW = ':is([data-line-row], [aria-roledescription="sortable"]):focus-visible'
globalStyle(
  `${HOVER_HOST}:hover, ${HOVER_HOST}:focus-visible, ${FOCUSED_ROW} > ${HOVER_HOST}, [data-reveal-host="on"]`,
  SHOWN,
)
globalStyle(HOVER_HOST, { '@media': { '(hover: none)': SHOWN } })
// A lifted source hides its reveals, the row a lifted line row or sortable item holds included.
globalStyle(
  `${HOST}[data-drag-source], ${HOST}:has([data-drag-source]), [data-line-row][data-drag-source] > ${HOST}, [aria-roledescription="sortable"][aria-pressed="true"] > ${HOST}`,
  HIDDEN,
)

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
