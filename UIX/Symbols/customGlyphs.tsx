// At Lucide's default 2 stroke weight, so they sit evenly beside it.
import { forwardRef } from 'react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import { IconProgressCheck } from '@tabler/icons-react'
import { MARK_BOX, markDiscs } from './mark'

// Tabler glyphs read smaller than Lucide at the same box; this bump matches them.
const TABLER_SCALE = 1.1
const scaleTabler = (size: LucideProps['size']): LucideProps['size'] =>
  typeof size === 'number' ? size * TABLER_SCALE : `calc(${size ?? '1em'} * ${TABLER_SCALE})`

const STROKE = {
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const glyph = (drawing: React.ReactNode, { box = 24, stroked = true } = {}): LucideIcon =>
  forwardRef<SVGSVGElement, LucideProps>(({ size = 24, color, ...rest }, ref) => (
    <svg
      ref={ref}
      aria-hidden="true"
      width={size}
      height={size}
      viewBox={`0 0 ${box} ${box}`}
      fill="none"
      {...(stroked ? STROKE : {})}
      {...rest}
    >
      {drawing}
    </svg>
  )) as unknown as LucideIcon

export const ListRounded = glyph(
  <>
    <rect x="3.6" y="3.1" width="2.4" height="17.8" rx="1.2" fill="currentColor" stroke="none" />
    <line x1="9" y1="5.1" x2="20" y2="5.1" />
    <line x1="9" y1="9.7" x2="20" y2="9.7" />
    <line x1="9" y1="14.3" x2="20" y2="14.3" />
    <line x1="9" y1="18.9" x2="20" y2="18.9" />
  </>,
)

export const CardsGrid = glyph(
  <>
    <rect x="2.8" y="3.1" width="7.5" height="4.6" rx="1.4" />
    <rect x="13.7" y="3.1" width="7.5" height="4.6" rx="1.4" />
    <rect x="2.8" y="9.7" width="7.5" height="4.6" rx="1.4" />
    <rect x="13.7" y="9.7" width="7.5" height="4.6" rx="1.4" />
    <rect x="2.8" y="16.3" width="7.5" height="4.6" rx="1.4" />
    <rect x="13.7" y="16.3" width="7.5" height="4.6" rx="1.4" />
  </>,
)

export const asTablerGlyph = (Tabler: LucideIcon): LucideIcon =>
  forwardRef<SVGSVGElement, LucideProps>(({ size = 24, ...rest }, ref) => (
    <Tabler ref={ref} size={scaleTabler(size)} {...rest} />
  )) as unknown as LucideIcon

export const ProgressCheck = asTablerGlyph(IconProgressCheck)

// Drawn to the reference image's proportions (body ~15/24 wide, shackle stroke ~2.5).
const lockGlyph = (filled: boolean): LucideIcon =>
  glyph(
    <>
      <path
        d="M7.2 12 V7.7 a4.8 4.8 0 0 1 9.6 0 V12"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
      />
      {filled ? (
        <rect
          x="4.5"
          y="10.6"
          width="15"
          height="10.8"
          rx="2.6"
          fill="currentColor"
          stroke="none"
        />
      ) : (
        <rect
          x="5.75"
          y="11.85"
          width="12.5"
          height="8.3"
          rx="1.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
      )}
    </>,
    { stroked: false },
  )

export const LockFilled = lockGlyph(true)
export const LockOutline = lockGlyph(false)

export const Pommora = glyph(
  <g fill="currentColor" stroke="none">
    {markDiscs('icon').map(({ cx, cy, r }) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
    ))}
  </g>,
  { box: MARK_BOX, stroked: false },
)

// Anthropic's Claude mark, filled like the Pommora mark.
export const Claude = glyph(
  <path
    fill="currentColor"
    stroke="none"
    d="m19.6 66.5 19.7-11 .3-1-.3-.5h-1l-3.3-.2-11.2-.3L14 53l-9.5-.5-2.4-.5L0 49l.2-1.5 2-1.3 2.9.2 6.3.5 9.5.6 6.9.4L38 49.1h1.6l.2-.7-.5-.4-.4-.4L29 41l-10.6-7-5.6-4.1-3-2-1.5-2-.6-4.2 2.7-3 3.7.3.9.2 3.7 2.9 8 6.1L37 36l1.5 1.2.6-.4.1-.3-.7-1.1L33 25l-6-10.4-2.7-4.3-.7-2.6c-.3-1-.4-2-.4-3l3-4.2L28 0l4.2.6L33.8 2l2.6 6 4.1 9.3L47 29.9l2 3.8 1 3.4.3 1h.7v-.5l.5-7.2 1-8.7 1-11.2.3-3.2 1.6-3.8 3-2L61 2.6l2 2.9-.3 1.8-1.1 7.7L59 27.1l-1.5 8.2h.9l1-1.1 4.1-5.4 6.9-8.6 3-3.5L77 13l2.3-1.8h4.3l3.1 4.7-1.4 4.9-4.4 5.6-3.7 4.7-5.3 7.1-3.2 5.7.3.4h.7l12-2.6 6.4-1.1 7.6-1.3 3.5 1.6.4 1.6-1.4 3.4-8.2 2-9.6 2-14.3 3.3-.2.1.2.3 6.4.6 2.8.2h6.8l12.6 1 3.3 2 1.9 2.7-.3 2-5.1 2.6-6.8-1.6-16-3.8-5.4-1.3h-.8v.4l4.6 4.5 8.3 7.5L89 80.1l.5 2.4-1.3 2-1.4-.2-9.2-7-3.6-3-8-6.8h-.5v.7l1.8 2.7 9.8 14.7.5 4.5-.7 1.4-2.6 1-2.7-.6-5.8-8-6-9-4.7-8.2-.5.4-2.9 30.2-1.3 1.5-3 1.2-2.5-2-1.4-3 1.4-6.2 1.6-8 1.3-6.4 1.2-7.9.7-2.6v-.2H49L43 72l-9 12.3-7.2 7.6-1.7.7-3-1.5.3-2.8L24 86l10-12.8 6-7.9 4-4.6-.1-.5h-.3L17.2 77.4l-4.7.6-2-2 .2-3 1-1 8-5.5Z"
  />,
  {
    box: 100,
    stroked: false,
  },
)

// The Sapphire plugin's own icon: Lucide's hexagon with a half-size hexagon inside it.
export const Sapphire = glyph(
  <>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M16.5 14v-4a1 1 0 0 0-.5-.865l-3.5-2a1 1 0 0 0-1 0l-3.5 2A1 1 0 0 0 7.5 10v4a1 1 0 0 0 .5.865l3.5 2a1 1 0 0 0 1 0l3.5-2a1 1 0 0 0 .5-.865z" />
  </>,
)
