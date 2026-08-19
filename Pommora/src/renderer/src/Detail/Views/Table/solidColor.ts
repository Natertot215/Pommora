import { chipColorFor } from '@renderer/design-system/tokens/colorMap'
import { cellColor } from '@renderer/design-system/tokens/ramp'

/** The CSS colour a palette key resolves to: its stored cell, or the runtime system accent when
 *  unset ("Default"). One source for the link cell/editor AND the checkbox cell/editor. */
export function solidColorCss(color: string | undefined): string {
  if (!color) return 'var(--system-accent)'
  const key = chipColorFor(color)
  return cellColor(key === 'default' ? 'grey-4' : key)
}
