import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '../../tokens/color.css'
import { text } from '../../tokens/typography.css'
import { TINT_STEPS, tintAt } from '../../tokens/tint'
import { fieldRing } from '../fieldRing'

const c = colorVars.color

/** KNOB — a picker's height ceiling: the list grows to this, then its body scrolls. Lower than the
 *  menu's own MENU_MAX_HEIGHT because a picker hangs off a control rather than filling a pane. Lives
 *  here so the design system owns it; the block drill menus consume it from here. */
export const PICKER_MAX_HEIGHT = 240

/** KNOB — a DISCLOSURE picker's fixed width. A tree picker must not resize horizontally: revealing a
 *  longer child row would otherwise widen the pane, and against a viewport edge that drags every row
 *  sideways mid-click. Fixed here, eclipsed there. */
export const PICKER_TREE_WIDTH = 210

/** KNOB — the selected-row ring's thickness, in px so the run-merge can build its directional
 *  sides from the same number the full ring uses. */
const RING_PX = 2
const OPTION_RING = `${RING_PX}px`

/** The selected-row RING — the tile-selection tone, for lists whose rows carry no colour of their
 *  own (Sets, operators). A chip already signals selection with its fill, so it never gets this:
 *  two signals on one row read as two different states. Painted through the house `--field-ring`
 *  channel, and INSET, so it rides inside the row's radius and never reflows the list. */
export const optionRing = style({
  vars: { '--field-ring': tintAt('var(--accent)', TINT_STEPS.primary) },
  boxShadow: fieldRing(RING_PX),
})

// ── Vertical unification: a RUN of adjacent selected rows reads as ONE outlined region, the way a
// multi-line blockquote extends its rule rather than restating it per line. Two stacked rings would
// otherwise draw a double edge between them and read as two separate things.
// This is default behaviour of the ring itself, not something a consumer opts into: any list whose
// selected rows are siblings gets it for free. A COLLAPSED Reveal between two rows is transparent to
// the run — it is a zero-height spacer, not a separator (hence the `data-reveal` hop).
const RING = 'var(--field-ring, transparent)'
const SIDES = {
  left: `inset ${OPTION_RING} 0 0 0 ${RING}`,
  right: `inset -${OPTION_RING} 0 0 0 ${RING}`,
  top: `inset 0 ${OPTION_RING} 0 0 ${RING}`,
  bottom: `inset 0 -${OPTION_RING} 0 0 ${RING}`,
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
// Interior — both neighbours selected, so only the run's flanks survive. More compound than either
// rule above, so it wins on specificity where a row matches both.
globalStyle(BELOW.flatMap((b) => ABOVE.map((a) => `${b} ${optionRing}:has(${a})`)).join(', '), {
  boxShadow: [SIDES.left, SIDES.right].join(', '),
  ...SQUARE_TOP,
  ...SQUARE_BOTTOM,
})

export const anchor = style({
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 20,
})
/** Upward-opening variant — the pane hangs ABOVE its trigger (beak-down NotchedPane). */
export const anchorUp = style({
  position: 'absolute',
  bottom: 'calc(100% + 6px)',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 20,
})
/** The self-managed top layer — a fixed body-portal position (set inline from the measured trigger)
 *  so the pane escapes any clipping ancestor (the settings dropdown's frost clip). */
export const layer = style({ position: 'fixed', zIndex: 1100 })

/** A transparent full-viewport catcher one layer BELOW the pane: any outside pointerdown (including
 *  on the trigger itself) lands here and dismisses, so the trigger's own click can't reopen. */
export const backdrop = style({ position: 'fixed', inset: 0, zIndex: 1099 })

// GlassPane's rect border/shadow are suppressed by NotchedPane (can't trace the beak); the top
// gutter clears the beak band via the shell's published --notch-h.
export const surface = style({
  position: 'relative',
  zIndex: 0,
  padding: '0 6px 6px',
  paddingTop: 'calc(var(--notch-h, 0px) + 6px)',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
})
/** Beak-down twin: the notch band moves to the bottom gutter. Composed after `surface` so its
 *  padding wins. */
export const surfaceUp = style({
  paddingTop: '6px',
  paddingBottom: 'calc(var(--notch-h, 0px) + 6px)',
})

// The portal escapes any label-tone context, so the option must set its OWN type + colour (else it
// falls to the UA default — black, unsized — and the pane wraps). Matches a dropdown row title: the
// control scale at the control tone.
export const option = style([
  text.control.standard,
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    padding: '3px 4px',
    border: 'none',
    background: 'none',
    borderRadius: '8px',
    color: c.label.control,
    cursor: 'default',
    selectors: { '&:hover': { background: c.state.hover } },
  },
])

export const optionSelected = style({
  background: c.state.selected,
  selectors: { '&:hover': { background: c.state.selected } },
})
