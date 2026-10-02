import { keyframes, style } from '@vanilla-extract/css'
import { vars } from '../Theme/color.css'
import { duration, easing } from '../Animations/motion'
import { tintAt } from '../Theme/colors'
import { font } from '../Theme/typography.css'
import { base } from '../Fields/fields.css'
import { segment } from '../Elements/segment.css'

const c = vars.color

const GUTTER = '2px'
const DAY_HEIGHT = '24px'
const ROW_GAP = '2px'

const PILL_INSET = '1px'
const PILL_RADIUS = '6px'

const hairline = { height: 'var(--width-100)', background: c.border.base } as const

export const root = style({ width: '215px', textAlign: 'left' })

export const head = style({ display: 'flex', alignItems: 'center', padding: '2px 4px 6px' })
export const headDivider = style({ ...hairline, margin: `0 ${GUTTER} 6px` })
export const titleGroup = style({ flex: 1, display: 'flex', gap: '1px' })
export const titleBtn = style({
  position: 'relative',
  fontSize: font.scale.body.size,
  fontWeight: font.weight.semibold,
  color: c.label.control,
})
export const nav = style({
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  transform: 'translateY(-2px)',
})
export const navSegment = style([segment, { width: '1px', height: '12px' }])
export const navBtn = style({ width: '24px', color: c.label.secondary })

export const menuList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  minWidth: '45px',
})
export const weekRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  padding: `0 ${GUTTER}`,
})
export const weekday = style({
  textAlign: 'center',
  fontSize: font.scale.footnote.size,
  fontWeight: font.weight.semibold,
  letterSpacing: '0.02em',
  color: c.label.secondary,
  padding: '3px 0 5px',
})

const slideLeft = keyframes({
  from: { transform: 'translateX(0)' },
  to: { transform: 'translateX(-50%)' },
})
const slideRight = keyframes({
  from: { transform: 'translateX(-50%)' },
  to: { transform: 'translateX(0)' },
})
/** `--grid-rows` is the shown month's week count, so the height animates between five- and six-week months. */
export const viewport = style({
  height: `calc(var(--grid-rows) * ${DAY_HEIGHT} + (var(--grid-rows) - 1) * ${ROW_GAP} + ${GUTTER})`,
  overflow: 'hidden',
  transition: `height ${duration.base} ${easing.baseEase}`,
})
/* Top-aligned so each month grid keeps its own height rather than the taller neighbor's. */
export const track = style({ display: 'flex', width: '200%', alignItems: 'flex-start' })
export const trackLeft = style({
  animation: `${slideLeft} ${duration.base} ${easing.baseEase} both`,
})
export const trackRight = style({
  animation: `${slideRight} ${duration.base} ${easing.baseEase} both`,
})
export const days = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  rowGap: ROW_GAP,
  padding: `0 ${GUTTER} ${GUTTER}`,
  width: '50%',
  flex: 'none',
})
export const day = style({
  all: 'unset',
  height: DAY_HEIGHT,
  textAlign: 'center',
  fontSize: font.scale.caption.size,
  display: 'grid',
  placeItems: 'center',
  position: 'relative',
  isolation: 'isolate',
  color: c.label.primary,
})
export const dayOut = style({ color: c.label.tertiary })
export const pill = style({
  position: 'absolute',
  inset: PILL_INSET,
  borderRadius: PILL_RADIUS,
  zIndex: -1,
  selectors: { [`${day}:hover &`]: { background: c.state.hover } },
})
export const pillSelected = style({
  background: `${tintAt('var(--accent)', 'primary')} !important`,
})
/** A span's band runs edge to edge beneath its days, from each end's center, rounding where a week wraps. */
export const band = style({
  position: 'absolute',
  inset: `${PILL_INSET} 0`,
  zIndex: -1,
  background: tintAt('var(--accent)', 'tertiary'),
})
export const bandFromCenter = style({ insetInlineStart: '50%' })
export const bandToCenter = style({ insetInlineEnd: '50%' })
export const bandHead = style({
  insetInlineStart: PILL_INSET,
  borderStartStartRadius: PILL_RADIUS,
  borderEndStartRadius: PILL_RADIUS,
})
export const bandTail = style({
  insetInlineEnd: PILL_INSET,
  borderStartEndRadius: PILL_RADIUS,
  borderEndEndRadius: PILL_RADIUS,
})
export const daySelected = style({ fontWeight: font.weight.semibold })

export const divider = style({ ...hairline, margin: `7px ${GUTTER} 8px` })

export const fields = style({ padding: `0 ${GUTTER}`, marginBottom: '8px' })
export const fieldRow = style({ display: 'flex', gap: '6px' })
/** Inside the Reveal, so the gap folds away with the row. */
export const fieldRowEnd = style({ paddingTop: '6px' })
export const field = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  border: `var(--width-100) solid ${c.border.base}`,
  borderRadius: '8px',
  padding: '4px 7px',
  background: c.fill.tertiary,
})
export const fieldIcon = style({ flex: 'none', color: c.label.secondary })
export const fieldValue = style({
  flex: 1,
  minWidth: 0,
  textAlign: 'center',
  fontSize: font.scale.control.size,
  fontWeight: font.weight.emphasized,
  color: c.label.primary,
})
export const fieldTime = style({ flex: 1, gap: '4px', paddingLeft: '6px', paddingRight: '6px' })
export const timeParts = style({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '2px',
})
export const hmGroup = style({ display: 'flex', alignItems: 'center' })
export const timePart = style({
  all: 'unset',
  position: 'relative',
  padding: '1px 2px',
  borderRadius: '6px',
  fontSize: font.scale.control.size,
  fontWeight: font.weight.emphasized,
  color: c.label.primary,
  userSelect: 'none',
  selectors: { '&:hover': { background: c.state.hover } },
})
export const timePartInput = style([
  base,
  {
    boxSizing: 'content-box',
    width: '2.4ch',
    textAlign: 'center',
    padding: '1px 4px',
    borderRadius: '6px',
    fontSize: font.scale.control.size,
    fontWeight: font.weight.emphasized,
    lineHeight: 'normal',
    color: c.label.primary,
    selectors: {
      '&::selection': { background: 'transparent' },
      '&::placeholder': { opacity: 1 },
    },
  },
])
export const timeColon = style({ color: c.label.secondary })

export const switchLabel = style({
  flex: 1,
  fontWeight: font.weight.emphasized,
  color: c.label.control,
})
