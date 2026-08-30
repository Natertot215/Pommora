// Registry-conforming forwardRef svgs at Lucide's default 2 stroke weight so they sit evenly beside it.
import { forwardRef } from 'react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import { IconProgressCheck } from '@tabler/icons-react'

// Tabler glyphs read slightly smaller than Lucide at the same box; this bump sits them at the same
// visual size (tunable). Numeric sizes scale directly; the `1em` seam path scales via calc.
const TABLER_SCALE = 1.1
const scaleTabler = (size: LucideProps['size']): LucideProps['size'] =>
  typeof size === 'number' ? size * TABLER_SCALE : `calc(${size ?? '1em'} * ${TABLER_SCALE})`

const svgBase = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Sized to the table/gallery glyph height. */
export const ListRounded = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, color, ...rest }, ref) => (
    <svg ref={ref} aria-hidden="true" width={size} height={size} {...svgBase} {...rest}>
      <rect x="3.6" y="3.1" width="2.4" height="17.8" rx="1.2" fill="currentColor" stroke="none" />
      <line x1="9" y1="5.1" x2="20" y2="5.1" />
      <line x1="9" y1="9.7" x2="20" y2="9.7" />
      <line x1="9" y1="14.3" x2="20" y2="14.3" />
      <line x1="9" y1="18.9" x2="20" y2="18.9" />
    </svg>
  ),
) as unknown as LucideIcon

export const CardsGrid = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, color, ...rest }, ref) => (
    <svg ref={ref} aria-hidden="true" width={size} height={size} {...svgBase} {...rest}>
      <rect x="2.8" y="3.1" width="7.5" height="4.6" rx="1.4" />
      <rect x="13.7" y="3.1" width="7.5" height="4.6" rx="1.4" />
      <rect x="2.8" y="9.7" width="7.5" height="4.6" rx="1.4" />
      <rect x="13.7" y="9.7" width="7.5" height="4.6" rx="1.4" />
      <rect x="2.8" y="16.3" width="7.5" height="4.6" rx="1.4" />
      <rect x="13.7" y="16.3" width="7.5" height="4.6" rx="1.4" />
    </svg>
  ),
) as unknown as LucideIcon

/** Wrap a Tabler glyph so it renders at the curated set's visual size. Every Tabler adoption goes
 *  through here — the scale is one fact, not one per glyph. */
export const asTablerGlyph = (glyph: LucideIcon): LucideIcon => {
  const Tabler = glyph as unknown as LucideIcon
  return forwardRef<SVGSVGElement, LucideProps>(({ size = 24, ...rest }, ref) => (
    <Tabler ref={ref} size={scaleTabler(size)} {...rest} />
  )) as unknown as LucideIcon
}

export const ProgressCheck = asTablerGlyph(IconProgressCheck as unknown as LucideIcon)

// Drawn to the reference image's proportions (body ~15/24 wide, shackle stroke ~2.5).
const lockGlyph = (filled: boolean): LucideIcon =>
  forwardRef<SVGSVGElement, LucideProps>(({ size = 24, color, ...rest }, ref) => (
    <svg
      ref={ref}
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...rest}
    >
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
    </svg>
  )) as unknown as LucideIcon

export const LockFilled = lockGlyph(true)
export const LockOutline = lockGlyph(false)
