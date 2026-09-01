import { vars as colorVars } from './color.css'
import { font, text } from './typography.css'
import { size, type IconSize, type ButtonSize } from './size.css'
import { mixAt, tintAt, TINT_STEPS, type TintStep } from './tint'
import './theme-vars.css' // bridges tokens → stable CSS vars for plain-CSS consumers

/** The single token object — vars.color.*, vars.font.*, vars.size.*. */
export const vars = {
  ...colorVars,
  font,
  size,
}

export type { IconSize, ButtonSize }
export { text }

/** The tint ladder and the mix it feeds — a consumer names a step, never a percentage. */
export { mixAt, tintAt, TINT_STEPS }
export type { TintStep }
/** The stacking ladders — shell (window frame), local (own siblings), top (fixed / portalled).
 *  Plain CSS reads the same steps as `--z-*`. */
export { stack } from './stack'
