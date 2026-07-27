// The `--field-ring` channel's two shared recipes. A plain module, NOT a `.css.ts`: vanilla-extract
// permits a stylesheet to export only plain objects, arrays, strings and numbers, so a helper that
// BUILDS a declaration has to live beside the stylesheet rather than inside it. `.css.ts` files import
// from here freely — the restriction is on what a stylesheet exports, never on what it consumes.
import { duration, easing } from '../tokens/motion'
import { TINT_STEPS, tintAt } from '../tokens/tint'

/** KNOB — a menu ROW's ring weight. Selection and keyboard focus both paint at this width and differ
 *  only in tone, so one can never read as heavier than the other. */
export const ROW_RING = 2

/** THE statement of what `--field-ring` paints, at a given thickness. A surface needing a heavier ring
 *  (a menu row's selection outline) composes this instead of restating the shadow, so the channel and
 *  its geometry can never drift apart. */
export const fieldRing = (width = 1): string =>
  `inset 0 0 0 ${width}px var(--field-ring, transparent)`

/** Focus lights the channel accent — a style FRAGMENT spread into a field's own rule. The transition
 *  and the `:focus` var are one recipe; stating them separately at each site is exactly how a focus
 *  tone drifts between surfaces. `within` is for a wrapper that lights when its inner input focuses. */
export const focusRing = (
  scope: 'self' | 'within' = 'self',
): {
  transition: string
  selectors: Record<string, { outline: 'none'; vars: Record<string, string> }>
} => ({
  transition: `box-shadow ${duration.fast} ${easing.standard}`,
  selectors: {
    [scope === 'within' ? '&:focus-within' : '&:focus, &:focus-visible']: {
      outline: 'none',
      vars: { '--field-ring': tintAt('var(--accent)', TINT_STEPS.secondary) },
    },
  },
})
