import { style, styleVariants } from '@vanilla-extract/css'
import { RAMP_FAMILIES, RAMP_STEPS, type CellKey } from '@shared/theme'
import { vars as colorVars } from '../tokens/color.css'
import { text } from '../tokens/typography.css'
import { cellColor, cellTint } from '../tokens/ramp'
import { tint } from '../tokens/tint'

// § SHAPE — geometry alone. Fill, outline, alignment and tint are separate axes, so any
// combination is reachable without minting a class for it.

const labelBase = style([
  text.control.semibold,
  {
    // THE label-size knob — optional.
    zoom: 'var(--label-zoom, 1.0)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    boxSizing: 'border-box',
    borderStyle: 'solid',
    whiteSpace: 'nowrap',
  },
])

/** Dimensions without the base, for a surface drawing its own frame (`pm-checkbox`). */
export const boxGeometry = style({
  width: '17px',
  height: '17px',
  padding: 0,
  borderRadius: '5.5px',
  borderWidth: '1.5px',
})

/** `pill` and `tag` share `--label-pad-x` so a surface retunes them together. */
export const shape = {
  pill: style([
    labelBase,
    {
      height: '20px',
      padding: '0 var(--label-pad-x, 6px)',
      borderRadius: '10px',
      borderWidth: '2px',
    },
  ]),
  tag: style([
    labelBase,
    {
      height: '20px',
      padding: '0 var(--label-pad-x, 6px)',
      borderRadius: '6px',
      borderWidth: '2px',
    },
  ]),
  chip: style([
    labelBase,
    {
      height: '20px',
      padding: '0 var(--label-chip-pad-x, 6px)',
      borderRadius: '10px',
      borderWidth: '2px',
      gap: 0,
    },
  ]),
  box: style([labelBase, boxGeometry]),
} as const
export type LabelShape = keyof typeof shape

// § COLOR — one variant per palette key; every shape composes with any of them.

/** `--melt-ground` is what a removable label's blurred twin smears into, so it FOLLOWS the fill;
 *  `--label-accent` is the saturated identity color, for surfaces wanting the color itself rather
 *  than tint's mostly-neutral text mix. */
const labelFrom = (
  recipe: ReturnType<typeof tint>,
  accent: string,
): ReturnType<typeof tint> & { vars: Record<string, string> } => ({
  ...recipe,
  vars: { '--melt-ground': recipe.background, '--label-accent': accent },
})

const labelTint = (base: string): ReturnType<typeof labelFrom> => labelFrom(tint(base), base)

// Generated rather than listed, so a retuned cell or an added family can't leave a label behind.
const cellVariants = Object.fromEntries(
  RAMP_FAMILIES.flatMap((family) =>
    RAMP_STEPS.map((step) => {
      const key = `${family}-${step}` as CellKey
      return [key, labelFrom(cellTint(key), cellColor(key))]
    }),
  ),
) as Record<CellKey, ReturnType<typeof labelFrom>>

export const labelColor = styleVariants({
  ...cellVariants,
  // `default` takes grey-4's base color but keeps the plain recipe — and stays its OWN key, since a
  // grid cell would open the picker ringed on an uncolored value and leave clearing unreachable.
  default: labelTint(cellColor('grey-4')),
  // The link-color "Default": the runtime system accent, tinted like any solid. A link seeds to this
  // (the picker's no-selection state), so it must be a real palette key — not the neutral grey default.
  accent: labelTint('var(--system-accent)'),
})

/** The label palette keys — the single source consumers (cells, `colorMap`) target. */
export type LabelColorName = keyof typeof labelColor

// § TREATMENT — named only where it DIFFERS from the tint. Doubled selectors so a modifier holds
// whatever the tint says.

/** `neutral` moves the color to border and text over a colorless ground, so it reads as something
 *  you can open rather than a value; its × takes the accent the text mix would wash out. */
export const fill = {
  neutral: style({
    selectors: {
      '&&': {
        background: colorVars.color.fill.quaternary,
        vars: {
          '--melt-ground': colorVars.color.fill.quaternary,
          '--hover-remove-ink': 'var(--label-accent)',
        },
      },
    },
  }),
  /** `--melt-ground` must still be STATED: left unset the declaration drops and the twin inherits
   *  the text color, stacking a crisp duplicate over the label. */
  none: style({
    selectors: { '&&': { background: 'transparent', vars: { '--melt-ground': 'transparent' } } },
  }),
} as const

export const outline = {
  tertiary: style({ selectors: { '&&': { borderColor: colorVars.color.label.quaternary } } }),
  // `labelBase` sets border-STYLE and every shape names its width; a chrome-less one has to say
  // none, or the UA's `medium` paints a 3px rule in the text color.
  none: style({ border: 'none' }),
} as const

export const alignStart = style({ justifyContent: 'flex-start' })

export const roomy = style({ height: '22px', vars: { '--label-pad-x': '8px' } })

/** The cap lives on the TEXT, not the label — a % width is unreliable in a shrink-to-fit flex box,
 *  and this way the truncation lands at the padding edge instead of floating mid-label. */
export const textCap = style({ maxWidth: 'var(--label-max, 85px)' })
