import { globalStyle, keyframes, style } from '@vanilla-extract/css'
import { titleActionFade, titleReveal } from '@pommora/uix/Animations/animations.css'
import { vars as colorVars } from '@pommora/uix/Theme/color.css'
import { duration } from '@pommora/uix/Animations/motion'
import { accessoryButton } from '@pommora/uix/Menus/menu-base.css'
import { SEGMENT_H, segmentRow, settingsBtn } from '@pommora/uix/Elements/action-band.css'
import {
  EMBED_SCALE_DEFAULT,
  embedZoom,
  viewEmbedZoom,
} from '@pommora/core/Settings/personalization'

const c = colorVars.color

const HEAD_PAD_L = '14px'
const HEAD_PAD_R = '12px'
const BAND_PAD_Y = '6px'
const bandReveal = `${duration.menu} var(--ease-base)`

// KNOB — how far the scroll region rises BEHIND the transparent switcher so rows flow UNDER the whole toolbar and dissolve at the title divider, matching the switcher's full height.
const FADE_RISE = `calc(${SEGMENT_H} + 12px)`

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
  fontSize: 'var(--editor-font-size, 15px)',
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
export const bandSpace = style({
  display: 'grid',
  gridTemplateRows: '1fr',
  transition: `grid-template-rows ${bandReveal}`,
})
export const bandSpaceHidden = style({ gridTemplateRows: '0fr' })
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

export const switcherRow = style([
  segmentRow,
  {
    padding: `${BAND_PAD_Y} ${HEAD_PAD_R} ${BAND_PAD_Y} ${HEAD_PAD_L}`,
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
  animationDuration: 'var(--duration-base)',
  animationTimingFunction: 'var(--ease-base)',
})

export const spacer = style({ flex: '1 1 auto' })

export const newViewReveal = style({
  display: 'inline-flex',
  opacity: 0,
  transition: 'opacity var(--duration-fast) var(--ease-base)',
})
globalStyle(`${switcherRow}:hover ${newViewReveal}`, { opacity: 1 })
globalStyle(`${newViewReveal} ${accessoryButton}`, { color: c.label.secondary })

globalStyle(`${tile}:hover ${settingsBtn}`, { opacity: 1 })

export const bandLock = style([titleActionFade, { display: 'inline-flex' }])
// The lock's own visibility governs it, not the tile-hover reveal its button class carries.
globalStyle(`${bandLock} ${settingsBtn}`, { opacity: 1 })

export const listPane = style({ minWidth: 150 })

export const body = style({
  flex: '1 1 auto',
  minWidth: 0,
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
  marginTop: `calc(-1 * ${FADE_RISE})`,
  paddingTop: FADE_RISE,
  transition: `margin-top ${bandReveal}, padding-top ${bandReveal}`,
  vars: { '--over-scroll-fade': FADE_RISE },
})

export const bodyFlush = style({
  marginTop: 0,
  paddingTop: BAND_PAD_Y,
  vars: { '--over-scroll-fade': BAND_PAD_Y },
})

globalStyle(`${body} .table-view`, {
  vars: { '--zoom': `var(--view-embed-zoom, ${viewEmbedZoom(EMBED_SCALE_DEFAULT)})` },
})

globalStyle(`${body} .cards-view`, {
  vars: { '--zoom': `var(--embed-zoom, ${embedZoom(EMBED_SCALE_DEFAULT)})` },
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
