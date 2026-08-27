import { globalStyle, style, type StyleRule } from '@vanilla-extract/css'
import { vars as colorVars } from '../Tokens/color.css'
import { ROW_PAD_X } from '../Elements/DropOutline/dropOutline.css'
import { font, text } from '../Tokens/typography.css'
import { tintAt } from '../Tokens/tint'
import { fieldRing, ROW_RING } from '../Components/Fields/fieldRing'
import { base } from '../Components/Fields/fields.css'

const c = colorVars.color

/**
 * Menu Item row — the menu / sidebar row primitive. Composes Body/Standard so
 * the title matches the macOS standard content size (NSFont.systemFontSize).
 */
const ROW_GAP = 8

/** The interactive shell EVERY row in the menu family wears — its radius, its rest cursor, its hover
 *  wash and its keyboard-focus ring. Stated once because a row that highlights or focuses unlike the
 *  row beside it is a bug rather than a variant; what each row type brings of its own is the type
 *  ramp, the tone and the layout. `fieldRing` holds the ring's geometry for the same reason. */
export const rowShell = style({
  borderRadius: '8px',
  cursor: 'default',
  selectors: {
    '&:hover': { background: c.state.hover },
    // Keyboard focus only. `:focus-visible` never matches the programmatic focus that follows a
    // click, so a mouse-opened menu looks untouched and a keyboard-opened one shows where it is.
    // The tone is the FIELD's focus tone through the same channel — a step lighter than the
    // selection ring's, so a focused row and a chosen one stay tellable apart at the same weight.
    '&:focus-visible': {
      outline: 'none',
      boxShadow: fieldRing(ROW_RING),
      vars: { '--field-ring': tintAt('var(--accent)', 'secondary') },
    },
  },
})

/** KNOBS — the ramp a row wears, so a surface can restate it once on itself instead of every row
 *  overriding the base by hand. The default is the menu family's: a menu row is body text. A picker
 *  drops to the control pair, because its rows are a control's options rather than a menu's commands.
 *  The TONE is not a knob — every row in the family reads primary, whatever its size. */
export const ROW_SIZE = `var(--menu-row-size, ${font.scale.body.size})`
export const ROW_LINE = `var(--menu-row-line, ${font.scale.body.line})`

export const item = style([
  text.body.standard,
  rowShell,
  {
    display: 'flex',
    alignItems: 'center',
    gap: `${ROW_GAP}px`,
    minHeight: '24px',
    padding: `6px ${ROW_PAD_X}px`,
    fontSize: ROW_SIZE,
    lineHeight: ROW_LINE,
    color: c.label.primary,
    userSelect: 'none',
  },
])

/** Selected pill — holds under :hover so a selected row doesn't lighten further. */
export const itemSelected = style({
  background: c.state.selected,
  selectors: { '&:hover': { background: c.state.selected } },
})

/** Row variant: the title carries weight. For rows that ARE structure rather than choices — an
 *  outline's headings — so the hierarchy reads without a second glyph or color doing the work.
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

/** Title line — inherits the row's size + color. The row markup wears `overScrollEllipsis` beside
 *  this, which is where the truncation and the hover-scroll come from. */
export const titleText = style({})

/** Inline-rename field for a menu row — sits flush in the title slot: the row's own font, color, and
 *  metrics with no border/padding/background of its own, so swapping it in for the title text is
 *  dimensionally identical (no row nudge). The caret alone marks edit mode. */
export const titleInput = style([
  base,
  {
    width: '100%',
    minWidth: 0,
    WebkitAppRegion: 'no-drag',
  } as StyleRule,
])

export const subLabel = style([text.caption.standard, { color: c.label.secondary }])

export const detail = style([text.footnote.emphasized])

/** Separator — a band with a centered hairline (Apple's menu separator height). */
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

/** Flush variant — no side inset, so the hairline spans the surface gutter edge-to-edge. */
export const separatorFlush = style({ padding: 0 })

/** Gutter-flush affordance — the shared geometry/color for the TopRow heading nav and the pane
 *  footer actions: no item inset (so the ‹ heading and the +/Delete footer line up at one left edge),
 *  a tight icon↔label gap, and its own text tone. Each consumer sets its own type; the
 *  destructive footer (Delete) re-overrides the color. */
export const flushAffordance = style({ paddingLeft: 0, gap: '4px', color: c.label.secondary })

/** Flush-trailing row — the trailing cluster (chevron, detail) sits against the gutter edge where
 *  the flush divider ends, instead of floating in on the row's right padding. */
export const flushTrailing = style({ paddingRight: 0 })

/** TopRow — a pane's top navigation row (‹ back chevron + label, optional trailing action). Flush
 *  affordance + caption type; vertical padding inherits the base row's; surfaces tune it via their own
 *  class (the ViewFrame's topRowPad knob). */
export const topRow = style([text.caption.emphasized, flushAffordance])

/** Non-interactive caption / empty-state line — centered, no row geometry. */
export const caption = style([
  text.body.standard,
  { padding: '28px 8px', textAlign: 'center', color: c.label.secondary, userSelect: 'none' },
])

export const menu = style({ display: 'flex', flexDirection: 'column', padding: '6px 0' })

// ── Shared menu row defaults + the AccessoryButton primitive ──
// The menu surfaces (SettingsFrame · ViewFrame · LayoutFrame) route their coloring, spacing, and
// icon-button recipe here. `item` also serves the sidebar, so a control tone can't ride the base
// row: a menu-only treatment belongs on its own class, never on `item`.

/** The one icon-button recipe behind every TopRow/BottomRow/row affordance (ellipsis · plus · eye ·
 *  palette). Box via `--accessory-box` (consumers pass their own). */
export const accessoryButton = style({
  width: 'var(--accessory-box, 20px)',
  color: c.label.tertiary,
})
// ── TopRow / BottomRow rhythm ──

/** ActionRow — the menu family's ancillary tier, worn by a pane's pinned header and footer. A bar
 *  frames the rows rather than joining them, so it reads a full ramp under them at the secondary
 *  tone. Every bar part composes this; a part that sits lower still (a breadcrumb) restates only its
 *  TONE, never a second size. */
export const actionRow = style([text.footnote.emphasized, { color: c.label.secondary }])

/** A pane TopRow's vertical padding + heading tone — drops the base row-height floor to the caption line. */
export const topRowPad = style({
  paddingBlock: 'var(--top-row-block, 2px)',
  minHeight: 0,
  color: c.label.secondary,
})

// ── TopBar tone knobs — every pane header's four parts, one source. Leading (the ‹ back nav) reads
// brighter than trailing (the current pane), so the back destination sits a step above the breadcrumb.
// Each knob colors the text/glyph itself, so it beats the surface's menu-title rule. All surfaces
// route here via MenuTopRow / MenuFrameTopRow.
export const topBarLeadingLabel = style([actionRow])
export const topBarLeadingSymbol = style({ display: 'inline-flex', color: c.label.secondary })
export const topBarTrailingLabel = style([actionRow, { color: c.label.tertiary }])
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
export const footingLabel = style([actionRow])
/** The footing lock action — a left-pinned labeled toggle (lock icon + label), a step-quieter
 *  icon than its label. No pressed/selected state — it never mutes on lock. */
export const footerLockAction = style([footingLabel, { gap: '5px' }])
export const lockIcon = style({ selectors: { '&&': { color: c.label.tertiary } } })
export const footingSymbol = style({ display: 'inline-flex', color: c.label.secondary })
// A BottomRow's icon buttons read the footing tone, not the accessoryButton default.
globalStyle(`${bottomRow} ${accessoryButton}`, { color: c.label.secondary })
// A footing's value reads the footing tone too — the row's own default color yields inside the
// bottom bar, so a footing's label + value + symbol all sit at one tier.
globalStyle(`${bottomBar} ${detail}`, { color: c.label.secondary })

// ── Scroll frame — the shared pinned-header/footer + scrolling-body primitive (MenuScrollFrame) ──
// A pane's optional header and footer stay put (flush against the surface, never scrolling) while the
// rows scroll BETWEEN them: the body is the only overflow region, so nothing ever slides under an edge
// (no bleed-through, no occlusion tricks). The frame caps at MENU_MAX_HEIGHT unless its caller states
// a height of its own.

/** MenuScrollFrame's default height ceiling — a pane grows to this, then scrolls. A pane wanting a
 *  different one passes `maxHeight`, and several do: a picker sits shorter than a menu, LayoutFrame
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
