import { globalStyle, style, type StyleRule } from '@vanilla-extract/css'
import { vars as colorVars } from '../Tokens/color.css'
import { font, text } from '../Tokens/typography.css'
import { tintAt } from '../Tokens/tint'
import { fieldRing, ROW_RING } from '../Components/Fields/fieldRing'
import { base } from '../Components/Fields/fields.css'

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
    '--row-gap': '8px',
  },
})

// ── Shell ──

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

export const flushAffordance = style({
  vars: { '--row-pad-lead': '0px', '--row-gap': '4px' },
  paddingLeft: 0,
  gap: '4px',
  color: c.label.secondary,
})

export const actionRow = style([text.footnote.emphasized, { color: c.label.secondary }])

// ── TopRow ──

export const topRow = style([
  text.caption.emphasized,
  flushAffordance,
  { vars: { '--row-pad-y': 'var(--top-row-block, 2px)' } },
])

export const topBarLeadingLabel = style([actionRow])
export const topBarLeadingSymbol = style({ display: 'inline-flex', color: c.label.secondary })
export const topBarTrailingLabel = style([actionRow, { color: c.label.tertiary }])
export const topBarTrailingSymbol = style({ display: 'inline-flex', color: c.label.tertiary })
export const paneSeparator = style({ marginBottom: 'var(--top-row-block, 2px)' })

// ── Heading ──

export const heading = style([
  text.headline.emphasized,
  {
    display: 'flex',
    alignItems: 'center',
    gap: '0px',
    minHeight: '24px',
    padding: '0 8px',
    color: c.label.secondary,
    userSelect: 'none',
  },
])

// ── Item ──

export const rowBox = style([
  text.body.standard,
  {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--row-gap)',
    paddingBlock: 'var(--row-pad-y)',
    paddingLeft: 'var(--row-pad-lead, var(--row-pad-x))',
    paddingRight: 'var(--row-pad-trail, var(--row-pad-x))',
    fontSize: 'var(--row-size)',
    lineHeight: 'var(--row-line)',
    color: c.label.primary,
    userSelect: 'none',
  },
])

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

export const titleText = style({})

export const titleInput = style([
  base,
  {
    width: '100%',
    minWidth: 0,
    WebkitAppRegion: 'no-drag',
  } as StyleRule,
])

export const subLabel = style([text.caption.standard, { color: c.label.secondary }])

export const flushTrailing = style({ paddingRight: 0 })

// ── Separator ──

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

// ── Caption ──

export const caption = style([
  text.body.standard,
  { padding: '28px 8px', textAlign: 'center', color: c.label.secondary, userSelect: 'none' },
])

// ── Footing ──

export const bottomRow = style([
  flushAffordance,
  {
    display: 'flex',
    alignItems: 'center',
    paddingRight: 0,
    paddingBlock: 'var(--bottom-row-block, 0px)',
  },
])

export const bottomBar = style({ marginTop: 'auto' })

export const footingLabel = style([actionRow])
export const footerLockAction = style([footingLabel, { gap: '5px' }])
export const lockIcon = style({ selectors: { '&&': { color: c.label.tertiary } } })
export const footingSymbol = style({ display: 'inline-flex', color: c.label.secondary })

// ── Trailing ──

export const accessoryButton = style({
  width: 'var(--accessory-box, 20px)',
  color: c.label.tertiary,
})

export const detail = style([text.footnote.emphasized])

globalStyle(`${bottomRow} ${accessoryButton}`, { color: c.label.secondary })
globalStyle(`${bottomBar} ${detail}`, { color: c.label.secondary })

// ── Column ──

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
