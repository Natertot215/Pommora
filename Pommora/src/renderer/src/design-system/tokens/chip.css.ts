import { style, styleVariants } from '@vanilla-extract/css'
import { RAMP_FAMILIES, RAMP_STEPS, type CellKey } from '@shared/theme'
import { vars as colorVars } from './color.css'
import { scrollRevealed, text, truncateHoverScroll } from './typography.css'
import { cellColor, cellTint } from './ramp'
import { tint } from './tint'

// ═══════════════════════════════════════════════════════════════════════════
// § SHAPE PRIMITIVES — one class per chip shape, each complete on its own.
// Compose exactly ONE shape with ONE color: `${chipPill} ${chipColor.blue}`.
// Adding a new type = one block: compose `chipBase`, state the shape's
// geometry, export it. Text ramp comes from the base — never restate it.
// ═══════════════════════════════════════════════════════════════════════════

const chipBase = style([
  text.control.semibold,
  {
    // THE chip-size knob — scales every chip shape (pill/label/context/capsule/box)
    // everywhere; set --chip-zoom on any scope (or :root) to retune.
    zoom: 'var(--chip-zoom, 1.0)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    boxSizing: 'border-box',
    borderStyle: 'solid',
    whiteSpace: 'nowrap',
  },
])

/** chip-pill — the standard text chip (status/select/multi/context labels). Horizontal padding
 *  rides the SAME `--chip-pad-x` knob as every text-chip shape (ONE padding source — a surface
 *  retunes them together; the icon-only capsule keeps its own separate knob). */
export const chipPill = style([
  chipBase,
  {
    height: '20px',
    padding: '0 var(--chip-pad-x, 6px)',
    borderRadius: '10px',
    borderWidth: '2px',
  },
])

/** chip-label — the select / multi-select shape: the pill's geometry squared off,
 *  so option chips read apart from status pills. Same `--chip-pad-x` source. */
export const chipLabel = style([
  chipBase,
  {
    height: '20px',
    padding: '0 var(--chip-pad-x, 6px)',
    borderRadius: '6px',
    borderWidth: '2px',
  },
])

/** chip-context — the Context reference chip: chip-label's geometry with a touch more room (its
 *  own `--chip-pad-x` and a taller box), so the neutral outline breathes instead of hugging the
 *  label. Context color on border + text (via chipColor) over a NEUTRAL fill, so it
 *  reads as a reference you can open, distinct from the saturated value chips. The doubled
 *  selector outguns chipColor's tint background (emitted later in the sheet); `--chip-fill`
 *  follows the fill so a removable context chip's melt smears into the neutral, not the tint. */
export const chipContext = style([
  chipLabel,
  {
    height: '22px',
    vars: { '--chip-pad-x': '8px' },
    selectors: {
      '&&': {
        background: colorVars.color.fill.quaternary,
        vars: { '--chip-fill': colorVars.color.fill.quaternary },
      },
    },
  },
])

/** chip-capsule — the icon-only shape (a single small glyph, no label; the showcase's
 *  "Select" row). Pill geometry with the glyph centered. Deliberately OFF the shared
 *  `--chip-pad-x` — it's the smaller glyph-only shape, so it keeps its own knob. */
export const chipCapsule = style([
  chipBase,
  {
    height: '20px',
    padding: '0 var(--chip-capsule-pad-x, 6px)',
    borderRadius: '10px',
    borderWidth: '2px',
    gap: 0,
  },
])

/** chip-plain — the named-file / named-folder shape worn inside a FIELD: a leading glyph and a
 *  title, and no chrome at all. It wears `chipBase` for the gap, the `--chip-zoom` knob and the
 *  control type, so it sits beside every other chip, but paints no fill and no border — a name
 *  inside a field is the field's content, and a second box around it reads as a box in a box.
 *  Being a shape rather than a lookalike is what gives it `chipRemovable` / `chipRemove` and the
 *  melt reveal structurally, instead of a second copy of that machinery.
 *
 *  `--chip-fill` FOLLOWS the background, and this shape's is transparent — so the melt twin paints
 *  nothing and the tail dissolves through `chipLabelMelt`'s ramp alone. Naming a color here would
 *  be a guess: a label with no fill sits directly on whatever is behind it, which is a translucent
 *  field wash in the Filter pane and a path field elsewhere. Leaving the var UNSET is the one thing
 *  that can't be done — the declaration would drop and the twin would inherit the label color,
 *  stacking a crisp duplicate on the text. */
export const chipPlain = style([
  chipBase,
  {
    height: '20px',
    justifyContent: 'flex-start',
    // `chipBase` sets border-STYLE and every other shape names its width; a chrome-less one has to
    // say none, or the UA's `medium` paints a 3px rule in the text color.
    border: 'none',
    vars: { '--chip-fill': 'transparent' },
  },
])

/** chip-file — what a FILE PROPERTY'S VALUE wears: chip-label's geometry and outline weight, the
 *  border at the quaternary label tone over no fill at all. A file value stands beside other values in a
 *  cell, so it takes a box the way they do; the empty middle is what says the box names a file
 *  rather than holding a color. The `&&` beats `chipColor`, which a caller has no business
 *  assigning here — a file carries no color of its own. `--chip-fill` stays transparent for the
 *  same reason chip-plain's does: the melt twin has to paint the ground, and the ground is
 *  whatever the row has moved to under the cursor. */
export const chipFile = style([
  chipLabel,
  {
    selectors: {
      '&&': {
        background: 'transparent',
        borderColor: colorVars.color.label.quaternary,
        vars: { '--chip-fill': 'transparent' },
      },
    },
  },
])

/** The box shape's bare frame — geometry only, no chip base. Exported for non-chip
 *  consumers that style themselves (the editor's task checkbox rides it under pm-checkbox). */
export const chipBoxGeometry = style({
  width: '17px',
  height: '17px',
  padding: 0,
  borderRadius: '5.5px',
  borderWidth: '1.5px',
})

/** chip-box — the fixed rounded-square frame; holds one glyph (the checkbox look's checkmark). */
export const chipBox = style([chipBase, chipBoxGeometry])

// ═══════════════════════════════════════════════════════════════════════════
// § REMOVE-× MELT MACHINERY — the hover-revealed × + the label-tail melt.
// LOAD-BEARING: masks STATIC from mount, reveals flip OPACITIES only, the
// removable label is pointer-inert. Any change here runs the re-verify
// matrix — computed styles lie for this bug class; only live hovers are truth.
// ═══════════════════════════════════════════════════════════════════════════

/** A chip that carries a hover-revealed remove ×. The modifier only anchors the affordance;
 *  the × itself is `chipRemove`; the label's TEXT tail blurs beneath it (`chipLabelText` +
 *  `chipLabelBlur`). NOTE: `chipLabelWrap` here is the melt family's label WRAPPER — distinct
 *  from the `chipLabel` SHAPE above. */
export const chipRemovable = style({ position: 'relative' })

// The cap lives on the LABEL, not the chip (a % width is unreliable in a shrink-to-fit flex chip): the
// label truncates at `--chip-max` and the chip wraps it snugly, so the ellipsis lands at the padding
// edge instead of floating mid-chip. `--chip-max` is overridable per context. The
// ellipsis-at-rest / scroll-on-hover behavior is the shared `truncateHoverScroll`; the cap is the add.
// `position: relative` anchors the removable chip's twins; masks NEVER go on this box — a
// mask here erases every descendant, the twins included. On a REMOVABLE chip the label is
// pointer-inert (inherited by the text): hovering the label body must do nothing, and if the
// label or text ever LEAVES :hover in the frame that flips the ×-reveal, Chromium drops the
// reveal's repaint beneath it — so they must never enter the hover chain at all.
export const chipLabelWrap = style([
  truncateHoverScroll,
  {
    maxWidth: 'var(--chip-max, 80px)',
    position: 'relative',
    selectors: {
      [`${chipRemovable} &`]: { pointerEvents: 'none' },
      // Which is why the scrolled state is entered from the CHIP on a removable one: a pointer-inert
      // label never matches its own `:hover`, so `truncateHoverScroll`'s half is unreachable and a
      // capped name would have no way to be read whole. The box does not move — the cap holds and
      // the text scrolls inside it. Safe against the reveal note below: the label never enters or
      // leaves the hover chain, its ancestor does, and crossing into the × zone keeps the chip
      // hovered throughout, so nothing here flips in the frame that flips the reveal.
      [`${chipRemovable}:hover &`]: scrollRevealed,
    },
  },
])

// Hovering a REMOVABLE chip BLURS the label's tail under the × — a true blur, not a fade-out.
// Two perfectly-stacked copies of the same text crossfade over one ramp
// ending at the ×'s left edge (10px inside the text run's end): the crisp copy masks OUT across it
// while its blurred twin masks IN, so the letters visibly smear into the clear zone the × floats in.
const crispRamp =
  'linear-gradient(to right, transparent 0, #000000 var(--scroll-fade, 0px), #000000 calc(100% - 18px), transparent calc(100% - 8px))'
const blurRamp =
  'linear-gradient(to right, transparent calc(100% - 18px), #000000 calc(100% - 8px))'

/**
 * The remove × — its box doubles as the reveal's hover zone (the chip's right third), so it is
 * always hittable; only hovering IT reveals it and melts the label tail beneath. Defined before
 * the label styles because their reveal selectors reference it.
 */
export const chipRemove = style({
  position: 'absolute',
  top: 0,
  right: 0,
  height: '100%',
  width: '33%',
  minWidth: '16px',
  zIndex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: '0 2.5px 0 0',
  border: 'none',
  background: 'none',
  color: 'inherit',
  cursor: 'pointer',
  opacity: 0,
  transition: 'opacity var(--duration-fast) var(--ease-standard)',
  selectors: {
    '&:hover': { opacity: 1 },
    // Keyboard parity: the reveal gate reads computed opacity, so without this a focused ×
    // is a tab stop whose Enter can never remove — it falls through and opens the host.
    '&:focus-visible': { opacity: 1 },
    // On a Context chip (neutral fill), inherit reads the mostly-neutral text mix — paint the × in the
    // context's own saturated color instead, so it reads as part of the colored chip.
    [`${chipContext} &`]: { color: 'var(--chip-accent)' },
  },
})

// The reveal is keyed on the ×'s own :hover through a SIBLING combinator (the × precedes the
// label in the DOM), and it may only ever flip OPACITIES. Chromium drops the repaint of any
// mask-image change on this inline text (none→gradient AND stop-swap alike) unless the restyle
// rides an ancestor :hover — `:has()`, sibling selectors, class toggles, and inline styles all
// compute the mask without painting it. Static masks + opacity flips paint everywhere.
const reveal = `${chipRemove}:hover ~ ${chipLabelWrap} &`

/** The label's real text — swapped out for the pre-masked twins the instant the × zone is
 *  hovered (no transition: the melt twin is pixel-identical where its mask is opaque, so a
 *  crossfade would only dim the stack mid-flight). `position: relative` is load-bearing: it
 *  gives the span its own paint layer, without which the sibling-keyed opacity flip computes
 *  but never repaints (the same dropped invalidation the reveal note above describes). */
export const chipLabelText = style({
  position: 'relative',
  selectors: {
    [reveal]: { opacity: 0 },
  },
})

/** The crisp melt twin — the same string overlaid at the text origin with the ramp STATICALLY
 *  applied, revealed by opacity alone (see the reveal note above). Clamped to the label box so
 *  a truncated label melts at its clip edge instead of ending in a bare cut. */
export const chipLabelMelt = style({
  position: 'absolute',
  top: 0,
  left: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  maskImage: crispRamp,
  WebkitMaskImage: crispRamp,
  opacity: 0,
  pointerEvents: 'none',
  selectors: {
    [reveal]: { opacity: 1 },
  },
})

/** The blurred twin — same string and font, overlaid at the text origin so the metrics line up
 *  glyph-for-glyph, but painted in the FILL color (`--chip-fill`) so the tail melts into the
 *  pill instead of hazing in the text color; visible only where the crisp copy eclipses.
 *  Deliberately NOT transitioned: a fade on a masked element can strand its final un-hover
 *  frame (the dropped-repaint family above), leaving a smear on the resting pill. */
export const chipLabelBlur = style({
  position: 'absolute',
  top: 0,
  left: 0,
  whiteSpace: 'nowrap',
  color: 'var(--chip-fill)',
  filter: 'blur(2px)',
  maskImage: blurRamp,
  WebkitMaskImage: blurRamp,
  opacity: 0,
  pointerEvents: 'none',
  selectors: {
    [reveal]: { opacity: 1 },
  },
})

// ═══════════════════════════════════════════════════════════════════════════
// § COLOR — the unified tint, one variant per palette key. Shape-agnostic:
// every shape above composes with any `chipColor.*`.
// ═══════════════════════════════════════════════════════════════════════════

/** A tint recipe + the chip's FILL color as a var so descendants can paint in it — the blurred twin
 *  melts the label's tail INTO the fill, not into a text-colored haze. A surface that overrides
 *  the fill (ContextChip's neutral tone) must override `--chip-fill` alongside it. `accent` is the
 *  chip's saturated identity color, for surfaces wanting the color itself rather than tint's
 *  mostly-neutral text mix — the ContextChip's × paints in it (see chipRemove) so the remove reads
 *  as the context's color over the neutral fill instead of a colorless glyph. */
const chipFrom = (
  recipe: ReturnType<typeof tint>,
  accent: string,
): ReturnType<typeof tint> & { vars: Record<string, string> } => ({
  ...recipe,
  vars: { '--chip-fill': recipe.background, '--chip-accent': accent },
})

const chipTint = (base: string): ReturnType<typeof chipFrom> => chipFrom(tint(base), base)

// One variant per ramp cell, generated rather than listed: the palette DERIVES from the ramp, so a
// retuned cell or an added family can't leave a chip behind.
const cellVariants = Object.fromEntries(
  RAMP_FAMILIES.flatMap((family) =>
    RAMP_STEPS.map((step) => {
      const key = `${family}-${step}` as CellKey
      return [key, chipFrom(cellTint(key), cellColor(key))]
    }),
  ),
) as Record<CellKey, ReturnType<typeof chipFrom>>

export const chipColor = styleVariants({
  ...cellVariants,
  // `default` takes grey-4's base color but keeps the plain recipe — and stays its OWN key, since a
  // grid cell would open the picker ringed on an uncolored value and leave clearing unreachable.
  default: chipTint(cellColor('grey-4')),
  // The link-color "Default": the runtime system accent, tinted like any solid. A link seeds to this
  // (the picker's no-selection state), so it must be a real palette key — not the neutral grey default.
  accent: chipTint('var(--system-accent)'),
})

/** The chip palette keys — the single source consumers (cells, `colorMap`) target. */
export type ChipColorName = keyof typeof chipColor
