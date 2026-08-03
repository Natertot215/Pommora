import { globalStyle, keyframes, style } from '@vanilla-extract/css'
import { titleReveal } from '../design-system/animations.css'
import { vars as colorVars } from '../design-system/tokens/color.css'
import { duration } from '../design-system/tokens/motion'
import { SEGMENT_H, segmentRow, settingsBtn } from '../Detail/ActionBand.css'
import { EMBED_ZOOM, VIEW_EMBED_ZOOM } from '../Embeds/embedScale'

const c = colorVars.color

// The header's horizontal insets — shared by the title row, the switcher row, and the title divider,
// so the divider aligns with the content instead of bleeding to the block edges.
const HEAD_PAD_L = '14px'
const HEAD_PAD_R = '12px'

// KNOB — how far the scroll region rises BEHIND the transparent switcher so rows flow UNDER the whole
// toolbar and dissolve at the title divider (not just under its lower half), matching the switcher's
// full height. The scroll-fade (--edge-fade below) spans the same distance so a row is fully gone by
// the divider.
const FADE_RISE = `calc(${SEGMENT_H} + 12px)`

export const tile = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
})

/** The title row — the editable heading over the switcher; its bottom hairline is the header's
 *  ONLY divider (none under the pills, none once the title row is hidden). The row establishes
 *  markdownPM's editor font-size as the em base, so the `.md-hN` class on the title resolves its
 *  `1.2em` (etc.) to the exact px a markdownPM heading would — same code, uniform result. */
export const titleRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: `13px ${HEAD_PAD_R} 8px ${HEAD_PAD_L}`,
  flex: 'none',
  fontSize: 'var(--editor-font-size, 15px)',
  position: 'relative',
  // The divider inset to the header padding (not a full-bleed border), so it aligns with the content.
  '::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: HEAD_PAD_L,
    right: HEAD_PAD_R,
    height: '1px',
    background: c.separator.segment,
  },
})

/** Two-phase title hide/reveal, both phases on the segments' titleReveal timing. Hiding slides the
 *  title left THEN collapses the row's space upward; revealing opens the space THEN slides the
 *  title back in. A transition reads its delay from the DESTINATION state's rules, so each
 *  direction re-orders the phases by itself: the shown state delays the slide, the hidden state
 *  delays the collapse. The slide is a literal translate (the title-icon reveal's treatment at
 *  heading scale) — a width morph reads as motion only when the box hugs its content, and this
 *  row is flex-stretched. */
export const titleSlide = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flex: '1 1 auto',
  minWidth: 0,
  transition: `transform ${titleReveal}, opacity ${titleReveal}`,
  transitionDelay: duration.dropdown,
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
  transitionDelay: duration.dropdown,
})
export const titleSpaceInner = style({ minHeight: 0, overflow: 'hidden' })

/** The title text + its in-place rename input. Size + weight come from the `.md-hN` class the caller
 *  appends (markdownPM's own heading code); this carries only colour, truncation, and the input reset. */
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

/** The switcher row — the ActionBand segments (+ New View) leading, the config affordance trailing
 *  when the title row is hidden and this line is the whole header. */
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
  animationTimingFunction: 'var(--ease-standard)',
})

export const spacer = style({ flex: '1 1 auto' })

/** The switcher's New-View "+" — hidden until the toolbar area is hovered (the group-header "+" idiom),
 *  opacity-only so the pills never reflow. Reveal rides switcherRow hover, not whole-tile. */
export const newViewReveal = style({
  display: 'inline-flex',
  opacity: 0,
  transition: 'opacity var(--duration-fast) var(--ease-standard)',
})
globalStyle(`${switcherRow}:hover ${newViewReveal}`, { opacity: 1 })

// The embed binds the ActionBand settings affordance's reveal to whole-tile hover.
globalStyle(`${tile}:hover ${settingsBtn}`, { opacity: 1 })

/** The dropdown-mode view list — the ViewPane's row anatomy inside a PickerMenu. */
export const listPane = style({ minWidth: 150 })

// The table gutter (row grips + group chevrons strip) resolves from the root --fold-gutter token,
// so an embedded table shares the page lane without a host rule reaching in.
//
// SCROLL MODEL (edge-release): the rows scroll vertically inside the body (the header rows stay pinned
// above it), and the default scroll-chaining releases to the page once the table bottoms out. A table
// that fits its tile has nothing to scroll, so the wheel passes straight through to the page — only a
// genuinely-overflowing table ever captures. Horizontal stays the table's own (.table-view overflow-x).
export const body = style({
  flex: '1 1 auto',
  minWidth: 0,
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
  // Rise behind the switcher so the top scroll-fade dissolves rows AT the pill midline: the negative
  // margin pulls the scroll box up under the pills, the matching padding keeps the first row clear of them.
  marginTop: `calc(-1 * ${FADE_RISE})`,
  paddingTop: FADE_RISE,
  // The top scroll-fade spans the toolbar height (matches FADE_RISE), so a row dissolves fully as it
  // rises under the transparent switcher, disappearing at the title divider.
  vars: { '--edge-fade': FADE_RISE },
})

/** The fixed embed zoom lands on the table's own token scope — the var is declared ON
 *  .table-view (table-tokens.css), so only a descendant-scoped redeclaration outranks it. */
globalStyle(`${body} .table-view, ${body} .table-empty`, {
  vars: { '--zoom': String(VIEW_EMBED_ZOOM) },
})

/** Cards ride the SAME embed-zoom seam (.cards-view reads `zoom: --zoom * --block-zoom`), but take the
 *  BASE EMBED_ZOOM — not the table's VIEW_EMBED_ZOOM, whose 15/13 factor normalizes the table's 13px
 *  body. Cards have no single body-font base, so they scale like a page embed instead of inheriting the
 *  table's text-normalization; without this the card grid rendered at full detail-pane size in a tile. */
globalStyle(`${body} .cards-view`, {
  vars: { '--zoom': String(EMBED_ZOOM) },
  // The tail seam — the last card row clears the tile's bottom edge by the seam law's shoulder,
  // matching the view's top seam. Embed-owned: a full-page pane's inset already clears the bottom.
  paddingBottom: 'var(--band-clearance)',
})

/** The CARD GRIDS alone align to the header inset — the same line the title divider and pills
 *  run — while the disclosure bands lead in by the same gutter carve the embedded table's bands
 *  do, so both view kinds start their headings from one X. The divisions unwind the cards' zoom
 *  so each inset holds in real px at any block zoom. */
globalStyle(`${body} .cards-view .cards-grid, ${body} .cards-view .set-cards-row`, {
  paddingLeft: `calc(${HEAD_PAD_L} / (var(--zoom, 1) * var(--block-zoom, 1)))`,
  paddingRight: `calc(${HEAD_PAD_R} / (var(--zoom, 1) * var(--block-zoom, 1)))`,
})
// GLYPH parity with the embedded table's bands, not box parity: the table floats its chevron out
// of flow (glyph flush at its 20px-real grid start), while the cards chevron is in flow ahead of
// the glyph — so the cards lead subtracts that chevron cluster (the twisty's 12px Icon + the band
// gap), in-zoom AFTER the division; the fold-gutter anchor alone holds in real px.
globalStyle(`${body} .cards-view .group-band-row`, {
  paddingLeft: `calc(var(--fold-gutter) / (var(--zoom, 1) * var(--block-zoom, 1)) - (12px + var(--cell-icon-gap, 6px)))`,
})

/** Embedded tables shed the column-header band chrome — no heading fill, no divider under it;
 *  the header row reads as bare column labels over the data. */
globalStyle(`${body} .table-head`, { background: 'none', borderBottom: 'none' })

/** The heading strip's leading cap (.col-header:first-child::before) marks the gutter↔Title junction, so
 *  it sits --fold-gutter in — but the embed header insets at HEAD_PAD_L. Pull ONLY the cap out to the
 *  header inset so the strip's left edge lines up under the title + pills; the columns + gutter stay put.
 *  The col-header clips overflow (label truncation), so the first one lets its leading cap escape left. */
globalStyle(`${body} .col-header:first-child`, { overflow: 'visible' })
globalStyle(`${body} .col-header:first-child::before`, {
  // The pseudo lives inside the grid's zoom while HEAD_PAD_L is a real-px inset — divide it out,
  // like the cards rules above, so the cap holds the pill line at any block zoom.
  left: `calc((${HEAD_PAD_L} / (var(--zoom, 1) * var(--block-zoom, 1))) - var(--fold-gutter))`,
})
