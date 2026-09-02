import { globalStyle, keyframes, style, type StyleRule } from '@vanilla-extract/css'
import { vars } from '@renderer/DesignSystem/Tokens/color.css'
import { duration, easing } from '@renderer/DesignSystem/Animation/motion'
import { tintAt } from '@renderer/DesignSystem/Tokens/tint'
import { font } from '@renderer/DesignSystem/Tokens/typography.css'
import { base } from '@renderer/DesignSystem/Fields/fields.css'
import { segment } from '@renderer/DesignSystem/Elements/Segment/segment.css'
import { stack } from '@renderer/DesignSystem/Tokens/stack'

const c = vars.color
const endpointFill = tintAt('var(--accent)', 'secondary')
const bandFill = tintAt('var(--accent)', 'tertiary')

const GUTTER = '2px'

const PILL_INSET = '1px'
const PILL_RADIUS = '6px'
const ROW_END_RADIUS = '7px'

const hairline = { height: 'var(--width-100)', background: c.border.base } as const

export const root = style({ width: '215px', textAlign: 'left' })

export const morph = style({ overflow: 'hidden' })
export const morphAnimated = style({ transition: `height ${duration.base} ${easing.baseEase}` })

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

export const ddWrap = style({ display: 'contents' })
globalStyle(`${ddWrap} > div`, { zIndex: stack.top.menuOverlay, pointerEvents: 'auto' })
export const menuList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  minWidth: '56px',
  maxHeight: '136px',
  overflowY: 'auto',
  scrollbarWidth: 'none',
})
export const optionRow = style({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  textAlign: 'left',
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
export const viewport = style({ overflow: 'hidden' })
/* Top-aligned so each month grid keeps its own height — the viewport's computed height (not the
   taller neighbor) decides the pane, and SizeMorph animates the change WITH the slide (one beat,
   the FrameSlide contract: the horizontal move and the resize land together). */
export const track = style({ display: 'flex', width: '200%', alignItems: 'flex-start' })
export const trackLeft = style({
  animation: `${slideLeft} var(--duration-base) var(--ease-base) both`,
})
export const trackRight = style({
  animation: `${slideRight} var(--duration-base) var(--ease-base) both`,
})
export const days = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  rowGap: '2px',
  padding: `0 ${GUTTER} ${GUTTER}`,
  width: '50%',
  flex: 'none',
})
export const day = style({
  all: 'unset',
  height: '24px',
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
export const pillToday = style({ boxShadow: `inset 0 0 0 var(--width-100) ` })
export const pillSelected = style({ background: `${endpointFill} !important` })
export const daySelected = style({ fontWeight: font.weight.semibold })
const band = (inset: string): StyleRule => ({
  background: `${bandFill} !important`,
  borderRadius: 0,
  inset,
})
export const bandUnderStart = style(band(`${PILL_INSET} 0 ${PILL_INSET} 50%`))
export const bandUnderEnd = style(band(`${PILL_INSET} 50% ${PILL_INSET} 0`))
export const pillMid = style(band(`${PILL_INSET} 0`))
export const pillRowFirst = style({
  borderRadius: `${ROW_END_RADIUS} 0 0 ${ROW_END_RADIUS}`,
  inset: `${PILL_INSET} 0 ${PILL_INSET} ${PILL_INSET}`,
})
export const pillRowLast = style({
  borderRadius: `0 ${ROW_END_RADIUS} ${ROW_END_RADIUS} 0`,
  inset: `${PILL_INSET} ${PILL_INSET} ${PILL_INSET} 0`,
})

export const divider = style({ ...hairline, margin: `7px ${GUTTER} 8px` })

export const fields = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: `0 ${GUTTER}`,
  marginBottom: '8px',
})
export const fieldRow = style({ display: 'flex', gap: '6px' })
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
export const timeSegs = style({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '2px',
})
export const hmGroup = style({ display: 'flex', alignItems: 'center' })
export const timeSeg = style({
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
export const timeSegInput = style([
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
