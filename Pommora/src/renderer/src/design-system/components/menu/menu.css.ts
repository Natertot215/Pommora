import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '../../tokens/color.css'
import { DISCLOSURE_INDENT } from '../../tokens/size.css'
import { text, truncateHoverScroll } from '../../tokens/typography.css'
import { duration, easing } from '../../tokens/motion'
import { TINT_STEPS, tintAt } from '../../tokens/tint'
import { fieldRing, ROW_RING } from '../fieldRing'

const c = colorVars.color

/**
 * Menu Item row — the menu / sidebar row primitive. Composes Body/Standard so
 * the title matches the macOS standard content size (NSFont.systemFontSize).
 */
// The row's own metrics. Named because the disclosure rail is placed FROM them — a rail column stated
// independently drifts the moment a row's padding or gap moves.
const ROW_PAD_X = 6
const ROW_GAP = 8
const TWISTY_W = 12

/** The column a row's title starts at when its leading slot holds only the twisty. A disclosed run on
 *  an icon-less surface hangs from here, so the children sit under their parent's text rather than
 *  under its glyph. A surface whose rows carry an icon starts its title further right and sets its
 *  own `--menu-rail-x` accordingly. */
export const TITLE_X_TWISTY_ONLY = ROW_PAD_X + TWISTY_W + ROW_GAP

export const item = style([
  text.body.standard,
  {
    display: 'flex',
    alignItems: 'center',
    gap: `${ROW_GAP}px`,
    minHeight: '24px',
    padding: `6px ${ROW_PAD_X}px`,
    borderRadius: '8px',
    color: c.label.primary,
    cursor: 'default',
    userSelect: 'none',
    selectors: {
      '&:hover': { background: c.state.hover },
      // Keyboard focus only. `:focus-visible` never matches the programmatic focus that follows a
      // click, so a mouse-opened menu looks untouched and a keyboard-opened one shows where it is.
      // The tone is the FIELD's focus tone through the same channel — a step lighter than the
      // selection ring's, so a focused row and a chosen one stay tellable apart at the same weight.
      '&:focus-visible': {
        outline: 'none',
        boxShadow: fieldRing(ROW_RING),
        vars: { '--field-ring': tintAt('var(--accent)', TINT_STEPS.secondary) },
      },
    },
  },
])

/** THE disclosure chevron — a chevron-right glyph that rotates 90° when open, on the shared
 *  disclosure beat. One definition shared by every disclosing surface. Pair it with `data-twisty` on
 *  the element: a plain stylesheet can't name a hashed class, so a surface keys its own `:has()`
 *  layout rules (e.g. the sidebar's Hide-Chevrons) off that attribute instead — the LOOK lives here,
 *  each surface keeps its own layout. */
export const twisty = style({
  // The beat is a CHANNEL, not a constant: a chevron has to land with whatever it discloses, and not
  // every surface unfolds on the disclosure beat. The Properties pane's All-Properties row runs its
  // Reveal and its elastic spacer on `base`, so its chevron must too — it sets `--twisty-beat`.
  transition: 'transform var(--twisty-beat, var(--disclosure)) var(--ease-standard)',
  flex: '0 0 auto',
})
export const twistyOpen = style({ transform: 'rotate(90deg)' })

/** A leaf row's stand-in for the chevron, so its icon lines up under a disclosure row's. */
export const twistySpacer = style({ width: `${TWISTY_W}px`, flex: '0 0 auto' })

// The children's clearance past the rail — the gap between the line and what it encloses.
const RAIL_CLEARANCE = 6

/** KNOB — the rail's x, and with it the indent of everything it encloses. Default: one clearance left
 *  of the shared disclosure step, so an unset surface indents by that step and the rail reads as a
 *  gutter beside rows whose icon fills the space to its right. A surface sets `--menu-rail-x` to move it —
 *  to its own title column, so a group hangs from its parent's text — and the disclosed run follows,
 *  because a rail the children don't clear would draw straight through their glyphs. */
const RAIL_X = `var(--menu-rail-x, ${DISCLOSURE_INDENT - RAIL_CLEARANCE}px)`

/** A disclosed child run — rides the shared list-outline rail with rounded caps, children indenting
 *  past it. Lives here, not in a pane: the rail is what "these rows belong to the one above" looks
 *  like, and every disclosing surface needs it. */
export const railRow = style({
  position: 'relative',
  paddingLeft: `calc(${RAIL_X} + ${RAIL_CLEARANCE}px)`,
  '::before': {
    content: '""',
    position: 'absolute',
    top: 'var(--list-outline-gap)',
    bottom: 'var(--list-outline-gap)',
    left: `calc(${RAIL_X} - var(--list-outline-width) / 2)`,
    width: 'var(--list-outline-width)',
    borderRadius: 'var(--list-outline-radius)',
    background: 'var(--list-outline-color)',
  },
})

/** Selected pill — holds under :hover so a selected row doesn't lighten further. */
export const itemSelected = style({
  background: c.state.selected,
  selectors: { '&:hover': { background: c.state.selected } },
})

/** Row variant: the title carries weight. For rows that ARE structure rather than choices — an
 *  outline's headings — so the hierarchy reads without a second glyph or colour doing the work.
 *  KNOB: step to `text.body.semibold`/`.bold` for a heavier outline. */
export const itemEmphasized = style([text.body.emphasized])

/** A structurally-present but inert row or affordance — dimmed and unhittable. The one treatment
 *  every "shown, can't act" state wears (a lock's frozen rows, an unlanded affordance). */
export const rowDisabled = style({
  selectors: {
    '&&': { opacity: 'var(--state-inactive)', pointerEvents: 'none' },
  },
})

/** Heading row — same geometry as an item, so its icon follows the row's own size. */
export const heading = style([
  text.headline.emphasized,
  {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    minHeight: '24px',
    padding: '0 8px',
    color: c.label.secondary,
    userSelect: 'none',
  },
])

/** A leading / trailing glyph cluster — doesn't grow, its own gap so a disclosure + icon (or detail +
 *  chevron) keep the row rhythm. Bound to the stable CSS var, not the vanilla-extract ref, so an HMR
 *  token-hash shift can't blank it. */
export const side = style({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  flex: '0 0 auto',
  color: 'var(--label-secondary)',
})

/** The flexible spine — pins leading left, trailing right; stacks title + sub-label. */
export const titleWrap = style({
  flex: '1 1 auto',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '2px',
})

/** Title line — inherits the row's size + colour; ellipsis at rest, scrolls the full value on hover
 *  (shared `truncateHoverScroll`, the chip-label behaviour). */
export const titleText = style([truncateHoverScroll])

/** Inline-rename field for a menu row — sits flush in the title slot: the row's own font, colour, and
 *  metrics with no border/padding/background of its own, so swapping it in for the title text is
 *  dimensionally identical (no row nudge). The caret alone marks edit mode. */
export const titleInput = style({
  width: '100%',
  minWidth: 0,
  font: 'inherit',
  color: 'inherit',
  background: 'transparent',
  border: 'none',
  padding: 0,
  margin: 0,
  outline: 'none',
  WebkitAppRegion: 'no-drag',
} as Parameters<typeof style>[0])

/** Sub-label — under the title. */
export const subLabel = style([
  text.caption.standard,
  { color: c.label.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
])

/** Trailing detail — colour inherited from `side`. */
export const detail = style([text.footnote.emphasized])

/** Separator — a band with a centered hairline (Apple's menu separator height). */
export const separator = style({
  height: '11px',
  display: 'flex',
  alignItems: 'center',
  padding: '0 8px',
})
export const separatorLine = style({ height: '1px', width: '100%', background: c.separator.border })

/** Flush variant — no side inset, so the hairline spans the surface gutter edge-to-edge. */
export const separatorFlush = style({ padding: 0 })

/** Gutter-flush affordance — the shared geometry/colour for the TopRow heading nav and the pane
 *  footer actions: no item inset (so the ‹ heading and the +/Delete footer line up at one left edge),
 *  a tight icon↔label gap, and its own text tone. Each consumer sets its own type; the
 *  destructive footer (Delete) re-overrides the colour. */
export const flushAffordance = style({ paddingLeft: 0, gap: '4px', color: c.label.secondary })

/** Flush-trailing row — the trailing cluster (chevron, detail) sits against the gutter edge where
 *  the flush divider ends, instead of floating in on the row's right padding. */
export const flushTrailing = style({ paddingRight: 0 })

/** TopRow — a pane's top navigation row (‹ back chevron + label, optional trailing action). Flush
 *  affordance + caption type; vertical padding inherits the base row's; surfaces tune it via their own
 *  class (the ViewPane's topRowPad knob). */
export const topRow = style([text.caption.emphasized, flushAffordance])

/** Non-interactive caption / empty-state line — centered, no row geometry. */
export const caption = style([
  text.body.standard,
  { padding: '28px 8px', textAlign: 'center', color: c.label.secondary, userSelect: 'none' },
])

/** Menu container — a flush vertical stack with top/bottom breathing room. */
export const menu = style({ display: 'flex', flexDirection: 'column', padding: '6px 0' })

// ── Shared dropdown row defaults + the AccessoryButton primitive ──
// The dropdown surfaces (SettingsPane · ViewPane · ViewSettings) route their coloring, spacing, and
// icon-button recipe here. `item` also serves the sidebar, so a control tone can't ride the base
// row: a dropdown-only treatment belongs on its own class, never on `item`.

/** The one icon-button recipe behind every TopRow/BottomRow/row affordance (ellipsis · plus · eye ·
 *  palette). Box via `--accessory-box` (consumers pass their own). The `&&` pins the
 *  action tone above `.app-toolbar button`'s control-tone rule (0,1,1). */
export const accessoryButton = style({
  width: 'var(--accessory-box, 16px)',
  height: 'var(--accessory-box, 16px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  background: 'none',
  padding: 0,
  cursor: 'default',
  borderRadius: '5px',
  transition: `background ${duration.fast} ${easing.standard}`,
  selectors: {
    '&&': { color: c.label.tertiary },
    '&:hover': { background: c.state.hover },
  },
})
/** Rest-ghosted variant (the eye toggle) — dimmed at rest, full on hover. */
export const accessoryGhostRest = style({
  opacity: 'var(--state-ghost)',
  transition: `opacity ${duration.fast} ${easing.standard}, background ${duration.fast} ${easing.standard}`,
  selectors: { '&:hover': { opacity: 1 } },
})
// ── TopRow / BottomRow rhythm ──

/** A pane TopRow's vertical padding + heading tone — drops the base row-height floor to the caption line. */
export const topRowPad = style({
  paddingBlock: 'var(--top-row-block, 2px)',
  minHeight: 0,
  color: c.label.secondary,
})

// ── TopBar tone knobs — every pane header's four parts, one source. Leading (the ‹ back nav) reads
// brighter than trailing (the current pane), so the back destination sits a step above the breadcrumb.
// Each knob colours the text/glyph itself, so it beats the surface's dropdown-title rule. All surfaces
// route here via MenuTopRow / MenuPaneTopRow.
export const topBarLeadingLabel = style([text.callout.emphasized, { color: c.label.secondary }])
export const topBarLeadingSymbol = style({ display: 'inline-flex', color: c.label.secondary })
export const topBarTrailingLabel = style([text.caption.emphasized, { color: c.label.tertiary }])
export const topBarTrailingSymbol = style({ display: 'inline-flex', color: c.label.tertiary })
/** The gap below the header separator — tied to the same `--top-row-block` rhythm knob. */
export const paneSeparator = style({ marginBottom: 'var(--top-row-block, 2px)' })
/** A pane footer bar — flush affordance geometry, leading pinned left / trailing pinned right. The
 *  top-and-bottom breathing room around the footer row rides `--bottom-row-block` (0 = current tight
 *  footer); a consumer sets it on the pane to loosen the +/… bar off the surface edge. */
export const bottomRow = style([
  flushAffordance,
  {
    display: 'flex',
    alignItems: 'center',
    paddingRight: 0,
    paddingBlock: 'var(--bottom-row-block, 0px)',
  },
])

/** The bottom bar's explicit placement: it sinks to the pane's bottom edge in a flex-column pane,
 *  so a footing never relies on a caller routing it to a footer slot. Inert in a block/footer-slot
 *  context (margin-top:auto is a no-op there), so panes already pinning it via a frame are unchanged. */
export const bottomBar = style({ marginTop: 'auto' })

// ── Footing tone knobs — the pinned footer's parts (the cards Style row, the +/⋮ BottomRow). A footing
// reads a step quieter than a body row, an ancillary action; its symbol sits a step under the TopBar
// chevron. One source; the Style row + MenuBottomRow route here.
export const footingLabel = style([text.callout.emphasized, { color: c.label.secondary }])
/** A pinned-footer text action — footing tone over the accessory hover pill. */
export const footerAction = style([
  footingLabel,
  {
    border: 'none',
    background: 'none',
    padding: '2px 4px',
    borderRadius: '5px',
    cursor: 'default',
    selectors: { '&:hover': { background: c.state.hover } },
  },
])
/** The footing lock action — a left-pinned labeled toggle (lock icon + label), a step-quieter
 *  icon than its label. No pressed/selected state — it never mutes on lock. */
export const footerLockAction = style([
  footerAction,
  { display: 'inline-flex', alignItems: 'center', gap: '5px' },
])
export const lockIcon = style({ selectors: { '&&': { color: c.label.tertiary } } })
export const footingSymbol = style({
  display: 'inline-flex',
  selectors: { '&&&': { color: c.label.secondary } },
})
// A BottomRow's icon buttons read the footing tone, not the accessoryButton default — the tripled
// class outranks accessoryButton's `&&`.
globalStyle(`${bottomRow} ${accessoryButton}${accessoryButton}`, { color: c.label.secondary })
// A footing's value reads the footing tone too — the row's own default color yields inside the
// bottom bar, so a footing's label + value + symbol all sit at one tier.
globalStyle(`${bottomBar} ${detail}`, { color: c.label.secondary })

// ── Scroll frame — the shared pinned-header/footer + scrolling-body primitive (MenuScrollFrame) ──
// A pane's optional header and footer stay put (flush against the surface, never scrolling) while the
// rows scroll BETWEEN them: the body is the only overflow region, so nothing ever slides under an edge
// (no bleed-through, no occlusion tricks). The frame caps at MENU_MAX_HEIGHT unless its caller states
// a height of its own.

/** MenuScrollFrame's default height ceiling — a pane grows to this, then scrolls. A pane wanting a
 *  different one passes `maxHeight`, and several do: a picker sits shorter than a menu, ViewSettings
 *  taller. This is the default those panes decline, not a ceiling they are breaking. */
export const MENU_MAX_HEIGHT = 320

/** The frame — a flex column that fills its slot; the body inside scrolls. The height ceiling rides an
 *  inline `max-height` (the MenuScrollFrame `maxHeight` prop), so a pane sets its own. */
export const scrollFrame = style({
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 auto',
  minHeight: 0,
})

/** A pinned edge (header or footer) — never grows, never scrolls, holds its place. */
export const scrollFrameEdge = style({ flex: '0 0 auto' })

/** The scrolling body — the sole overflow region; rows scroll here, clear of the pinned edges. A
 *  vertical flex column so a `flex:1 1 auto` child (the Properties pane's drag box) fills the floor,
 *  giving its elastic All-Properties spacer the slack to bottom-pin. */
export const scrollFrameBody = style({
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
})
