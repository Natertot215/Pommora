import { style, styleVariants, type ComplexStyleRule } from '@vanilla-extract/css'
import { RAMP_FAMILIES, RAMP_STEPS, cellColor, cellPaint, type CellKey } from '../Tokens/ramp'
import { vars as colorVars } from '../Tokens/color.css'
import { text } from '../Tokens/typography.css'
import { mixAt, tintAt } from '../Tokens/tint'

// § VALUES — every number a label uses, one place each.

// Geometry for Pill + Label [Standard] chips; used by Status, Select, and Multi-Select
const SIZE = {
  height: '20px',
  roomyHeight: '22px',
  gap: '4px',
  padX: '6px',
  roomyPadX: '8px',
  border: '2px',
  pillRadius: '10px',
  tagRadius: '6px',
  textMax: '85px',

  // Geometry for Checkbox properties.
  boxSide: '17px',
  boxRadius: '5.5px',
  boxBorder: '1.5px',
} as const

const labelBase = style([
  text.control.semibold,
  {
    zoom: 'var(--label-zoom, 1.0)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZE.gap,
    boxSizing: 'border-box',
    borderStyle: 'solid',
    whiteSpace: 'nowrap',
  },
])

/** Dimensions without the base, for a surface drawing its own frame (`pm-checkbox`). */
export const boxGeometry = style({
  width: SIZE.boxSide,
  height: SIZE.boxSide,
  padding: 0,
  borderRadius: SIZE.boxRadius,
  borderWidth: SIZE.boxBorder,
})

/** The task checkbox's box. */
export const checkboxBox = style([labelBase, boxGeometry])

// Geometry for the [Compact] style; same property assignment as [Standard].
const chip = (radius: string): ComplexStyleRule => [
  labelBase,
  {
    height: SIZE.height,
    padding: `0 var(--label-pad-x, ${SIZE.padX})`,
    borderRadius: radius,
    borderWidth: SIZE.border,
  },
]

export const shape = {
  pill: style(chip(SIZE.pillRadius)),
  tag: style(chip(SIZE.tagRadius)),
} as const
export type LabelShape = keyof typeof shape

// § COLOR — the tint recipe once, then one variant per palette key naming only its base.

const BASE = 'var(--label-base)'
const FILL = tintAt(BASE, 'primary')

/** THE tint: fill, outline and text mixed off the base. `--melt-ground` must be STATED — left unset
 *  the declaration drops and the blurred twin inherits the text color, stacking a crisp duplicate. */
export const tinted = style({
  background: FILL,
  borderColor: tintAt(BASE, 'secondary'),
  color: mixAt(BASE, 'quaternary', colorVars.color.label.primary),
  vars: { '--melt-ground': FILL, '--label-accent': BASE },
})

/** A palette key: what it tints from, the outline a row brings instead of mixing one, and the raw
 *  color where the base differs from it — the greyscale row darkens before it tints. */
type Paint = { base: string; outline?: string; accent?: string }
const variant = ({ base, outline, accent }: Paint): ComplexStyleRule => [
  tinted,
  {
    vars: {
      '--label-base': base,
      ...(accent && accent !== base ? { '--label-accent': accent } : {}),
    },
    ...(outline ? { borderColor: outline } : {}),
  },
]

// Generated rather than listed, so a retuned cell or an added family can't leave a label behind.
const cellVariants = Object.fromEntries(
  RAMP_FAMILIES.flatMap((family) =>
    RAMP_STEPS.map((step) => {
      const key = `${family}-${step}` as CellKey
      return [key, variant({ ...cellPaint(key), accent: cellColor(key) })]
    }),
  ),
) as Record<CellKey, ComplexStyleRule>

export const labelColor = styleVariants({
  ...cellVariants,
  // `default` takes grey-4's base color but keeps the plain recipe — and stays its OWN key, since a
  // grid cell would open the picker ringed on an uncolored value and leave clearing unreachable.
  default: variant({ base: cellColor('grey-4') }),
  // The link-color "Default": the runtime system accent, tinted like any solid. A link seeds to this
  // (the picker's no-selection state), so it must be a real palette key — not the neutral grey default.
  accent: variant({ base: 'var(--system-accent)' }),
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
  none: style({
    selectors: { '&&': { background: 'transparent', vars: { '--melt-ground': 'transparent' } } },
  }),
} as const

export const outline = {
  tertiary: style({ selectors: { '&&': { borderColor: colorVars.color.label.quaternary } } }),
  // `labelBase` sets border-STYLE and every shape names its width; a chrome-less one has to say
  // none, or the UA's `medium` paints a rule in the text color.
  none: style({ border: 'none' }),
} as const

export const alignStart = style({ justifyContent: 'flex-start' })

export const roomy = style({ height: SIZE.roomyHeight, vars: { '--label-pad-x': SIZE.roomyPadX } })

/** The cap lives on the TEXT, not the label — a % width is unreliable in a shrink-to-fit flex box,
 *  and this way the truncation lands at the padding edge instead of floating mid-label. */
export const textCap = style({ maxWidth: `var(--label-max, ${SIZE.textMax})` })
