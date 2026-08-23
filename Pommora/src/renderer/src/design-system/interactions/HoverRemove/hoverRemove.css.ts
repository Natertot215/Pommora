import { style } from '@vanilla-extract/css'

// LOAD-BEARING: masks STATIC from mount, reveals flip OPACITIES only, the label pointer-inert.
// Any change here runs the reveal matrix — [[Build-Gotchas]] §Label Melt.

export const host = style({ position: 'relative' })

/** `--hover-remove-ink` lets a neutral-filled host paint the × in its own color. */
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
    // The click gate reads computed opacity, so a focused × has to be opaque to be pressable.
    '&:focus-visible': { opacity: 1 },
  },
})

/** The whole host surfaces the ×. */
export const revealFromHost = style({
  selectors: { [`${host}:hover &`]: { opacity: 1 } },
})

/** The host's right third: a × only its own hover reveals has to be big enough to find. */
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

/** Two stacked copies crossfade over one ramp ending at the ×'s left edge. */
const crispRamp =
  'linear-gradient(to right, transparent 0, #000000 var(--over-scroll-fade, 0px), #000000 calc(100% - 18px), transparent calc(100% - 8px))'
const blurRamp =
  'linear-gradient(to right, transparent calc(100% - 18px), #000000 calc(100% - 8px))'

/**
 * A twin sits inside the scroller, so its box rides the WINDOW the label is currently showing while
 * its text stays put — `left` walks the box along, the matching negative indent walks the string
 * back. The ramp then reads in the box it was written for, whatever the label is scrolled to.
 */
const overWindow = {
  left: 'var(--os-scroll, 0px)',
  textIndent: 'calc(-1 * var(--os-scroll, 0px))',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
} as const

/** Wears `overScrollUnmasked`: a mask here erases every descendant, the twins included. Pointer-
 *  inert, or leaving :hover in the reveal's frame drops its repaint. */
export const labelBox = style({
  position: 'relative',
  selectors: {
    [`${host} &`]: { pointerEvents: 'none' },
  },
})

// A SIBLING combinator — the × precedes the label in the DOM — flipping OPACITIES only. Any
// mask-image change on this text computes without painting; static masks + opacity flips don't.
const reveal = `${removeButton}:hover ~ ${labelBox} &`

/** `position: relative` is load-bearing — its own paint layer, or the flip never repaints. No
 *  transition: a crossfade would only dim the stack mid-flight. */
export const labelText = style({
  position: 'relative',
  selectors: { [reveal]: { opacity: 0 } },
})

/** `max-width` makes the ramp's `100%` the label BOX rather than the whole string. */
export const labelMelt = style({
  position: 'absolute',
  top: 0,
  ...overWindow,
  maxWidth: '100%',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  maskImage: crispRamp,
  WebkitMaskImage: crispRamp,
  opacity: 0,
  pointerEvents: 'none',
  selectors: { [reveal]: { opacity: 1 } },
})

/** Painted in the GROUND, so the tail melts into the host rather than hazing in the text color.
 *  NOT transitioned: a fade on a masked element can strand its final frame as a smear. */
export const labelBlur = style({
  position: 'absolute',
  top: 0,
  ...overWindow,
  maxWidth: '100%',
  whiteSpace: 'nowrap',
  color: 'var(--melt-ground)',
  filter: 'blur(2px)',
  maskImage: blurRamp,
  WebkitMaskImage: blurRamp,
  opacity: 0,
  pointerEvents: 'none',
  selectors: { [reveal]: { opacity: 1 } },
})
