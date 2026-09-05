import { globalStyle, keyframes, style } from '@vanilla-extract/css'
import { titleReveal } from '@renderer/Animation/animations.css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { duration } from '@renderer/Animation'
import { SEGMENT_H, segmentRow, settingsBtn } from '@renderer/Interface/action-band.css'
import { EMBED_SCALE_DEFAULT, embedZoom, viewEmbedZoom } from '@shared/types'

const c = colorVars.color

const HEAD_PAD_L = '14px'
const HEAD_PAD_R = '12px'

// KNOB — how far the scroll region rises BEHIND the transparent switcher so rows flow UNDER the whole
// toolbar and dissolve at the title divider (not just under its lower half), matching the switcher's
// full height.
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

/** Two-phase title hide/reveal, both phases on the segments' titleReveal timing. Hiding slides the
 *  title left THEN collapses the row's space upward; revealing opens the space THEN slides the
 *  title back in. */
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
export const titleSpaceInner = style({ minHeight: 0, overflow: 'hidden' })

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
    padding: `6px ${HEAD_PAD_R} 6px ${HEAD_PAD_L}`,
    flex: 'none',
    position: 'relative',
    zIndex: 1, // paints over the scroll region that rises behind it (FADE_RISE)
  },
])

// View-switch slide (the sidebar mode-switch's translate + the shell-move tokens): the incoming view
// slides in from the clicked pill's side — `--slide-from` carries the signed offset (+ from the right,
// − from the left), re-triggered by re-keying the wrapper on the active index.
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

globalStyle(`${tile}:hover ${settingsBtn}`, { opacity: 1 })

export const listPane = style({ minWidth: 150 })

export const body = style({
  flex: '1 1 auto',
  minWidth: 0,
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
  marginTop: `calc(-1 * ${FADE_RISE})`,
  paddingTop: FADE_RISE,
  vars: { '--over-scroll-fade': FADE_RISE },
})

globalStyle(`${body} .table-view, ${body} .view-empty`, {
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
