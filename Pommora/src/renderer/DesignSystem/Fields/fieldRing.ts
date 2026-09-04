// A plain module, NOT `.css.ts`: vanilla-extract only lets a stylesheet export plain values, so a helper that BUILDS a declaration lives beside the stylesheet rather than inside it — `.css.ts` files still import from here freely; the restriction is only on what a stylesheet exports.
import { duration, easing } from '@renderer/Animation/motion'
import { tintAt } from '@renderer/DesignSystem/Tokens/tint'

/** KNOB — a menu ROW's ring weight. Selection and keyboard focus both paint at this width and differ
 *  only in tone, so one can never read as heavier than the other. */
export const ROW_RING = 2

/** The channel's one spelling — every ring fragment reads the color through this. */
export const FIELD_RING_VAR = 'var(--field-ring, transparent)'

/** What `--field-ring` paints, at a given thickness — compose this instead of restating the
 *  shadow, so the channel and its geometry can never drift apart. */
export const fieldRing = (width = 2): string => `inset 0 0 0 ${width}px ${FIELD_RING_VAR}`

/** The error preset on the channel — no transition: a state, not a gesture. */
export const errorRing = (): { vars: Record<string, string> } => ({
  vars: { '--field-ring': tintAt('var(--error)', 'primary') },
})

/** A style FRAGMENT spread into a field's own rule — stating the transition and the `:focus` var
 *  separately at each site is exactly how a focus tone drifts between surfaces. */
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
