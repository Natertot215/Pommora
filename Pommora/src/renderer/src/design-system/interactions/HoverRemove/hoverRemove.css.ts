import { style } from '@vanilla-extract/css'

// ═══════════════════════════════════════════════════════════════════════════
// § HOVER-REVEALED REMOVE — the × and, optionally, the label tail that melts
// beneath it. LOAD-BEARING: masks STATIC from mount, reveals flip OPACITIES
// only, the wrapped label is pointer-inert. Any change here runs the reveal
// matrix — computed styles lie for this bug class; only live hovers are truth.
// ═══════════════════════════════════════════════════════════════════════════

/** The element the × is positioned against, and the alternate hover source. */
export const host = style({ position: 'relative' })

/** The ×. `--hover-remove-ink` lets a host paint it in its own color — a neutral-filled label
 *  whose inherited text mix would read colorless. */
export const removeButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: 0,
  border: 'none',
  background: 'none',
  color: 'var(--hover-remove-ink, inherit)',
  cursor: 'pointer',
  opacity: 0,
  transition: 'opacity var(--duration-fast) var(--ease-standard)',
  selectors: {
    // Keyboard parity: the click gate reads computed opacity, so without this a focused × is a
    // tab stop whose Enter can never remove — it falls through to the host.
    '&:focus-visible': { opacity: 1 },
  },
})

/** Revealed by the host's hover — the whole tab surfaces its close. */
export const revealFromHost = style({
  selectors: { [`${host}:hover &`]: { opacity: 1 } },
})

/** The self-revealing seat: the host's right third, so the zone that reveals the × is always easy
 *  to hit. Geometry and reveal source are one decision — a × only its own hover reveals has to be
 *  big enough to find, and the rest of the host stays untouched by the pointer. */
export const removeZone = style({
  position: 'absolute',
  top: 0,
  right: 0,
  height: '100%',
  width: '33%',
  minWidth: '16px',
  zIndex: 1,
  justifyContent: 'flex-end',
  padding: '0 2.5px 0 0',
  selectors: {
    '&:hover': { opacity: 1 },
  },
})

/** Two perfectly-stacked copies of the text crossfade over one ramp ending at the ×'s left edge,
 *  so the letters smear into the clear zone it floats in. */
const crispRamp =
  'linear-gradient(to right, transparent 0, #000000 var(--over-scroll-fade, 0px), #000000 calc(100% - 18px), transparent calc(100% - 8px))'
const blurRamp =
  'linear-gradient(to right, transparent calc(100% - 18px), #000000 calc(100% - 8px))'

/** The label box. Wears `overScrollUnmasked` beside this: a mask here would erase every
 *  descendant, the twins included. Pointer-inert under a host, so hovering the label body does
 *  nothing — and if it ever LEFT :hover in the frame that flips the reveal, Chromium would drop
 *  the reveal's repaint beneath it. */
export const labelBox = style({
  position: 'relative',
  selectors: {
    [`${host} &`]: { pointerEvents: 'none' },
  },
})

// The reveal is keyed on the ×'s own :hover through a SIBLING combinator (the × precedes the
// label in the DOM), and it may only ever flip OPACITIES. Chromium drops the repaint of any
// mask-image change on this inline text (none→gradient AND stop-swap alike) unless the restyle
// rides an ancestor :hover — `:has()`, sibling selectors, class toggles, and inline styles all
// compute the mask without painting it. Static masks + opacity flips paint everywhere.
const reveal = `${removeButton}:hover ~ ${labelBox} &`

/** The real text — swapped out for the pre-masked twins the instant the × zone is hovered (no
 *  transition: the melt twin is pixel-identical where its mask is opaque, so a crossfade would
 *  only dim the stack mid-flight). `position: relative` is load-bearing — it gives the span its
 *  own paint layer, without which the sibling-keyed opacity flip computes but never repaints. */
export const labelText = style({
  position: 'relative',
  selectors: { [reveal]: { opacity: 0 } },
})

/** The crisp melt twin, clamped to the label box so a truncated label melts at its clip edge
 *  instead of ending in a bare cut. */
export const labelMelt = style({
  position: 'absolute',
  top: 0,
  left: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  maskImage: crispRamp,
  WebkitMaskImage: crispRamp,
  opacity: 0,
  pointerEvents: 'none',
  selectors: { [reveal]: { opacity: 1 } },
})

/** The blurred twin — same string and font, overlaid at the text origin so the metrics line up
 *  glyph-for-glyph, but painted in the GROUND so the tail melts into the host rather than hazing
 *  in the text color. Deliberately NOT transitioned: a fade on a masked element can strand its
 *  final un-hover frame, leaving a smear on the resting host. */
export const labelBlur = style({
  position: 'absolute',
  top: 0,
  left: 0,
  whiteSpace: 'nowrap',
  color: 'var(--melt-ground)',
  filter: 'blur(2px)',
  maskImage: blurRamp,
  WebkitMaskImage: blurRamp,
  opacity: 0,
  pointerEvents: 'none',
  selectors: { [reveal]: { opacity: 1 } },
})
