import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { text } from '@renderer/DesignSystem/Tokens/typography.css'
import type { IconSize } from '@renderer/DesignSystem/Tokens/size.css'
import { duration, easing } from '@renderer/DesignSystem/Animation'
import {
  accessoryButton,
  accessoryGhostRest,
  footingLabel,
  titleText,
} from '@renderer/DesignSystem/Components/Menu/menu.css'
import { surface } from '@renderer/DesignSystem/Components/Menu/menuSurface.css'
import { dropdownAnchor } from '@renderer/DesignSystem/Components/dropdownAnchor'
import { stack } from '@renderer/DesignSystem/Tokens/stack'
import { fieldRing } from '@renderer/DesignSystem/Components/Fields/fieldRing'

const c = colorVars.color

// ═══════════════════════════════════════════════════════════════════════════
// KNOBS — every ViewPane tunable, grouped by what it controls. Tune here;
// the styles below (ordered top-to-bottom as the pane renders) only consume.
// ═══════════════════════════════════════════════════════════════════════════

/** — COLOR — */
const COLOR = {
  headingLabel: c.label.tertiary, // section-heading TEXT — "Options", "Format", "All Properties" (the dimmest tier)
  actionLabel: c.label.tertiary, // eye/palette add their own ghost-opacity rest; the glyph swaps open ↔ off
  allRow: c.label.secondary, // unassigned registry rows — dimmer than assigned, brighter than the heading
  iconHover: c.state.hover, // the shared fill behind any pane icon-button on hover (not a glyph shift)
  dragHighlight: c.state.hover, // the unassign area tint while dragging out
  eyeHidden: c.label.tertiary, // a hidden row's eye, riding the row's ghost (single dim)
}

/** — SIZING — (px boxes; the glyphs inside are ICON's) */
const SIZE = {
  topRowActionWidth: 20, // height hugs the glyph
  iconPickerButton: 28,
  dashIcon: 16,
  dragHighlightRadius: 6,
}

/** — OPTION EDITOR — (Select/Multi option list; px) */
const OPTION = {
  gapAroundLabel: 6, // "Options" → first chip (the gap ABOVE "Options" is the header's own bottom pad)
  gapBetweenChips: 6,
  chipPadX: 6, // option chip horizontal padding — retunes the shared label default, this pane only
  addBox: 20, // the "Options" + hit target (its glyph is ICON.optionsAdd)
  groupGap: 12, // status only: gap between one group's block (heading + chips) and the next
}

/** — ICONS — which ladder step each glyph in this pane names, consumed by PropertiesPane/ViewPane
 *  TSX. The TopRow's own ‹ chevron is the shared MenuTopRow's — not a pane-local knob. */
export const ICON = {
  add: 'body', // the header ⊕ (square-plus) — sized to the back-row heading
  editorMenu: 'body', // the editor header's ⋮ — sized to the back-row heading
  doc: 'control', // the property-type icon on every row (assigned · registry · type picker)
  rootEntry: 'title3', // the root menu's leading icons (Properties · Visibility · …)
  dropOutline: 'control', // the All Properties disclosure chevron
  rowPlus: 'control', // the registry row's + glyph
  eye: 'body', // the Visibility pane's eye / eye-off glyph
  optionsAdd: 'control', // the option editor's "Options" + glyph
  palette: 'body', // the option row's hover recolor glyph
} satisfies Record<string, IconSize>

// ═══════════════════════════════════════════════════════════════════════════
// § SHELL — the dropdown anchor under the toolbar Settings button
// ═══════════════════════════════════════════════════════════════════════════

/** Anchored under the toolbar Settings button (the trio cluster is position:relative). Right-aligned;
 *  the pane's own beak tip owns the Bloom origin. */
export const anchor = style(dropdownAnchor('right', stack.local.lifted))

// ═══════════════════════════════════════════════════════════════════════════
// § TITLE HEADER — the root menu's icon + inline-rename title row
// ═══════════════════════════════════════════════════════════════════════════

/** The icon + title header row. Its left inset aligns the icon-button's centered dash with the
 *  row-icon column used elsewhere. Seeds the resting field border on the shared OutlineTint
 *  channel, so both halves wear it as one — a caller's `outline` tint overrides from the element. */
export const header = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '2px 0 6px 2px',
  vars: { '--field-ring': c.separator.border },
})

/** Square icon button — opens the icon picker. Paints the shared OutlineTint channel so a
 *  header carrying `--field-ring` rings the icon and title as one. */
export const iconButton = style({
  flex: '0 0 auto',
  width: `${SIZE.iconPickerButton}px`,
  color: COLOR.actionLabel,
  boxShadow: fieldRing(),
})

export const titleField = style({ flex: '1 1 auto', minWidth: 0 })

/** A profile photo filling the square icon-button slot (homepage identity) — cover-fit, corners
 *  matched to the button so it reads as the icon's photo rather than a floating thumbnail. */
export const headerPhotoImg = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: '8px',
  display: 'block',
})

/** Placeholder dashed-square menu icon (until the real symbols are specified). */
export const dashIcon = style({
  width: `${SIZE.dashIcon}px`,
  height: `${SIZE.dashIcon}px`,
  borderRadius: '3px',
  border: '1px dashed currentColor',
  opacity: 'var(--state-inactive)',
  flex: '0 0 auto',
})

// ═══════════════════════════════════════════════════════════════════════════
// § TOPROW — the ‹ back row + its trailing ⊕ / ⋮ action
// ═══════════════════════════════════════════════════════════════════════════

/** The TopRow's trailing action (⊕ create / ⋮ menu) — the shared accessory recipe, retuned for the
 *  TopRow: width-only (height hugs the glyph), right-aligned to the gutter edge, matching the back-row
 *  heading's tone. The `&&` clears the `.app-toolbar button` control-tone default. */
export const topRowAction = style([
  accessoryButton,
  {
    flex: '0 0 auto',
    width: `${SIZE.topRowActionWidth}px`,
    height: 'auto',
    justifyContent: 'flex-end',
    selectors: { '&&': { color: c.label.secondary } },
  },
])

// ═══════════════════════════════════════════════════════════════════════════
// § ALL PROPERTIES — the bottom-pinned disclosure block + its registry rows
// (assigned rows carry no pane-local style — they're menu.css items + flushTrailing)
// ═══════════════════════════════════════════════════════════════════════════

/** The elastic gap above the All Properties block: closed it absorbs the pane floor's slack
 *  (the block reads bottom-pinned); open it collapses on the pane's beat, so the heading RISES
 *  to meet the assigned rows while its list unfolds beneath. */
export const allSpacer = style({
  flex: '1 1 0px',
  transition: `flex-grow ${duration.base} ${easing.baseEase}`,
})
export const allSpacerCollapsed = style({ flexGrow: 0 })

/** The "All Properties" disclosure row — a bare clickable line whose LABEL rides `optionsLabel` (DRY
 *  with the "Options"/"Format" section headings), its chevron flush at the gutter edge. It's not a
 *  MenuItem, so its text escapes the surface's titleText tone and reads at the heading tier. */
export const allHeadingRow = style({
  // The pane's beat, not the disclosure beat: this row's chevron, its Reveal unfold and the elastic
  // spacer's height-resize all have to land together, and the other two run on `base`.
  vars: { '--drop-outline-beat': 'var(--duration-base)' },
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  width: '100%',
  minHeight: '24px',
  padding: '6px 6px',
  paddingLeft: 0,
  border: 'none',
  background: 'none',
  cursor: 'default',
})

export const allRow = style({ color: COLOR.allRow })

// The row's LABEL rides the surface's titleText global (`.surface .titleText`, 0-2-0); beat it
// with a 0-3-0 scope so an unassigned row's title settles one tier down, matching its icon.
globalStyle(`.${surface} .${allRow} .${titleText}`, { color: c.label.secondary })

/** The Layout / Cards toggle rows (Column Icons · Page Icons · …) — a marker class; their labels ride
 *  the surface's titleText tone like every other nav/settings row. */
export const toggleRow = style({})

/** The per-row `+` promote affordance — the shared accessory recipe. */
export const rowPlus = accessoryButton

// ═══════════════════════════════════════════════════════════════════════════
// § VISIBILITY (HiddenPane) — the ghosted hidden zone + per-row eye toggle
// ═══════════════════════════════════════════════════════════════════════════

/** The picked-up row fades to the ghost opacity — muted in place, never displaced. Shared by both
 *  panes' RowShell; declared here so the hidden-row ghost below can reference it (source order). */
export const rowDragging = style({ opacity: 'var(--state-ghost)' })

/** Hidden rows read de-emphasized via the shared ghost opacity (the drag-dim token:
 *  `--state-ghost`, not the muted veil). The ghost IS the shown/hidden boundary — no
 *  heading. Reset to full opacity while this row is the drag subject: `rowDragging`
 *  already dims the wrapper to the ghost, and two stacked 60% layers composite to 36%
 *  — the inner row rides full so the net dim is the single intended ghost. */
export const hiddenRow = style({
  opacity: 'var(--state-ghost)',
  selectors: { [`${rowDragging} &`]: { opacity: 1 } },
})

/** The hidden zone sits directly below the shown rows and grows into the pane's slack (rows
 *  top-aligned, placed below, NOT bottom-pinned), so the drag-to-hide area
 *  highlight covers the empty space beneath them even while nothing's hidden yet. */
export const hiddenZone = style({ flex: '1 1 auto' })

/** The eye toggle — the action-symbol color + ghost at rest, un-ghosting on hover (no color shift);
 *  the glyph swaps open ↔ off (the pair passes reversed in JSX on a hidden row). On a hidden row it
 *  rides eyeHidden + resets its own opacity to 1, so it dims by ONLY the row's ghost (never double-dims). */
export const eyeButton = style([
  accessoryButton,
  accessoryGhostRest,
  { selectors: { [`${hiddenRow} &`]: { color: COLOR.eyeHidden, opacity: 1 } } },
])
export const eyeRestGlyph = style({
  display: 'flex',
  selectors: { [`${eyeButton}:hover &`]: { display: 'none' } },
})
export const eyeHoverGlyph = style({
  display: 'none',
  selectors: { [`${eyeButton}:hover &`]: { display: 'flex' } },
})

/** Title's inert eye — the same glyph + box for visual parity with the other rows, but it never
 *  hides: no hover-preview swap, no hover fill, no pointer (clicking does nothing). Sits at the rest
 *  ghost opacity so it reads like every other row's resting eye. */
export const eyeInert = style([
  accessoryButton,
  {
    cursor: 'default',
    opacity: 'var(--state-ghost)',
    selectors: { '&:hover': { background: 'transparent', opacity: 'var(--state-ghost)' } },
  },
])

// ═══════════════════════════════════════════════════════════════════════════
// § DRAG CHROME — the two-region drag's box, highlight, and source dim
// ═══════════════════════════════════════════════════════════════════════════

/** Layout only — fills the slot so the elastic spacer has the floor's slack to absorb; the
 *  drop line's positioning context comes from the shared `drop-line-host`. */
export const paneDnd = style({
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 auto',
})

/** The unassign target's area highlight — the whole all-group tints, no insertion line. */
export const allHighlight = style({
  background: COLOR.dragHighlight,
  borderRadius: `${SIZE.dragHighlightRadius}px`,
})

// ═══════════════════════════════════════════════════════════════════════════
// § OPTION EDITOR — the Select / Multi-Select option list in a property's editor
// ═══════════════════════════════════════════════════════════════════════════

/** The option list container, below the InlineEditHeader (whose bottom pad sets the gap above). */
export const optionEditor = style({ display: 'flex', flexDirection: 'column' })

/** Status only — the grouped variant: one block per group (heading + its chips). Reuses `optionsRow` /
 *  `optionsLabel` / `optionList` / `optionRow` from the flat editor. */
export const statusGroups = style({
  display: 'flex',
  flexDirection: 'column',
  gap: `${OPTION.groupGap}px`,
})
export const statusGroup = style({ display: 'flex', flexDirection: 'column' })

/** The "Options" row — its trailing + is always shown, unlike the per-group + below. */
export const optionsRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
})

/** The "Options" heading + the Status group labels — a step heavier than the All Properties /
 *  back-row headings, the shared heading-label color. */
export const optionsLabel = style([text.footnote.semibold, { color: COLOR.headingLabel }])

/** The "All Properties" label — the optionsLabel look, a tier up from the section headings
 *  (only this row, not every options-row). */
export const allPropertiesLabel = style([optionsLabel, { color: c.label.secondary }])

/** The always-shown + that appends an option — the shared action-symbol color, brightening on hover. */
export const optionsAdd = style([
  accessoryButton,
  { width: `${OPTION.addBox}px`, height: `${OPTION.addBox}px` },
])

/** Status only — the per-group + . Reuses the "Options" + button, hidden until you hover the group
 *  (its heading or its chips), with a state-hover fill on direct hover; the `&&` clears
 *  `.app-toolbar button`'s control-tone default (0,1,1) so it reads at its own rest tone, not the
 *  toolbar's. */
export const groupAdd = style([
  optionsAdd,
  {
    opacity: 0,
    transition: `opacity ${duration.fast} ${easing.baseEase}, background ${duration.fast} ${easing.baseEase}`,
    selectors: {
      [`${statusGroup}:hover &`]: { opacity: 1 },
      '&&': { color: c.label.tertiary },
    },
  },
])

/** Layout only — the drop line's positioning context comes from the shared `drop-line-host`. */
export const optionList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: `${OPTION.gapBetweenChips}px`,
  paddingTop: `${OPTION.gapAroundLabel}px`,
  vars: { '--label-pad-x': `${OPTION.chipPadX}px` },
})

export const optionRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
})

/** The New Option ghost — a chip for an option that doesn't exist yet. It arms and discloses on the
 *  shared ghost mechanism (`useGhostAnchor` + `Reveal`, the same dwell and beat the table's New Page
 *  row rides) and wears the shared ghost effect (`ghost.css`), so nothing about how it appears or
 *  moves is decided here. A bare button: the chip inside it is the whole affordance. */
export const ghostOptionRow = style([
  optionRow,
  {
    background: 'none',
    border: 'none',
    padding: 0,
    font: 'inherit',
    textAlign: 'left',
  },
])

/** Outline only — the chip's border and label with its fill dropped, so a slot reads as a shape
 *  waiting to be filled rather than as a value that already has one. `--melt-ground` follows the
 *  background it no longer has, keeping the melt twins off a color the chip isn't wearing. */
export const ghostChip = style({
  selectors: {
    '&&': { background: 'transparent', vars: { '--melt-ground': 'transparent' } },
  },
})

/** The recolor icon's positioning context — the ColorPicker anchors (centered, below) to this. */
export const paletteAnchor = style({ position: 'relative', display: 'flex', alignItems: 'center' })

/** The per-row recolor icon — mirrors the Visibility eye: the action-symbol color, hidden at rest,
 *  fading in ghosted on row hover and to full on its own hover (opacity-only). */
export const paletteButton = style([
  accessoryButton,
  {
    opacity: 0,
    transition: `opacity ${duration.fast} ${easing.baseEase}, background ${duration.fast} ${easing.baseEase}`,
    selectors: {
      [`${optionRow}:hover &`]: { opacity: 'var(--state-ghost)' },
      [`${optionRow}:hover &:hover`]: { opacity: 1, background: COLOR.iconHover },
    },
  },
])

// ═══════════════════════════════════════════════════════════════════════════
// § CONFIG ROWS — the shared property-editor rows (label left, control right),
// used by the Link editor (toggles + color chip) and the Checkbox editor (color
// chip + style picker). One row primitive, one label tone, one color cluster.
// ═══════════════════════════════════════════════════════════════════════════

/** A config body. The Link editor root also scopes `--accent` (inline) to the chosen color, so its
 *  Switches' on-track tints to it — that pane only. */
export const configEditor = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  paddingTop: `${OPTION.gapAroundLabel}px`,
})

export const configRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: '24px',
})

/** The row label — Underline · Full URL · Color · Style. Control DENSITY at the primary tone: the
 *  pane sits at control scale, but a label is what the row says, so it reads at full strength while
 *  its glyph and its value stay a step under. */
export const configLabel = style([text.control.emphasized, { color: c.label.primary }])

/** The scoped-pane footer breadcrumb — the embed's source path, `(icon) Collection › (icon) Set`;
 *  the lock rides the trailing slot. */
export const crumbRow = style([
  footingLabel,
  { display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: 0 },
])

/** The scoped footer's lock reads the footing TRAILING tone, a step under the leading breadcrumb;
 *  quadrupled to outrank the BottomRow's own icon-tone bump. */
export const footerLock = style({
  selectors: { '&&&&': { color: c.label.tertiary } },
})

/** Locked state — reads engaged via the active state fill alone (no color lift). `--state-active` isn't
 *  a token (state = hover / selected / muted) — this rides the mapped equivalent instead. */
export const footerLockActive = style({
  background: 'var(--state-selected)',
})
