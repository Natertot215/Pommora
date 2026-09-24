import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '../Theme/color.css'
import { stack } from '../Theme/stack'
import { fieldRing, ROW_RING } from '../Fields/fieldRing'
import { item, menuCompact } from '../Menus/menu-base.css'

const c = colorVars.color

/** KNOB — a picker's height ceiling; below MENU_MAX_HEIGHT because a picker hangs off a control rather than filling a pane. */
export const PICKER_MAX_HEIGHT = 240

export const treePane = style({
  minWidth: 140, // KNOB
  maxWidth: 260, // KNOB
})

export const optionRing = style({
  vars: { '--field-ring': 'var(--accent-stroke-hot)' },
  boxShadow: fieldRing(ROW_RING),
})

const CHOSEN_MARK = { color: 'var(--accent)', flex: 'none' } as const

export const layer = style({ position: 'fixed', zIndex: stack.top.menu })

export const shield = style({ position: 'fixed', inset: 0, zIndex: stack.top.menu })

/** KNOB — the pane's corner radius; a plain rounded rect, no beak, so its gutter is even on all four sides. */
export const PANE_RADIUS = 12

export const pane = style([
  menuCompact,
  {
    position: 'relative',
    zIndex: 0,
    borderRadius: `${PANE_RADIUS}px`,
  },
])

export const surface = style({
  padding: '4px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0px',
})

export const option = style([
  item,
  { justifyContent: 'center', whiteSpace: 'nowrap', border: 'none', background: 'none' },
])

export const optionGlyph = style({ display: 'inline-flex', color: c.label.secondary })

export const optionCheck = style({
  ...CHOSEN_MARK,
  pointerEvents: 'none',
})

export const optionCheckHidden = style({ visibility: 'hidden' })

/** Carries no fill of its own: the mark is the check, and `:has()` reads this to tell a list that has a selection from one that has none. */
export const optionSelected = style({
  selectors: { '&:hover': { background: c.state.hover } },
})

// The mark rides only where a list has something selected, so a menu of plain commands keeps its gutter.
globalStyle(`${option} ${optionCheck}`, { display: 'none' })
globalStyle(`${pane}:has(${optionSelected}) ${optionCheck}`, { display: 'inline-flex' })

const rowBody = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flex: '1 1 auto',
  minWidth: 0,
})
export const leadingRow = style([rowBody, { justifyContent: 'flex-start' }])
export const centeredRow = style([rowBody, { justifyContent: 'center' }])
