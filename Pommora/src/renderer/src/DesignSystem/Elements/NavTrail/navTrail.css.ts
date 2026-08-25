import { style } from '@vanilla-extract/css'
import { STATE_OPACITY, vars } from '../../Tokens/color.css'

const c = vars.color

export const trail = style({
  display: 'flex',
  alignItems: 'center',
  minWidth: 0,
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
  gap: '3px',
  minWidth: 0,
  selectors: {
    'button&:hover': { color: c.label.secondary },
  },
})

export const glyph = style({
  flex: 'none',
  color: `var(--nav-trail-glyph, ${c.label.tertiary})`,
})

export const chevron = style({ margin: '0 4px' })

export const ghost = style({
  opacity: STATE_OPACITY.inactive,
  selectors: { 'button&:hover': { opacity: 1 } },
})

export const emphasized = style({ color: c.label.tertiary })

export const current = style({
  color: c.label.control,
  vars: { '--nav-trail-glyph': c.label.control },
})
