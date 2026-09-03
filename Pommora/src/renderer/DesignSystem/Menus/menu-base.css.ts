import { globalStyle, style, type StyleRule } from '@vanilla-extract/css'
import { vars as colorVars } from '../Tokens/color.css'
import { font, text } from '../Tokens/typography.css'
import { tintAt } from '../Tokens/tint'
import { fieldRing, ROW_RING } from '../Fields/fieldRing'
import { base } from '../Fields/fields.css'

const c = colorVars.color

// KNOB — a row's height is never declared: it is the ramp's line plus one of two padding pairs, so the
// tokens are named for the axis they pad and a surface picks Standard or Compact once for every row.
globalStyle(':root', {
  vars: {
    '--row-height-standard': '6px',
    '--row-height-compact': '4px',
    '--row-width-standard': '6px',
    '--row-width-compact': '4px',
    '--row-pad-y': 'var(--row-height-standard)',
    '--row-pad-x': 'var(--row-width-standard)',
    '--row-size': font.scale.body.size,
    '--row-line': font.scale.body.line,
  },
})

export const rowShell = style({
  borderRadius: '8px',
  cursor: 'default',
  selectors: {
    '&:hover': { background: c.state.hover },
    '&:focus-visible': {
      outline: 'none',
      boxShadow: fieldRing(ROW_RING),
      vars: { '--field-ring': tintAt('var(--accent)', 'secondary') },
    },
  },
})

export const rowBox = style([
  text.body.standard,
  {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingBlock: 'var(--row-pad-y)',
    paddingLeft: 'var(--row-pad-lead, var(--row-pad-x))',
    paddingRight: 'var(--row-pad-trail, var(--row-pad-x))',
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
    '--row-pad-y': 'var(--row-height-compact)',
    '--row-pad-x': 'var(--row-width-compact)',
    '--row-size': font.scale.control.size,
    '--row-line': font.scale.control.line,
  },
})

export const itemSelected = style({
  background: c.state.selected,
  selectors: { '&:hover': { background: c.state.selected } },
})

export const itemEmphasized = style([text.body.emphasized])

export const rowDisabled = style({
  selectors: {
    '&&': { opacity: 'var(--state-inactive)', pointerEvents: 'none' },
  },
})

export const rowDragging = style({ opacity: 'var(--state-ghost)' })

export const overlay = style({
  opacity: 0,
  transition: 'opacity var(--duration-base) var(--ease-base)',
  selectors: {
    '&&': {
      position: 'absolute',
      left: 'calc(var(--row-pad-lead) / 2)',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    },
    [`${item}:hover &`]: { opacity: 1 },
  },
})

export const side = style({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  flex: '0 0 auto',
  color: 'var(--label-secondary)',
})

export const titleWrap = style({
  flex: '1 1 auto',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '2px',
})

export const titleText = style({ vars: { '--over-scroll-fade': 'var(--fade-base)' } })

export const titleInput = style([
  base,
  {
    width: '100%',
    minWidth: 0,
    WebkitAppRegion: 'no-drag',
  } as StyleRule,
])

export const subLabel = style([text.caption.standard, { color: c.label.secondary }])

/** A caption whose parts stand apart on the segment bar — a date beside its clock. */
export const subLabelSegments = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
})
export const subLabelSegment = style({ alignSelf: 'stretch' })

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

export const footingBar = style({ display: 'flex', flexDirection: 'column' })

export const footingLabel = style([text.footnote.emphasized, { color: c.label.secondary }])
export const footerLockAction = style([footingLabel, { gap: '5px' }])
export const lockIcon = style({ selectors: { '&&': { color: c.label.tertiary } } })
export const footingSymbol = style({ display: 'inline-flex', color: c.label.secondary })

export const accessoryButton = style({
  width: 'var(--accessory-box, 20px)',
  color: c.label.tertiary,
  selectors: { '&&:disabled': { opacity: 'var(--state-ghost)' } },
})

export const value = style([text.control.standard, { color: c.label.control }])

export const detail = style([
  text.footnote.emphasized,
  { flex: '0 1 auto', minWidth: 0, vars: { '--over-scroll-fade': 'var(--fade-base)' } },
])

globalStyle(`${side}:has(${detail})`, { flex: '0 1 auto', minWidth: 0, maxWidth: '55%' })
globalStyle(`${footing} ${accessoryButton}`, { color: c.label.secondary })
globalStyle(`${footingBar} ${detail}`, { color: c.label.secondary })
globalStyle(`${footingBar} ${value}`, {
  fontSize: font.scale.footnote.size,
  lineHeight: font.scale.footnote.line,
  color: c.label.secondary,
})

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
})
