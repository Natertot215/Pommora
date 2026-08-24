import { globalStyle, keyframes, style } from '@vanilla-extract/css'
import { vars } from '../../../Tokens/color.css'
import { duration, easing } from '../../../Animation/motion'
import { TINT_STEPS, tintAt } from '../../../Tokens/tint'
import { font } from '../../../Tokens/typography.css'
import { bare } from '../../Fields/fields.css'
import { segment } from '../../../Elements/Segment/segment.css'
import { stack } from '../../../Tokens/stack'

const c = vars.color
// Selection tints: endpoints at a stronger tint, the in-between band a
// step lighter — both off the live --accent.
const endpointFill = tintAt('var(--accent)', TINT_STEPS.secondary)
const bandFill = tintAt('var(--accent)', TINT_STEPS.tertiary)

/* The picker's intrinsic width — the PickerMenu pane shrink-wraps this (+ its gutters). THE
   sizing knob; everything inside flows from it. textAlign resets the host's inheritance — a
   picker mounted inside a <button> trigger would otherwise center every label. */
export const root = style({ width: '216px', textAlign: 'left' })

/* Content size changes (toggles, month row-count) ride the same beat as PaneSlider's viewport —
   the ViewPane feel: measured height, transition armed only after first paint so the pane opens
   at size instead of growing from 0. */
export const morph = style({ overflow: 'hidden' })
export const morphAnimated = style({ transition: `height ${duration.base} ${easing.baseEase}` })

export const head = style({ display: 'flex', alignItems: 'center', padding: '2px 4px 6px' })
export const headDivider = style({
  height: '1px',
  background: c.separator.border,
  margin: '0 2px 6px',
})
export const titleGroup = style({ flex: 1, display: 'flex', gap: '1px' })
export const titleBtn = style({
  all: 'unset',
  position: 'relative',
  fontSize: font.scale.body.size,
  fontWeight: font.weight.semibold,
  color: c.label.control,
  padding: '2px 5px',
  borderRadius: '5px',
  transition: `background ${duration.fast} ${easing.baseEase}`,
  selectors: { '&:hover': { background: c.state.hover } },
})
/* translateY nudges the chevron cluster up without costing the row any height. */
export const nav = style({
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  transform: 'translateY(-2px)',
})
export const navSegment = style([segment, { width: '1px', height: '12px' }])
export const navBtn = style({
  all: 'unset',
  width: '24px',
  height: '22px',
  borderRadius: '6px',
  display: 'grid',
  placeItems: 'center',
  color: c.label.secondary,
  transition: `background ${duration.fast} ${easing.baseEase}`,
  selectors: { '&:hover': { background: c.state.hover } },
})

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
  padding: '0 2px',
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
   the PaneSlider contract: the horizontal move and the resize land together). */
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
  padding: '0 2px 2px',
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
  inset: '1px',
  borderRadius: '7px',
  zIndex: -1,
  selectors: { [`${day}:hover &`]: { background: c.state.hover } },
})
export const pillToday = style({ boxShadow: `inset 0 0 0 1px ${c.label.tertiary}` })
export const pillSelected = style({ background: `${endpointFill} !important` })
export const daySelected = style({ fontWeight: font.weight.semibold })
/* Range endpoints stay FULLY rounded pills; the band runs UNDERNEATH them (a half-width
   under-layer toward the range side), so the strip connects while the endpoint keeps both its
   rounded edges overlapping the under-tint. */
export const bandUnderStart = style({
  background: `${bandFill} !important`,
  borderRadius: 0,
  inset: '1px 0 1px 50%',
})
export const bandUnderEnd = style({
  background: `${bandFill} !important`,
  borderRadius: 0,
  inset: '1px 50% 1px 0',
})
export const pillMid = style({
  background: `${bandFill} !important`,
  borderRadius: 0,
  inset: '1px 0',
})
export const pillRowFirst = style({ borderRadius: '7px 0 0 7px', inset: '1px 0 1px 1px' })
export const pillRowLast = style({ borderRadius: '0 7px 7px 0', inset: '1px 1px 1px 0' })

export const divider = style({
  height: '1px',
  background: c.separator.border,
  margin: '7px 2px 8px',
})

/* EQUAL breathing room above and below, mirroring the divider's own bottom margin. */
export const fields = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: '0 2px',
  marginBottom: '8px',
})
export const fieldRow = style({ display: 'flex', gap: '6px' })
export const field = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  border: `1px solid ${c.separator.border}`,
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
export const fieldEmpty = style({ color: c.label.tertiary })
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
  borderRadius: '5px',
  fontSize: font.scale.control.size,
  fontWeight: font.weight.emphasized,
  color: c.label.primary,
  userSelect: 'none', // double-click edits in place — never a text-selection flash
  selectors: { '&:hover': { background: c.state.hover } },
})
/* The double-click caret editor — the segment's own look; select-all drives replace-on-type but
   the selection paints transparent (highlighting disabled). */
export const timeSegInput = style([
  bare,
  {
    boxSizing: 'content-box', // 2-digit glyphs + caret live in the content width; padding sits outside (no clip)
    width: '2.4ch',
    textAlign: 'center',
    padding: '1px 4px',
    borderRadius: '5px',
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
  padding: '0 2px',
})
export const switchLabel = style({
  flex: 1,
  fontSize: font.scale.control.size,
  fontWeight: font.weight.emphasized,
  color: c.label.control,
})
