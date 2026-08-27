import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '../../../Tokens/color.css'
import { font, text } from '../../../Tokens/typography.css'
import { stack } from '../../../Tokens/stack'
import { menuAnchor } from '../../../Menus/menu-anchor'
import { FIELD_RING_VAR, fieldRing, ROW_RING } from '../../Fields/fieldRing'
import { rowShell, ROW_LINE, ROW_SIZE } from '../../../Menus/menu-base.css'

const c = colorVars.color

/** KNOB — a picker's height ceiling: the list grows to this, then its body scrolls. Lower than the
 *  menu's own MENU_MAX_HEIGHT because a picker hangs off a control rather than filling a pane. Lives
 *  here so the design system owns it; the block drill menus consume it from here. */
export const PICKER_MAX_HEIGHT = 240

/** A DISCLOSURE picker's frame — sized by its VISIBLE rows (closed subtrees unmount, so a folded
 *  long title can't hold the pane wide), floored so a sparse tree still reads as a pane, capped so
 *  a deep title truncates instead of running the screen. An edge-anchored open keeps the growth on
 *  one side when a disclosure reveals a longer row. */
export const treePane = style({
  minWidth: 140, // KNOB
  maxWidth: 260, // KNOB
})

// Selection paints at the shared row weight; only the TONE separates it from keyboard focus.
const OPTION_RING = `${ROW_RING}px`

/** The selected-row RING — the tile-selection tone, for lists whose rows carry no color of their
 *  own (Sets, operators). A chip already signals selection with its fill, so it never gets this:
 *  two signals on one row read as two different states. Painted through the house `--field-ring`
 *  channel, and INSET, so it rides inside the row's radius and never reflows the list. */
export const optionRing = style({
  vars: { '--field-ring': 'var(--accent-stroke-hot)' },
  boxShadow: fieldRing(ROW_RING),
})

// ── Vertical unification: a RUN of adjacent selected rows reads as ONE outlined region, the way a
// multi-line blockquote extends its rule rather than restating it per line. Two stacked rings would
// otherwise draw a double edge between them and read as two separate things.
// This is default behavior of the ring itself, not something a consumer opts into: any list whose
// selected rows are siblings gets it for free. A COLLAPSED Reveal between two rows is transparent to
// the run — it is a zero-height spacer, not a separator (hence the `data-reveal` hop).
const SIDES = {
  left: `inset ${OPTION_RING} 0 0 0 ${FIELD_RING_VAR}`,
  right: `inset -${OPTION_RING} 0 0 0 ${FIELD_RING_VAR}`,
  top: `inset 0 ${OPTION_RING} 0 0 ${FIELD_RING_VAR}`,
  bottom: `inset 0 -${OPTION_RING} 0 0 ${FIELD_RING_VAR}`,
}
const COLLAPSED = '[data-reveal]:not([data-open])'
/** "…is directly above another selected row", with or without a collapsed disclosure between. */
const ABOVE = [`+ ${optionRing}`, `+ ${COLLAPSED} + ${optionRing}`]
/** "…is directly below another selected row". */
const BELOW = [`${optionRing} +`, `${optionRing} + ${COLLAPSED} +`]
const SQUARE_TOP = { borderTopLeftRadius: 0, borderTopRightRadius: 0 }
const SQUARE_BOTTOM = { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }

// Head of a run — keep the top cap, drop the shared bottom edge.
globalStyle(ABOVE.map((a) => `${optionRing}:has(${a})`).join(', '), {
  boxShadow: [SIDES.left, SIDES.right, SIDES.top].join(', '),
  ...SQUARE_BOTTOM,
})
// Tail of a run — keep the bottom cap, drop the shared top edge.
globalStyle(BELOW.map((b) => `${b} ${optionRing}`).join(', '), {
  boxShadow: [SIDES.left, SIDES.right, SIDES.bottom].join(', '),
  ...SQUARE_TOP,
})
// Interior — both neighbors selected, so only the run's flanks survive. More compound than either
// rule above, so it wins on specificity where a row matches both.
globalStyle(BELOW.flatMap((b) => ABOVE.map((a) => `${b} ${optionRing}:has(${a})`)).join(', '), {
  boxShadow: [SIDES.left, SIDES.right].join(', '),
  ...SQUARE_TOP,
  ...SQUARE_BOTTOM,
})

export const anchor = style(menuAnchor('center', stack.local.overlay))
/** Upward-opening variant — the pane hangs ABOVE its trigger. */
export const anchorUp = style(menuAnchor('up', stack.local.overlay))

/** THE chosen-row mark, for every menu that marks one — a row wearing a different mark from the row
 *  beside it is a bug, not a variant. It carries the accent whole rather than at a tint step: the
 *  tints exist to keep a FILL off the label underneath, and a glyph has no label to protect. It also
 *  has to override the trailing slot's secondary tone, which is the tone for detail, not for state.
 *  Spread rather than composed: `optionCheck` builds on it and is also a `globalStyle` target, which
 *  a composed class cannot be. */
const CHOSEN_MARK = { color: 'var(--accent)', flex: 'none' } as const

/** The self-managed top layer — a fixed body-portal position (set inline from the measured trigger)
 *  so the pane escapes any clipping ancestor (the settings menu's frost clip). */
export const layer = style({ position: 'fixed', zIndex: stack.top.menu })

/** A transparent full-viewport catcher one layer BELOW the pane: any outside pointerdown (including
 *  on the trigger itself) lands here and dismisses, so the trigger's own click can't reopen. */
export const backdrop = style({ position: 'fixed', inset: 0, zIndex: stack.top.menuBackdrop })

/** KNOB — the pane's corner radius. `MenuSurface` is the one shell that still wears a beak; this one
 *  is a plain rounded rect, so its gutter is even on all four sides and needs no directional twin. */
export const PANE_RADIUS = 12

/** The shape itself, worn by every pane including the bare ones — it rounds the frost, the
 *  material's own border, and the scrolled body in a single declaration. */
export const pane = style({
  position: 'relative',
  zIndex: 0,
  borderRadius: `${PANE_RADIUS}px`,
  // A picker's rows are a control's options, not a menu's commands, so the whole family reads the
  // control RAMP rather than the menu's body default. The tone stays the menu's: a row is still a
  // row, and only its size marks it as belonging to a control. Set once on the pane — every row
  // inside, the shared MenuItem included, inherits it, so no row states a ramp of its own.
  vars: {
    '--menu-row-size': font.scale.control.size,
    '--menu-row-line': font.scale.control.line,
  },
})

/** The default gutter, for a pane that doesn't bring its own. */
export const surface = style({
  padding: '4px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0px',
})

// The portal escapes any label-tone context, so the option must set its OWN type + color (else it
// falls to the UA default — black, unsized — and the pane wraps). Matches a menu row title: the
// control scale at the control tone.
export const option = style([
  text.control.standard,
  rowShell,
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    padding: '4px',
    border: 'none',
    background: 'none',
    color: c.label.primary,
    fontSize: ROW_SIZE,
    lineHeight: ROW_LINE,
  },
])

/** A row's leading glyph — a step under its label, the menu row's leading-slot tone. An assigned
 *  color (a Context's, a Status group's) is an inline style and still wins. */
export const optionGlyph = style({ display: 'inline-flex', color: c.label.secondary })

/** The chosen mark, laid out at the row's trailing edge. It is the row's own width that grows to
 *  hold it, never a track carved out of the body — so a label sits where it sat before the mark
 *  existed, and the pane widens to the right to make room. */
export const optionCheck = style({
  ...CHOSEN_MARK,
  marginLeft: '6px',
  pointerEvents: 'none',
})

/** Laid out on every row and painted only on the chosen one. The pane measures the mark once and
 *  grows by it; hiding rather than dropping the unchosen slot is what stops that width from moving
 *  as the selection travels between labels of unequal length. */
export const optionCheckHidden = style({ visibility: 'hidden' })

export const optionSelected = style({
  background: c.state.selected,
  selectors: { '&:hover': { background: c.state.selected } },
})

// `checked` mode states the choice with the mark alone — the fill and the ring stand down, so a row
// never carries two signals for one state. Outlined mode states it by fill alone, so the mark leaves
// the layout outright and the pane measures as though it had never been there.
globalStyle(`${option} ${optionCheck}`, { display: 'none' })
// The slot appears only in a pane that actually holds a mark. A picker whose value is unset — a
// filter's draft row, a list nothing has been chosen from — reserves nothing and sizes as though the
// mark did not exist; once one row wears it, every row holds its width so the labels stay put as the
// choice travels.
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

/** The box a row's content sits in, whichever way it reads. Which of the two a row takes is
 *  `PickerOption`'s to resolve from its `leading` slot and its `align`, not a caller's to name. */
const rowBody = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  // The body takes the row's width and yields the mark's back to it. The mark therefore grows the
  // pane to the RIGHT and takes nothing from the body's own box, so content sits where it sat before
  // the mark existed instead of sliding left by half of it.
  flex: '1 1 auto',
  minWidth: 0,
})
export const leadingRow = style([rowBody, { justifyContent: 'flex-start' }])
export const centeredRow = style([rowBody, { justifyContent: 'center' }])
