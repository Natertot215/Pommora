import { globalStyle, style, styleVariants, type StyleRule } from '@vanilla-extract/css'
import { STATE_OPACITY, vars as colorVars } from '../Theme/color.css'
import { font, text } from '../Theme/typography.css'
import { tintAt } from '../Theme/colors'
import { ROW_RING } from '../Fields/fieldRing'
import { borderedField, field, fillInput } from '../Fields/fields.css'
import { REVEAL_FADE, revealTarget } from '../Interactions/hover-reveal.css'
import { duration, easing } from '../Animations/motion'

const c = colorVars.color

// KNOB — row height is never declared; it's the ramp's line plus the surface's padding.
globalStyle(':root', {
  vars: {
    '--row-pad-standard': '6px',
    '--row-pad-compact': '4px',
    '--row-pad-y': 'var(--row-pad-standard)',
    '--row-pad-x': 'var(--row-pad-standard)',
    '--row-size': font.scale.body.size,
    '--row-line': font.scale.body.line,
    '--row-value-reach': '75%', // KNOB — how far a trailing value may reach toward its label
  },
})

export const ROW_RADIUS = 8

const POINTED = tintAt('var(--accent)', 'quaternary')

/** What the keyboard stands on — a focused row, or the row an editor-driven list's cursor holds — washed as a layer over whatever fill the row already wears. */
const pointed = { backgroundImage: `linear-gradient(${POINTED}, ${POINTED})` }

const rowFocus = { outline: 'none', ...pointed }

export const rowShell = style({
  borderRadius: `${ROW_RADIUS}px`,
  cursor: 'default',
  selectors: {
    '&:hover': { backgroundColor: c.state.hover },
    '&:focus-visible, [data-line-row]:focus-visible &': rowFocus,
  },
})

globalStyle('[data-line-row]:focus-visible', { outline: 'none' })
globalStyle(`[data-line-row]:focus-visible:not(:has(${rowShell}))`, rowFocus)

export const ROW_LEAD = 'var(--row-pad-lead, var(--row-pad-x))'
export const ROW_TRAIL = 'var(--row-pad-trail, var(--row-pad-x))'

export const rowBox = style([
  text.body.standard,
  {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingBlock: 'var(--row-pad-y)',
    paddingLeft: ROW_LEAD,
    paddingRight: ROW_TRAIL,
    fontSize: 'var(--row-size)',
    lineHeight: 'var(--row-line)',
    color: c.label.primary,
    userSelect: 'none',
  },
])

export const flushAffordance = style({
  vars: { '--row-pad-lead': '0px' },
  gap: '4px',
  color: c.label.secondary,
})

export const topRow = style([
  flushAffordance,
  {
    vars: {
      '--row-pad-y': '2px',
      '--row-size': font.scale.caption.size,
      '--row-line': font.scale.caption.line,
    },
    fontWeight: font.weight.emphasized,
    color: c.label.secondary,
  },
])

export const topBarLeadingLabel = style([text.footnote.emphasized, { color: c.label.secondary }])
export const topBarLeadingSymbol = style({ display: 'inline-flex', color: c.label.secondary })
export const topBarTrailingLabel = style([text.footnote.emphasized, { color: c.label.tertiary }])
export const topBarTrailingSymbol = style({ display: 'inline-flex', color: c.label.tertiary })
export const paneSeparator = style({ marginBottom: '2px' })

export const heading = style([
  text.footnote.emphasized,
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 0,
    margin: 0,
    padding: '2px var(--row-pad-x)',
    color: c.label.tertiary,
    userSelect: 'none',
  },
])

export const headingCaps = style({ textTransform: 'uppercase', letterSpacing: '0.04em' })

export const item = style([rowBox, rowShell])

export const menuCompact = style({
  vars: {
    '--row-pad-y': 'var(--row-pad-compact)',
    '--row-pad-x': 'var(--row-pad-compact)',
    '--row-size': font.scale.control.size,
    '--row-line': font.scale.control.line,
  },
})

export const itemSelected = style({
  backgroundColor: c.state.selected,
  selectors: { '&:hover': { backgroundColor: c.state.selected } },
})

export const itemActive = style({ ...pointed, selectors: { '&:hover': pointed } })

const PICK_EASE = `${duration.fast} ${easing.baseEase}`

/** A run of picked rows draws as one ring, each row squaring the corners and dropping the edges it shares with a picked neighbor. */
const RUN_EDGES = { solo: [1, 1], first: [1, 0], middle: [0, 0], last: [0, 1] } as const

export const itemPicked = styleVariants(RUN_EDGES, ([top, bottom]) => ({
  borderRadius: `${top * ROW_RADIUS}px ${top * ROW_RADIUS}px ${bottom * ROW_RADIUS}px ${bottom * ROW_RADIUS}px`,
  '::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    border: `${ROW_RING}px solid var(--accent-stroke-hot)`,
    borderTopWidth: top * ROW_RING,
    borderBottomWidth: bottom * ROW_RING,
    pointerEvents: 'none',
    transition: `border-color ${PICK_EASE}`,
    '@starting-style': { borderColor: 'transparent' },
  },
}))

export const chipRow = style({ transition: `padding-block ${PICK_EASE}` })

/** A picked chip's ringed edges pad out by the ring's weight, so the ring clears the chip above and below as it does beside it. */
export const chipPicked = styleVariants(RUN_EDGES, ([top, bottom]) => ({
  paddingTop: `calc(var(--row-pad-y) + ${top * ROW_RING}px)`,
  paddingBottom: `calc(var(--row-pad-y) + ${bottom * ROW_RING}px)`,
}))

export const itemEmphasized = style([text.body.emphasized])

export const matchText = style({ fontWeight: font.weight.emphasized })

export const rowDisabled = style({
  selectors: {
    '&&': { opacity: STATE_OPACITY.inactive, pointerEvents: 'none' },
  },
})

export const gutter = style({
  selectors: {
    '&&': {
      position: 'absolute',
      left: 'calc(var(--row-pad-lead) / 2)',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    },
  },
})

export const overlay = style([
  gutter,
  revealTarget,
  { transition: REVEAL_FADE, vars: { '--reveal-fade': duration.base } },
])

export const side = style({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  flex: '0 0 auto',
  color: c.label.secondary,
  selectors: {
    [`${topRow} &:has(> ${topBarTrailingLabel})`]: { flex: '0 1 auto', minWidth: 0 },
  },
})

export const titleWrap = style({
  flex: '1 1 auto',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '2px',
})

export const titleCentered = style({ alignItems: 'center' })

export const titleText = style({ vars: { '--scroll-fade': 'var(--fade-base)' } })

export const titleInput = style([fillInput, { WebkitAppRegion: 'no-drag' } as StyleRule])

export const subLabel = style([text.caption.standard, { color: c.label.secondary }])

export const actionRow = style([
  rowBox,
  {
    vars: { '--row-size': font.scale.footnote.size, '--row-line': font.scale.footnote.line },
    width: '100%',
    border: 'none',
    background: 'none',
    textAlign: 'left',
    fontWeight: font.weight.emphasized,
    color: c.label.secondary,
  },
])

export const separator = style({
  height: '11px',
  display: 'flex',
  alignItems: 'center',
  padding: '0 8px',
})
export const separatorLine = style({
  height: 'var(--width-100)',
  width: '100%',
  background: c.border.base,
})
export const separatorLineGroup = style({ height: 'var(--width-175)' })
export const separatorFlush = style({ padding: 0 })

export const caption = style([
  text.body.standard,
  { padding: '28px 8px', textAlign: 'center', color: c.label.secondary, userSelect: 'none' },
])

export const footing = style([
  rowBox,
  flushAffordance,
  { vars: { '--row-pad-y': '0px', '--row-pad-trail': '0px' } },
])

export const footingCentered = style({ justifyContent: 'center' })

export const footingBar = style({ display: 'flex', flexDirection: 'column' })

export const spacer = style({ flex: '1 1 auto' })

export const footingLabel = style([
  text.footnote.emphasized,
  { selectors: { '&&': { color: c.label.secondary } } },
])
export const footingSymbol = style({ display: 'inline-flex', color: c.label.secondary })
export const footingQuiet = style({ selectors: { '&&&': { color: c.label.tertiary } } })

export const accessoryButton = style({
  width: 'var(--accessory-box, 20px)',
  color: c.label.tertiary,
  selectors: { '&&:disabled': { opacity: STATE_OPACITY.ghost } },
})

export const detail = style([text.footnote.emphasized, { flex: '0 1 auto', minWidth: 0 }])

/* A trailing value reaches no further than the row's mark and the label keeps the rest: past it, a field gives way and clips its text inside its own chrome, as a cell value clips inside its cap. */
globalStyle(`${titleWrap} + ${side}`, { maxWidth: 'var(--row-value-reach)' })
const trailingField = `:is(${field}, ${borderedField})`
globalStyle(`${titleWrap} + ${side} > :has(${trailingField})`, { minWidth: 0 })
globalStyle(`${titleWrap} + ${side} ${trailingField}`, {
  minWidth: 0,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
})
globalStyle(`${side}:has(${detail})`, { flex: '0 1 auto', minWidth: 0, maxWidth: '55%' })
globalStyle(`${footing} ${accessoryButton}`, { color: c.label.secondary })
globalStyle(`${footingBar} ${detail}`, { color: c.label.secondary })

export const menu = style({ display: 'flex', flexDirection: 'column', padding: '6px 0' })

export const MENU_MAX_HEIGHT = 320

export const scrollFrame = style({
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 auto',
  minHeight: 0,
})

export const scrollFrameEdge = style({ flex: '0 0 auto' })

export const scrollFrameBody = style({
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
  scrollbarWidth: 'none',
})
