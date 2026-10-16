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

// The model makers' marks — Anthropic's Claude, OpenAI's, and Google's Gemini — filled like the Pommora mark.
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

export const OpenAI = glyph(
  <path
    fill="currentColor"
    fillRule="evenodd"
    stroke="none"
    d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z"
  />,
  { stroked: false },
)

export const Gemini = glyph(
  <path
    fill="currentColor"
    stroke="none"
    d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
  />,
  { stroked: false },
)

// The Sapphire plugin's own icon: Lucide's hexagon with a half-size hexagon inside it.
export const Sapphire = glyph(
  <>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M16.5 14v-4a1 1 0 0 0-.5-.865l-3.5-2a1 1 0 0 0-1 0l-3.5 2A1 1 0 0 0 7.5 10v4a1 1 0 0 0 .5.865l3.5 2a1 1 0 0 0 1 0l3.5-2a1 1 0 0 0 .5-.865z" />
  </>,
)
