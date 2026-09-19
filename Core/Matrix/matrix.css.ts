import { style } from '@vanilla-extract/css'
import { hexA, SURFACE_FROST } from '@pommora/uix/Glass/glass-base'
import { vars } from '@pommora/uix/Theme/color.css'
import { PURE_WHITE } from '@pommora/uix/Theme/colors'

const c = vars.color

// KNOBs — the node-to-title drop and the icon-to-title clearance, shared with the canvas's own titles.
export const TITLE_OFFSET = 4
export const TITLE_ICON_GAP = 4
const ROW_GAP = '2px'

export const host = style({
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background: c.background.window,
  vars: {
    '--matrix-fill': c.label.control,
    '--matrix-ring': `${PURE_WHITE}${hexA(SURFACE_FROST.borderAlpha)}`,
    '--matrix-ring-hover': 'var(--accent-stroke)',
    '--matrix-ring-drag': 'var(--accent-stroke-hot)',
    '--matrix-link': c.solid.greyDefault,
    '--matrix-link-hover': 'var(--accent-stroke)',
    '--matrix-title': c.label.primary,
    '--matrix-inactive': 'var(--state-inactive)',
    '--matrix-hairline': 'var(--width-200)',
    '--matrix-ring-width': 'var(--width-150)',
  },
})

export const canvas = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  display: 'block',
  touchAction: 'none',
})

export const stage = style({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  overflow: 'hidden',
})

export const anchor = style({
  position: 'absolute',
  top: 0,
  left: 0,
  borderRadius: 'var(--radius-full)',
  pointerEvents: 'auto',
})

export const label = style({
  position: 'absolute',
  top: 0,
  left: 0,
  paddingTop: `${TITLE_OFFSET}px`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: ROW_GAP,
})

export const labelRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: `${TITLE_ICON_GAP}px`,
  color: c.label.primary,
})

export const labelGlyph = style({
  color: c.label.secondary,
})
