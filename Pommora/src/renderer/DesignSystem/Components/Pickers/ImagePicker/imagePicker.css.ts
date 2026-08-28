import { globalStyle, style } from '@vanilla-extract/css'
import { strip } from '../../Controls/Slider/slider.css'
import { text, vars } from '../../../Tokens'
import { stack } from '../../../Tokens/stack'
import { accessoryButton, detail, rowBox } from '../../../Menus/menu-base.css'

const c = vars.color

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
  border: `var(--width-100) solid ${c.border.base}`,
})

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

export const dimImage = style({
  position: 'absolute',
  objectFit: 'fill',
  filter: 'blur(2px) brightness(0.4)',
  pointerEvents: 'none',
})

export const seatBox = style({
  position: 'absolute',
  overflow: 'hidden',
  border: `var(--width-150) solid ${c.label.control}`,
  pointerEvents: 'none',
})

export const seatImage = style({
  position: 'absolute',
  objectFit: 'fill',
})

const cornerGlyph = style([
  accessoryButton,
  {
    position: 'absolute',
    bottom: CORNER_INSET,
    color: c.label.secondary,
  },
])
export const cornerGlyphStart = style([cornerGlyph, { left: CORNER_INSET }])
export const cornerGlyphEnd = style([cornerGlyph, { right: CORNER_INSET }])

export const message = style([text.footnote.standard, { color: c.label.secondary }])

export const sliderRow = style([rowBox, { gap: '10px', paddingInline: 0 }])
globalStyle(`${sliderRow} ${strip}`, { flex: 1, width: 'auto' })

export const zoomReadout = style([detail, { color: c.label.secondary }])

export const actions = style({
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  justifyContent: 'flex-end',
})

export const pathField = style({ flex: 1, minWidth: 0, overflow: 'hidden' })
