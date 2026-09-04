import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { stack } from '@renderer/DesignSystem/Tokens/stack'
import { menuAnchor } from '@renderer/DesignSystem/Menus/menu-anchor'
import { FIELD_RING_VAR, fieldRing, ROW_RING } from '@renderer/DesignSystem/Fields/fieldRing'
import { item, menuCompact } from '@renderer/DesignSystem/Menus/menu-base.css'
import { duration, easing } from '@renderer/Animation/motion'

const c = colorVars.color

/** KNOB — a picker's height ceiling: the list grows to this, then its body scrolls. Lower than the
 *  menu's own MENU_MAX_HEIGHT because a picker hangs off a control rather than filling a pane. Lives
 *  here so the design system owns it; the block drill menus consume it from here. */
export const PICKER_MAX_HEIGHT = 240

export const treePane = style({
  minWidth: 140, // KNOB
  maxWidth: 260, // KNOB
})

const OPTION_RING = `${ROW_RING}px`

export const optionRing = style({
  vars: { '--field-ring': 'var(--accent-stroke-hot)' },
  boxShadow: fieldRing(ROW_RING),
})

const SIDES = {
  left: `inset ${OPTION_RING} 0 0 0 ${FIELD_RING_VAR}`,
  right: `inset -${OPTION_RING} 0 0 0 ${FIELD_RING_VAR}`,
  top: `inset 0 ${OPTION_RING} 0 0 ${FIELD_RING_VAR}`,
  bottom: `inset 0 -${OPTION_RING} 0 0 ${FIELD_RING_VAR}`,
}
const COLLAPSED = '[data-reveal]:not([data-open])'
const ABOVE = [`+ ${optionRing}`, `+ ${COLLAPSED} + ${optionRing}`]
const BELOW = [`${optionRing} +`, `${optionRing} + ${COLLAPSED} +`]
const SQUARE_TOP = { borderTopLeftRadius: 0, borderTopRightRadius: 0 }
const SQUARE_BOTTOM = { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }

globalStyle(ABOVE.map((a) => `${optionRing}:has(${a})`).join(', '), {
  boxShadow: [SIDES.left, SIDES.right, SIDES.top].join(', '),
  ...SQUARE_BOTTOM,
})
globalStyle(BELOW.map((b) => `${b} ${optionRing}`).join(', '), {
  boxShadow: [SIDES.left, SIDES.right, SIDES.bottom].join(', '),
  ...SQUARE_TOP,
})
globalStyle(BELOW.flatMap((b) => ABOVE.map((a) => `${b} ${optionRing}:has(${a})`)).join(', '), {
  boxShadow: [SIDES.left, SIDES.right].join(', '),
  ...SQUARE_TOP,
  ...SQUARE_BOTTOM,
})

export const anchor = style(menuAnchor('center', stack.local.overlay))
export const anchorUp = style(menuAnchor('up', stack.local.overlay))

const CHOSEN_MARK = { color: 'var(--accent)', flex: 'none' } as const

export const layer = style({ position: 'fixed', zIndex: stack.top.menu })

export const backdrop = style({ position: 'fixed', inset: 0, zIndex: stack.top.menuBackdrop })

/** KNOB — the pane's corner radius. `MenuSurface` is the one shell that still wears a beak; this one
 *  is a plain rounded rect, so its gutter is even on all four sides and needs no directional twin. */
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

export const paneMorph = style({ overflow: 'hidden' })
export const paneMorphArmed = style({
  transition: `height ${duration.base} ${easing.baseEase}`,
})
export const paneMorphBody = style({ display: 'flex', flexDirection: 'column' })

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

export const optionSelected = style({
  background: c.state.selected,
  selectors: { '&:hover': { background: c.state.selected } },
})

globalStyle(`${option} ${optionCheck}`, { display: 'none' })
globalStyle(`:root.picker-checked ${pane}:has(${optionSelected}) ${optionCheck}`, {
  display: 'inline-flex',
})
// The repeated class outranks the run-unification rules above, which compound `:has()` and a sibling
// combinator and would otherwise keep painting a ring the mode has stood down.
globalStyle(`:root.picker-checked ${optionSelected}${optionSelected}`, {
  background: 'transparent',
})
globalStyle(`:root.picker-checked ${optionSelected}${optionSelected}:hover`, {
  background: c.state.hover,
})
globalStyle(`:root.picker-checked ${optionRing}${optionRing}${optionRing}`, { boxShadow: 'none' })

const rowBody = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flex: '1 1 auto',
  minWidth: 0,
})
export const leadingRow = style([rowBody, { justifyContent: 'flex-start' }])
export const centeredRow = style([rowBody, { justifyContent: 'center' }])
