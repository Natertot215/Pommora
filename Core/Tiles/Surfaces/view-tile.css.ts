import { globalStyle, keyframes, style } from '@vanilla-extract/css'
import { titleActionFade, titleReveal } from '@pommora/uix/Animations/animations.css'
import { vars as colorVars } from '@pommora/uix/Theme/color.css'
import { font } from '@pommora/uix/Theme/typography.css'
import { duration, easing } from '@pommora/uix/Animations/motion'
import { accessoryButton } from '@pommora/uix/Menus/menu-row.css'
import { REVEAL_FADE, revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { VIEW_PILL_H, viewStrip } from '@pommora/uix/Elements/view-strip.css'
import { SETTING_DEFAULTS, embedZoom, viewEmbedZoom } from '@pommora/core/Settings/personalization'

const c = colorVars.color

const HEAD_PAD_L = '14px'
const HEAD_PAD_R = '12px'
const STRIP_PAD_Y = '6px'
const stripReveal = `${duration.menu} ${easing.baseEase}`

// KNOB — how far the scroll region rises BEHIND the transparent strip so rows flow UNDER the whole strip and dissolve at the title divider, matching the strip's full height.
const FADE_RISE = `calc(${VIEW_PILL_H} + 12px)`

export const tile = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
})

export const titleRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: `12px ${HEAD_PAD_R} 8px ${HEAD_PAD_L}`,
  flex: 'none',
  fontSize: font.scale.headline.size,
  position: 'relative',
  '::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: HEAD_PAD_L,
    right: HEAD_PAD_R,
    height: '1px',
    background: c.border.light,
  },
})

export const titleSlide = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flex: '1 1 auto',
  minWidth: 0,
  transition: `transform ${titleReveal}, opacity ${titleReveal}`,
  transitionDelay: duration.menu,
})
export const titleSlideHidden = style({
  transform: 'translateX(-24px)', // KNOB — the hide's slide distance
  opacity: 0,
  transitionDelay: '0s',
})
export const titleSpace = style({
  display: 'grid',
  gridTemplateRows: '1fr',
  transition: `grid-template-rows ${titleReveal}`,
})
export const titleSpaceHidden = style({
  gridTemplateRows: '0fr',
  transitionDelay: duration.menu,
})
export const stripSpace = style({
  display: 'grid',
  gridTemplateRows: '1fr',
  transition: `grid-template-rows ${stripReveal}`,
})
export const stripSpaceHidden = style({ gridTemplateRows: '0fr' })
export const spaceInner = style({ minHeight: 0, overflow: 'hidden' })

export const titleIcon = style({ color: c.label.control })

export const titleText = style({
  flex: '1 1 auto',
  minWidth: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  color: c.label.primary,
  fontFamily: 'inherit',
  border: 'none',
  background: 'none',
  padding: 0,
  outline: 'none',
})

export const stripRow = style([
  viewStrip,
  {
    padding: `${STRIP_PAD_Y} ${HEAD_PAD_R} ${STRIP_PAD_Y} ${HEAD_PAD_L}`,
    flex: 'none',
    position: 'relative',
    zIndex: 1, // paints over the scroll region that rises behind it (FADE_RISE)
  },
])

// The incoming view slides in from the clicked pill's side — `--slide-from` carries the signed offset, re-triggered by re-keying the wrapper on the active index.
const viewSwitchSlide = keyframes({
  from: { transform: 'translateX(var(--slide-from, 0px))', opacity: 0.5 },
  to: { transform: 'translateX(0)', opacity: 1 },
})
export const slideWrap = style({
  animationName: viewSwitchSlide,
  animationDuration: duration.base,
  animationTimingFunction: easing.baseEase,
})

export const newView = style([revealTarget, { display: 'inline-flex', transition: REVEAL_FADE }])
globalStyle(`${newView} ${accessoryButton}`, { color: c.label.secondary })

export const stripLock = style([titleActionFade, { display: 'inline-flex' }])

export const listPane = style({ minWidth: 150 })

export const body = style({
  flex: '1 1 auto',
  minWidth: 0,
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
  marginTop: `calc(-1 * ${FADE_RISE})`,
  paddingTop: FADE_RISE,
  transition: `margin-top ${stripReveal}, padding-top ${stripReveal}`,
  vars: { '--scroll-fade': FADE_RISE },
})

export const bodyFlush = style({
  marginTop: 0,
  paddingTop: STRIP_PAD_Y,
  vars: { '--scroll-fade': STRIP_PAD_Y },
})

globalStyle(`${body} .table-view`, {
  vars: { '--zoom': `var(--view-embed-zoom, ${viewEmbedZoom(SETTING_DEFAULTS.embedScale)})` },
})

globalStyle(`${body} .cards-view`, {
  vars: { '--zoom': `var(--embed-zoom, ${embedZoom(SETTING_DEFAULTS.embedScale)})` },
  paddingBottom: 'var(--band-clearance)',
})

globalStyle(`${body} .cards-view .cards-grid, ${body} .cards-view .set-cards-row`, {
  paddingLeft: `calc(${HEAD_PAD_L} / (var(--zoom, 1) * var(--tile-zoom, 1)))`,
  paddingRight: `calc(${HEAD_PAD_R} / (var(--zoom, 1) * var(--tile-zoom, 1)))`,
})

globalStyle(`${body} .cards-view .group-band-row`, {
  paddingLeft: `calc(var(--rail-inset) / (var(--zoom, 1) * var(--tile-zoom, 1)) - (12px + var(--cell-icon-gap, 6px)))`,
})
globalStyle(`${body} .table`, { vars: { '--heading-fill': 'none', '--heading-divider': 'none' } })

globalStyle(`${body} .col-header:first-child`, { overflow: 'visible' })
globalStyle(`${body} .col-header:first-child::before`, {
  left: `calc((${HEAD_PAD_L} / (var(--zoom, 1) * var(--tile-zoom, 1))) - var(--rail-inset))`,
})
