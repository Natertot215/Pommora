import { style } from '@vanilla-extract/css'
import { STATE_OPACITY, vars } from '../../Tokens/color.css'
import { font, text } from '../../Tokens/typography.css'

const c = vars.color

export const trail = style([
  text.caption.standard,
  {
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    color: c.label.secondary,
    vars: { '--nav-trail-glyph': c.label.tertiary },
  },
])

export const option = style({
  color: c.label.control,
  vars: { '--nav-trail-glyph': c.label.secondary },
})

export const segment = style({
  appearance: 'none',
  border: 0,
  background: 'none',
  padding: 0,
  font: 'inherit',
  color: 'inherit',
  cursor: 'default',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  flexShrink: 0,
  selectors: {
    'button&:hover': {
      color: c.label.control,
      vars: { '--nav-trail-glyph': c.label.control },
    },
  },
})

export const glyph = style({
  flex: 'none',
  color: `var(--nav-trail-glyph, ${c.label.tertiary})`,
})

export const chevron = style({
  flex: 'none',
  alignSelf: 'center',
  margin: '0 4px',
  fontSize: font.scale.control.size,
  fontWeight: font.weight.bold,
  color: c.label.tertiary,
})

export const chevronSmall = style({ fontSize: font.scale.caption.size })

export const ghost = style({
  opacity: STATE_OPACITY.inactive,
  selectors: { 'button&:hover': { opacity: 1 } },
})
