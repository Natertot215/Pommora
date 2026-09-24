import { vars as colorVars } from './color.css'
import { font, text } from './typography.css'
import { tintAt, TINT_STEPS } from './colors'
import { size, type IconSize, type ButtonSize } from './theme-vars.css'
import './theme-vars.css'

export const vars = {
  ...colorVars,
  font,
  size,
}

export type { IconSize, ButtonSize }
export { text }
export { tintAt, TINT_STEPS }
