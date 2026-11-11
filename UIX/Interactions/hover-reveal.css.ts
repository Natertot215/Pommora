import { globalStyle, style } from '@vanilla-extract/css'
import { STATE_OPACITY } from '../Theme/color.css'
import { duration, easing } from '../Animations/motion'

const HOST = '[data-reveal-host]'
const HOVER_HOST = '[data-reveal-host=""]'
const SHOWN = { vars: { '--reveal': '1', '--reveal-hits': 'auto' } }
const HIDDEN = { vars: { '--reveal': '0', '--reveal-hits': 'none' } }

// ── Row Wrappers ──
/** A row wrapper — a line row or a sortable item — takes keyboard focus for the row it holds. */
export const FOCUSED_ROW_WRAPPER =
  ':is([data-line-row], [aria-roledescription="sortable"]):focus-visible'
/** A row wrapper while lifted, by each engine's own mark. */
const LIFTED_ROW_WRAPPER =
  ':is([data-line-row][data-drag-source], [aria-roledescription="sortable"][aria-pressed="true"])'

// ── Hosts ──
globalStyle(':root', { vars: { '--reveal-fade': duration.fast } })
globalStyle(HOST, HIDDEN)
globalStyle(
  `${HOVER_HOST}:hover, ${HOVER_HOST}:focus-visible, ${FOCUSED_ROW_WRAPPER} > ${HOVER_HOST}, [data-reveal-host="on"]`,
  SHOWN,
)
globalStyle(HOVER_HOST, { '@media': { '(hover: none)': SHOWN } })
// A lifted source hides its reveals, the row a lifted wrapper holds included.
globalStyle(
  `${HOST}[data-drag-source], ${HOST}:has([data-drag-source]), ${LIFTED_ROW_WRAPPER} > ${HOST}`,
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
