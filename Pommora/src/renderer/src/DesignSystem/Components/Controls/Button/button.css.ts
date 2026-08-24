import { globalStyle, style, styleVariants } from '@vanilla-extract/css'
import { titleReveal } from '../../../Animation/animations.css'
import { TINT_STEPS, text, tintAt, vars } from '../../../Tokens'

const c = vars.color

export const OUTLINE_W = '1.25px'
export const LABEL_PAD_X = '12px' // KNOB

export const container = style({
  display: 'flex',
  alignItems: 'center',
  width: 'fit-content',
  overflow: 'hidden',
})

export const button = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0,
  flexShrink: 0,
  boxSizing: 'border-box',
  padding: 0,
  border: `${OUTLINE_W} solid transparent`,
  outline: 'none',
  background: 'var(--button-fill)',
  color: 'var(--button-ink)',
  whiteSpace: 'nowrap',
  cursor: 'default',
  transition:
    'background var(--duration-fast) var(--ease-base), color var(--duration-fast) var(--ease-base), opacity var(--duration-fast) var(--ease-base)',
  selectors: {
    '&:hover:not(:disabled)': {
      background: `linear-gradient(${c.state.hover}, ${c.state.hover}), var(--button-fill)`,
    },
    '&:disabled': { opacity: 'var(--state-inactive)' },
  },
})

const accent = 'var(--accent)'
const error = 'var(--error)'

export const type = styleVariants({
  base: {
    vars: {
      '--button-fill': 'transparent',
      '--button-ink': 'currentColor',
      '--button-outline': c.label.quaternary,
    },
    selectors: { '&:disabled': { opacity: 1, color: c.label.tertiary } },
  },
  tinted: {
    vars: {
      '--button-fill': tintAt(accent, TINT_STEPS.tertiary),
      '--button-ink': accent,
      '--button-outline': tintAt(accent, TINT_STEPS.quaternary),
    },
  },
  solid: {
    vars: {
      '--button-fill': tintAt(accent, TINT_STEPS.primary),
      '--button-ink': c.label.primary,
      '--button-outline': tintAt(accent, TINT_STEPS.quaternary),
    },
  },
  filled: {
    vars: {
      '--button-fill': c.fill.tertiary,
      '--button-ink': c.label.primary,
      '--button-outline': c.label.quaternary,
    },
  },
  destructive: {
    vars: {
      '--button-fill': tintAt(error, TINT_STEPS.tertiary),
      '--button-ink': tintAt(error, TINT_STEPS.primary),
      '--button-outline': tintAt(error, TINT_STEPS.quaternary),
    },
  },
})

export const outlined = style({ borderColor: 'var(--button-outline)' })

export const revealOnHover = style({
  opacity: 0,
  selectors: { '&:focus-visible': { opacity: 1 } },
})
globalStyle(`[data-reveal-host]:hover ${revealOnHover}`, { opacity: 1 })

export const ghostRest = style({
  opacity: 'var(--state-ghost)',
  selectors: { '&:hover': { opacity: 1 } },
})

export const labelSlot = style({
  display: 'inline-grid',
  gridTemplateColumns: '1fr',
  marginLeft: '6px',
  minWidth: 0,
  transition: `grid-template-columns ${titleReveal}, margin-left ${titleReveal}, opacity ${titleReveal}`,
})

export const labelSlotHidden = style({ gridTemplateColumns: '0fr', marginLeft: 0, opacity: 0 })

export const labelText = style([
  text.control.emphasized,
  { overflow: 'hidden', whiteSpace: 'nowrap' },
])

export const labelOnly = style([text.control.emphasized])
