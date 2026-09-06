// NOT `.css.ts`: vanilla-extract stylesheets may only export plain values.
import { duration, easing } from '../Animations/motion'
import { tintAt } from '../Theme/colors'

/** KNOB — a menu row's ring weight; selection and focus both paint at it. */
export const ROW_RING = 2

/** The channel's one spelling. */
export const FIELD_RING_VAR = 'var(--field-ring, transparent)'

/** Compose this rather than restating the shadow, so channel and geometry can't drift. */
export const fieldRing = (width = 2): string => `inset 0 0 0 ${width}px ${FIELD_RING_VAR}`

/** No transition: a state, not a gesture. */
export const errorRing = (): { vars: Record<string, string> } => ({
  vars: { '--field-ring': tintAt('var(--error)', 'primary') },
})

/** Restating the transition and `:focus` var per site is how focus tone drifts. */
export const focusRing = (
  scope: 'self' | 'within' = 'self',
): {
  transition: string
  selectors: Record<string, { outline: 'none'; vars: Record<string, string> }>
} => ({
  transition: `box-shadow ${duration.fast} ${easing.baseEase}`,
  selectors: {
    [scope === 'within' ? '&:focus-within' : '&:focus, &:focus-visible']: {
      outline: 'none',
      vars: { '--field-ring': tintAt('var(--accent)', 'secondary') },
    },
  },
})
