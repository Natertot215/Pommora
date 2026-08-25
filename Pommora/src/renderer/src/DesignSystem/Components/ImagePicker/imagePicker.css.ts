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

/** The dark, blurred bleed behind the circle (its child paints the same framing, out of focus). */
export const surround = style({
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  filter: 'blur(6px) brightness(0.5)',
  pointerEvents: 'none',
})

export const circleFrame = style({
  position: 'absolute',
  overflow: 'hidden',
  borderRadius: '50%',
})

export const ring = style({
  position: 'absolute',
  border: `1px solid ${c.label.secondary}`,
  pointerEvents: 'none',
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

/** The colour input stays mounted (showPicker throws off-DOM) but out of sight. */
export const colorInput = style({
  position: 'absolute',
  width: 0,
  height: 0,
  opacity: 0,
  pointerEvents: 'none',
})

export const message = style([text.footnote.standard, { color: c.label.secondary }])

export const actions = style({
  display: 'flex',
  gap: '8px',
  alignSelf: 'stretch',
  alignItems: 'center',
  justifyContent: 'flex-end',
})

export const pathField = style({ flex: 1, minWidth: 0 })
