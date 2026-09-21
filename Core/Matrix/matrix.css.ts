import { globalStyle, style } from '@vanilla-extract/css'
import { duration, easing } from '@pommora/uix/Animations/motion'
import { hexA, SURFACE_FROST } from '@pommora/uix/Glass/glass-base'
import { vars } from '@pommora/uix/Theme/color.css'
import { PURE_WHITE } from '@pommora/uix/Theme/colors'

const c = vars.color

// KNOBs — the canvas title's drop below its node, and the overlay row's icon-to-title clearance.
export const TITLE_OFFSET = 4
const TITLE_ICON_GAP = 4
const ROW_GAP = '2px'

export const host = style({
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  // The fade is a fixed band here, not a scroll signal: a canvas never scrolls, so the kit's timeline is dropped and its progress pinned open.
  animationName: 'none',
  selectors: {
    '&:not(.window *)': {
      maskImage: 'none',
      WebkitMaskImage: 'none',
    },
    '.window &': {
      flex: 1,
      minHeight: 0,
      vars: {
        '--os-lead': '1',
        '--os-trail': '1',
        '--over-scroll-fade': 'var(--window-toolbar-h)',
      },
    },
  },
  vars: {
    '--matrix-fill': c.label.control,
    '--matrix-fill-lit': c.label.primary,
    '--matrix-ring': `${PURE_WHITE}${hexA(SURFACE_FROST.borderAlpha)}`,
    '--matrix-ring-hover': 'var(--accent-stroke)',
    '--matrix-ring-drag': 'var(--accent-stroke-hot)',
    '--matrix-link': c.solid.greyDefault,
    '--matrix-link-hover': 'var(--accent-stroke)',
    '--matrix-title': c.label.primary,
    '--matrix-icon': c.solid.grey,
    '--matrix-icon-scale': '0.5',
    '--matrix-space-tint': 'var(--tint-tertiary)',
    '--matrix-space-lit-tint': 'var(--tint-primary)',
    '--matrix-space-icon-tint': 'var(--tint-solid)',
    '--matrix-inactive': 'var(--state-inactive)',
    '--matrix-hairline': 'var(--width-200)',
    '--matrix-ring-width': 'var(--width-150)',
  },
})

// The window's own frost is the fill and the graph runs to its edges, so the drag band has to outrank the surface it now covers.
export const matrixWindow = style({})

globalStyle(`${matrixWindow} .window-drag`, {
  zIndex: 1,
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
  // Both clearances key to the shell's own panes, which a floating window has neither of — its picture centres on the whole surface.
  selectors: {
    '.window &': {
      vars: { '--sidebar-clearance': '0px', '--side-pane-clearance': '0px' },
    },
  },
})

export const anchor = style({
  position: 'absolute',
  top: 0,
  left: 0,
  borderRadius: 'var(--radius-full)',
  pointerEvents: 'auto',
})

// Inert through its own exit, so a node the pointer has already left cannot take a press or re-arm a glance.
export const anchorClosing = style({
  pointerEvents: 'none',
})

// A transition rather than a pair of keyframes: a title re-hovered part-way through its exit carries on from the opacity it is painted at instead of restarting from nothing.
export const labelFade = style({
  opacity: 0,
  transition: `opacity ${duration.slow} ${easing.baseEase}`,
})

export const labelShown = style({
  opacity: 1,
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
  // The title follows the hovered node across the canvas, so anything it covers must still take the pointer.
  pointerEvents: 'none',
})

export const labelField = style({
  pointerEvents: 'auto',
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
