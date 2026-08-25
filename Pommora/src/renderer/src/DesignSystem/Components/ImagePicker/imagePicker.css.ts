import { style } from '@vanilla-extract/css'
import { TINT_STEPS, text, tintAt, vars } from '../../Tokens'
import { stack } from '../../Tokens/stack'
import { accessoryButton } from '../Menu/menu.css'

const c = vars.color

export const backdrop = style({
  position: 'fixed',
  inset: 0,
  zIndex: stack.top.floating,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: tintAt(c.system.black, TINT_STEPS.secondary),
})

export const panel = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '14px',
  padding: '18px',
  borderRadius: '12px',
  border: `1px solid ${c.separator.border}`,
  boxShadow: `0 20px 60px ${tintAt(c.system.black, TINT_STEPS.primary)}`,
})

/** The frame the image is dragged inside — a surface fills it while the photo loads. */
export const viewport = style({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '8px',
  background: c.surface.primary,
  cursor: 'grab',
  touchAction: 'none',
  userSelect: 'none',
})
export const grabbing = style({ cursor: 'grabbing' })

/** The whole image, dimmed and blurred behind the crop — what the frame keeps but the seat drops. */
export const dimImage = style({
  position: 'absolute',
  objectFit: 'fill',
  filter: 'blur(2px) brightness(0.4)',
  pointerEvents: 'none',
})

/** The sharp crop — the exact region the seat shows, cut out of the dimmed image and ringed. */
export const cropBox = style({
  position: 'absolute',
  overflow: 'hidden',
  border: `1.5px solid ${c.label.control}`,
  pointerEvents: 'none',
})

/** The bright image inside the crop, offset to line up under the dimmed one behind it. */
export const cropImage = style({
  position: 'absolute',
  objectFit: 'fill',
})

/** The Reset / Background glyphs in the frame corners — label-secondary over the accessory look. */
const cornerGlyph = style([
  accessoryButton,
  {
    position: 'absolute',
    bottom: '8px',
    selectors: { '&&&': { color: c.label.secondary } },
  },
])
export const cornerGlyphStart = style([cornerGlyph, { left: '8px' }])
export const cornerGlyphEnd = style([cornerGlyph, { right: '8px' }])

export const message = style([text.footnote.standard, { color: c.label.secondary }])

/** The zoom row spans the frame width so the strip fills it, the readout riding at its end. */
export const sliderRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
})

export const actions = style({
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  justifyContent: 'flex-end',
})

export const pathField = style({ flex: 1, minWidth: 0, overflow: 'hidden' })
