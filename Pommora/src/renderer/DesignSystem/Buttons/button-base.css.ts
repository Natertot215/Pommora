import { globalStyle, style, styleVariants } from '@vanilla-extract/css'
import { titleReveal } from '@renderer/DesignSystem/Animation/animations.css'
import { type ButtonSize, text, tintAt, vars } from '@renderer/DesignSystem/Tokens'

const c = vars.color
const icon = vars.size.icon

const OUTLINE_W = 'var(--width-125)'

// § SIZE — every button dimension, one place. A `size` class sets the --btn-* bundle; `.button`, the
// run container, and the divider read it. `inRun` squares the pill's corners.
type SizeSpec = {
  height: string
  padX: string
  labelPadX: string
  radius: string
  dividerH: string
  icon: string
}
const SIZE: Record<ButtonSize, SizeSpec> = {
  'button-inline': {
    height: '20px',
    padX: '2px',
    labelPadX: '4px',
    radius: '6px',
    dividerH: '12px',
    icon: icon.control,
  },
  'button-small': {
    height: '24px',
    padX: '8px',
    labelPadX: '12px',
    radius: '6px',
    dividerH: '14px',
    icon: icon.body,
  },
  'button-medium': {
    height: '28px',
    padX: '6px',
    labelPadX: '10px',
    radius: '10px',
    dividerH: '16px',
    icon: icon.headline,
  },
  'button-large': {
    height: '32px',
    padX: '8px',
    labelPadX: '12px',
    radius: '12px',
    dividerH: '18px',
    icon: icon.headline,
  },
}

export const container = style({
  display: 'flex',
  alignItems: 'center',
  width: 'fit-content',
  overflow: 'hidden',
  height: 'var(--btn-h)',
  borderRadius: 'var(--btn-radius)',
})

export const button = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0,
  flexShrink: 0,
  boxSizing: 'border-box',
  height: 'var(--btn-h)',
  borderRadius: 'var(--btn-radius)',
  paddingBlock: 0,
  paddingInline: 'var(--btn-pad)',
  fontSize: 'var(--btn-icon)',
  border: 'none',
  outline: 'none',
  background: 'var(--button-fill)',
  color: 'var(--button-ink)',
  whiteSpace: 'nowrap',
  cursor: 'default',
  transition: `background var(--duration-fast) var(--ease-base), color var(--duration-fast) var(--ease-base), opacity var(--duration-fast) var(--ease-base), padding-inline ${titleReveal}`,
  selectors: {
    '&:hover:not(:disabled)': {
      background: `linear-gradient(${c.state.hover}, ${c.state.hover}), var(--button-fill)`,
    },
    '&:disabled': { opacity: 'var(--state-inactive)' },
  },
})

/** The size bundle a button and its run wear — one class carries every --btn-* the geometry reads. */
export const size = styleVariants(SIZE, (s) => ({
  vars: {
    '--btn-h': s.height,
    '--btn-pad': s.padX,
    '--btn-label-pad': s.labelPadX,
    '--btn-radius': s.radius,
    '--btn-div-h': s.dividerH,
    '--btn-icon': s.icon,
  },
}))

/** A button inside a Segmented run squares its corners — the run reads as one pill (the container
 *  clips the outer corners) split by dividers, not a row of separate rounded boxes. Defined AFTER
 *  `size` so the border-radius wins the cascade tie. */
export const inRun = style({ borderRadius: 0 })

/** A labeled button pads wider than a bare icon. */
export const labeled = style({ vars: { '--btn-pad': 'var(--btn-label-pad)' } })

/** The run divider, at its size's divider height (inherited from the container's size class). */
export const dividerBar = style({ height: 'var(--btn-div-h)' })

// The three heights other surfaces align against (a tab row, a sidebar rail), sourced from the same
// numbers so a button and what rings it can never drift.
globalStyle(':root', {
  vars: {
    '--button-small-height': SIZE['button-small'].height,
    '--button-medium-height': SIZE['button-medium'].height,
    '--button-large-height': SIZE['button-large'].height,
  },
})

/** Held down — a toggle that is on, a trigger whose menu is open. The selected wash holds under
 *  hover so an engaged button doesn't lighten further. */
export const pressed = style({
  selectors: {
    '&, &:hover:not(:disabled)': {
      background: `linear-gradient(${c.state.selected}, ${c.state.selected}), var(--button-fill)`,
    },
  },
})

const accent = 'var(--accent)'
const error = 'var(--error)'

export const type = styleVariants({
  base: {
    vars: {
      '--button-fill': 'transparent',
      '--button-ink': 'currentColor',
      '--button-outline': c.border.base,
    },
    selectors: { '&:disabled': { opacity: 1, color: c.label.tertiary } },
  },
  tinted: {
    vars: {
      '--button-fill': tintAt(accent, 'tertiary'),
      '--button-ink': accent,
      '--button-outline': tintAt(accent, 'quaternary'),
    },
  },
  solid: {
    vars: {
      '--button-fill': tintAt(accent, 'primary'),
      '--button-ink': c.label.primary,
      '--button-outline': tintAt(accent, 'quaternary'),
    },
  },
  filled: {
    vars: {
      '--button-fill': c.fill.secondary,
      '--button-ink': c.label.primary,
      '--button-outline': c.border.base,
    },
  },
  destructive: {
    vars: {
      '--button-fill': tintAt(error, 'tertiary'),
      '--button-ink': tintAt(error, 'primary'),
      '--button-outline': tintAt(error, 'quaternary'),
    },
  },
})

export const outlined = style({ boxShadow: `inset 0 0 0 ${OUTLINE_W} var(--button-outline)` })

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
