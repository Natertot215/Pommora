import { globalStyle, style, styleVariants, type ComplexStyleRule } from '@vanilla-extract/css'
import { RAMP_FAMILIES, RAMP_STEPS, cellColor, cellPaint, type CellKey } from '../Theme/ramp'
import { vars as colorVars } from '../Theme/color.css'
import { text } from '../Theme/typography.css'
import { mixAt, tintAt } from '../Theme/colors'

export const SIZE = {
  height: '20px',
  roomyHeight: '22px',
  gap: '4px',
  padX: '6px',
  roomyPadX: '8px',
  border: 'var(--width-200)',
  pillRadius: '10px',
  tagRadius: '6px',
  textMax: '85px',
} as const

const labelBase = style([
  text.control.semibold,
  {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZE.gap,
    boxSizing: 'border-box',
    borderStyle: 'solid',
    whiteSpace: 'nowrap',
  },
])

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

const BASE = 'var(--label-base)'
const FILL = tintAt(BASE, 'primary')

/** `--melt-ground` must be STATED — unset, the blurred twin inherits the text color and stacks a crisp duplicate. */
export const tinted = style({
  background: FILL,
  borderColor: tintAt(BASE, 'secondary'),
  color: mixAt(BASE, 'quaternary', colorVars.color.label.primary),
  vars: { '--melt-ground': FILL, '--label-accent': BASE },
})

/** `accent` is the raw color where it differs from the base — the greyscale row darkens before it tints. */
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

// Generated, so an added family can't leave a label behind.
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
  // Its OWN key: a grid cell would open the picker ringed on an uncolored value, leaving clearing unreachable.
  default: variant({ base: cellColor('grey-4') }),
  // A link seeds to this, so it must be a real palette key rather than the neutral grey default.
  accent: variant({ base: 'var(--system-accent)' }),
})

export type LabelColorName = keyof typeof labelColor

// The doubled selectors are what lets a modifier hold over whatever the tint says.
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
  tertiary: style({ selectors: { '&&': { borderColor: colorVars.color.border.base } } }),
  // A chrome-less chip must say none, or the UA's `medium` paints a rule in the text color.
  none: style({ border: 'none' }),
} as const

export const alignStart = style({ justifyContent: 'flex-start' })

export const roomy = style({ height: SIZE.roomyHeight, vars: { '--label-pad-x': SIZE.roomyPadX } })

/** On the TEXT: a % width is unreliable in a shrink-to-fit flex box, and truncation lands at the padding edge. */
export const textCap = style({ maxWidth: `var(--label-max, ${SIZE.textMax})` })

globalStyle(':root', { vars: { '--labels-gap': '4px' } })
