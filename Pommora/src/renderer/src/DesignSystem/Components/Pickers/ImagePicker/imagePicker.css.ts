import { style } from '@vanilla-extract/css'
import { text, vars } from '../../../Tokens'
import { stack } from '../../../Tokens/stack'
import { accessoryButton, detail } from '../../Menu/menu.css'

const c = vars.color

// How far the corner glyphs sit in from the frame's edges — the same inset on all three sides.
const CORNER_INSET = '8px'

export const backdrop = style({
  position: 'fixed',
  inset: 0,
  zIndex: stack.top.floating,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: c.state.muted,
})

export const panel = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '14px',
  padding: '18px',
  borderRadius: '12px',
  border: `1px solid ${c.separator.border}`,
})

/** The frame the image is dragged inside — it holds the seat and the dimmed room around it. */
export const viewport = style({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '8px',
  background: c.fill.tertiary,
  cursor: 'grab',
  touchAction: 'none',
  userSelect: 'none',
})
export const grabbing = style({ cursor: 'grabbing' })

/** The whole image, dimmed and blurred — the part spilling past the seat, still in view. */
export const dimImage = style({
  position: 'absolute',
  objectFit: 'fill',
  filter: 'blur(2px) brightness(0.4)',
  pointerEvents: 'none',
})

/** The seat itself — ringed and fixed. It clips the sharp image and paints the crop's own fill
 *  wherever the image doesn't reach. */
export const seatBox = style({
  position: 'absolute',
  overflow: 'hidden',
  border: `1.5px solid ${c.label.control}`,
  pointerEvents: 'none',
})

/** The bright image inside the seat, at the same rect as the dimmed one behind it. */
export const seatImage = style({
  position: 'absolute',
  objectFit: 'fill',
})

/** The Reset / Background glyphs in the frame corners — label-secondary over the accessory look. */
const cornerGlyph = style([
  accessoryButton,
  {
    position: 'absolute',
    bottom: CORNER_INSET,
    selectors: { '&&&': { color: c.label.secondary } },
  },
])
export const cornerGlyphStart = style([cornerGlyph, { left: CORNER_INSET }])
export const cornerGlyphEnd = style([cornerGlyph, { right: CORNER_INSET }])

export const message = style([text.footnote.standard, { color: c.label.secondary }])

/** The zoom row spans the frame width so the strip fills it, the readout riding at its end. */
export const sliderRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
})

export const zoomReadout = style([detail, { color: c.label.secondary }])

export const actions = style({
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  justifyContent: 'flex-end',
})

export const pathField = style({ flex: 1, minWidth: 0, overflow: 'hidden' })
