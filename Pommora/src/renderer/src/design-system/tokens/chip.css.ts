import { style, styleVariants } from '@vanilla-extract/css'
import { RAMP_FAMILIES, RAMP_STEPS, type CellKey } from '@shared/theme'
import { vars as colorVars } from './color.css'
import { text } from './typography.css'
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
 *  selector outguns chipColor's tint background (emitted later in the sheet); `--melt-ground`
 *  follows the fill so a removable context chip's melt smears into the neutral, not the tint. */
export const chipContext = style([
  chipLabel,
  {
    height: '22px',
    vars: { '--chip-pad-x': '8px' },
    selectors: {
      '&&': {
        background: colorVars.color.fill.quaternary,
        vars: {
          '--melt-ground': colorVars.color.fill.quaternary,
          '--hover-remove-ink': 'var(--chip-accent)',
        },
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
 *  Being a shape rather than a lookalike is what gives it the shared `HoverRemove` structurally,
 *  instead of a second copy of that machinery.
 *
 *  `--melt-ground` FOLLOWS the background, and this shape's is transparent — so the melt twin paints
 *  nothing and the tail dissolves through the melt's ramp alone. Naming a color here would
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
    vars: { '--melt-ground': 'transparent' },
  },
])

/** chip-file — what a FILE PROPERTY'S VALUE wears: chip-label's geometry and outline weight, the
 *  border at the quaternary label tone over no fill at all. A file value stands beside other values in a
 *  cell, so it takes a box the way they do; the empty middle is what says the box names a file
 *  rather than holding a color. The `&&` beats `chipColor`, which a caller has no business
 *  assigning here — a file carries no color of its own. `--melt-ground` stays transparent for the
 *  same reason chip-plain's does: the melt twin has to paint the ground, and the ground is
 *  whatever the row has moved to under the cursor. */
export const chipFile = style([
  chipLabel,
  {
    selectors: {
      '&&': {
        background: 'transparent',
        borderColor: colorVars.color.label.quaternary,
        vars: { '--melt-ground': 'transparent' },
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
// § REMOVE — the label cap, and the vars the shared HoverRemove paints with.
// The × itself, its reveal and the melt live in interactions/HoverRemove.
// ═══════════════════════════════════════════════════════════════════════════

/** The cap lives on the LABEL, not the chip (a % width is unreliable in a shrink-to-fit flex
 *  chip): the label truncates at `--chip-max` and the chip wraps it snugly, so the ellipsis lands
 *  at the padding edge instead of floating mid-chip. */
export const chipLabelCap = style({ maxWidth: 'var(--chip-max, 80px)' })

// ═══════════════════════════════════════════════════════════════════════════
// § COLOR — the unified tint, one variant per palette key. Shape-agnostic:
// every shape above composes with any `chipColor.*`.
// ═══════════════════════════════════════════════════════════════════════════

/** A tint recipe + the chip's FILL color as a var so descendants can paint in it — the blurred twin
 *  melts the label's tail INTO the fill, not into a text-colored haze. A surface that overrides
 *  the fill (ContextChip's neutral tone) must override `--melt-ground` alongside it. `accent` is the
 *  chip's saturated identity color, for surfaces wanting the color itself rather than tint's
 *  mostly-neutral text mix — the ContextChip's × paints in it through `--hover-remove-ink`, so the
 *  remove reads as the context's color over the neutral fill instead of a colorless glyph. */
const chipFrom = (
  recipe: ReturnType<typeof tint>,
  accent: string,
): ReturnType<typeof tint> & { vars: Record<string, string> } => ({
  ...recipe,
  vars: { '--melt-ground': recipe.background, '--chip-accent': accent },
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
