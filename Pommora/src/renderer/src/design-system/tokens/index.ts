import { vars as colorVars } from './color.css'
import { font, text } from './typography.css'
import {
  chipPill,
  chipLabel,
  chipFile,
  chipPlain,
  chipContext,
  chipCapsule,
  chipBox,
  chipLabelCap,
  chipBoxGeometry,
  chipColor,
} from './chip.css'
import { size, type IconSize, type ButtonSize } from './size.css'
import { tint, tintAt, TINT_STEPS, type TintStep } from './tint'
import './theme-vars.css' // bridges tokens → stable CSS vars for plain-CSS consumers

/** The single token object — vars.color.*, vars.font.*, vars.size.*. One import: `import { vars,
 *  text, chipPill, chipColor } from '@renderer/design-system/tokens'`. */
export const vars = {
  ...colorVars,
  font,
  size,
}

export type { IconSize, ButtonSize }

/** Composed text-style class names — `text.body.standard`, `text.headline.emphasized`. */
export { text }

/**
 * One class per chip SHAPE, composed with a `chipColor.*`: `${chipPill} ${chipColor.blue}`
 * (status text) · `chipLabel` (select/multi) · `chipContext` (Context references) · `chipCapsule`
 * (icon-only) · `chipBox` (the rounded-square checkbox shape). `tint(base)` is the unified tint's
 * raw recipe. See chip.css.ts.
 */
export {
  chipPill,
  chipLabel,
  chipFile,
  chipPlain,
  chipContext,
  chipCapsule,
  chipBox,
  chipLabelCap,
  chipBoxGeometry,
  chipColor,
  tint,
  tintAt,
  TINT_STEPS,
}
export type { TintStep }
export { duration, easing } from './motion'
/** The stacking ladders — `stack.shell.*` (window frame) · `stack.local.*` (over own siblings) ·
 *  `stack.top.*` (fixed / body-portalled). Plain CSS reads the same steps as `--z-*`. */
export { stack } from './stack'
