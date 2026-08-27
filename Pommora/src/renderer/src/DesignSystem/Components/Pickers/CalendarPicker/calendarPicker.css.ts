import { globalStyle, keyframes, style, type StyleRule } from '@vanilla-extract/css'
import { vars } from '../../../Tokens/color.css'
import { duration, easing } from '../../../Animation/motion'
import { tintAt } from '../../../Tokens/tint'
import { font } from '../../../Tokens/typography.css'
import { base } from '../../Fields/fields.css'
import { segment } from '../../../Elements/Segment/segment.css'
import { stack } from '../../../Tokens/stack'

const c = vars.color
// Selection tints: endpoints at a stronger tint, the in-between band a
// step lighter — both off the live --accent.
const endpointFill = tintAt('var(--accent)', 'secondary')
const bandFill = tintAt('var(--accent)', 'tertiary')

// The inset the week row, the day grid, the fields and both dividers share.
const GUTTER = '2px'

// The fill layer's inset inside a day cell, and its corner. A range end's outer corner sits one
// inset further out (7px), so the strip's rounded edge and the fill beneath it land flush.
const PILL_INSET = '1px'
const PILL_RADIUS = '6px'
const ROW_END_RADIUS = '7px'

// The hairline both dividers draw; each states its own margin.
const hairline = { height: 'var(--width-100)', background: c.border.base } as const

/* The picker's intrinsic width — the PickerMenu pane shrink-wraps this (+ its gutters). THE
   sizing knob; everything inside flows from it.*/
export const root = style({ width: '215px', textAlign: 'left' })

/* Content size changes (toggles, month row-count) ride the same beat as FrameSlide's viewport —
   the ViewFrame feel: measured height, transition armed only after first paint so the pane opens
   at size instead of growing from 0. */
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
/* translateY nudges the chevron cluster up without costing the row any height. */
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
  minWidth: '56px', // shrink-wrap to content; the floor keeps a one-word list off its own corners
  maxHeight: '136px', // ≈6 option rows before it scrolls (rides the shared over-scroll)
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
  fontSize: font.scale.body.size, // the pane's own scale (matches the Month/Year title)
  color: c.label.control,
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
/* The fill layer under each date. Endpoints square off their inner edge and the band bleeds
   full-width, so a range reads as ONE connected strip, never per-day pills. */
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
/* Range endpoints stay FULLY rounded pills; the band runs UNDERNEATH them (a half-width
   under-layer toward the range side), so the strip connects while the endpoint keeps both its
   rounded edges overlapping the under-tint. */
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

/* EQUAL breathing room above and below, mirroring the divider's own bottom margin. */
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
  background: c.fill.tertiary, // ad-hoc fill on this surface, not the shared token ramp
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
/* Equal halves everywhere — the time field just tightens its own
   metrics so [hh]:[mm] AM/PM fits its half. */
export const fieldTime = style({ flex: 1, gap: '4px', paddingLeft: '6px', paddingRight: '6px' })
/* The time cluster reads as ONE flush value — "4:20 PM" tight, the WHOLE reading right-aligned in
   its field. Segments stay individual dropdown triggers under the flush skin (hover reveals each). */
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
  userSelect: 'none', // double-click edits in place — never a text-selection flash
  selectors: { '&:hover': { background: c.state.hover } },
})
/* The double-click caret editor — the segment's own look; select-all drives replace-on-type but
   the selection paints transparent (highlighting disabled). */
export const timeSegInput = style([
  base,
  {
    boxSizing: 'content-box', // 2-digit glyphs + caret live in the content width; padding sits outside (no clip)
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
      // The set time as the type-over hint — the tone is the family's; opacity:1 so only it dims.
      '&::placeholder': { opacity: 1 },
    },
  },
])
export const timeColon = style({ color: c.label.secondary })

export const switchRow = style({
  display: 'flex',
  alignItems: 'center',
  minHeight: '28px',
  // The head's inset, not the grid's — a footing row reads against the month title above it.
  padding: '0 4px',
})
export const switchLabel = style({
  flex: 1,
  fontSize: font.scale.control.size,
  fontWeight: font.weight.emphasized,
  color: c.label.control,
})
