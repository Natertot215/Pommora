import type { ChipColorName } from '@renderer/design-system/tokens/chip.css'
import { chipColorFor } from '@renderer/design-system/tokens/colorMap'
import { cellColor } from '@renderer/design-system/tokens/ramp'

/** The CSS color a palette key resolves to: its stored cell, or the runtime system accent when
 *  unset ("Default"). One source for the link cell/editor AND the checkbox cell/editor. */
export function solidColorCss(color: string | undefined): string {
  if (!color) return 'var(--system-accent)'
  const key = chipColorFor(color)
  return cellColor(key === 'default' ? 'grey-4' : key)
}

/** A palette key as the pair every color control wants: the ramp cell the picker rings, and the CSS
 *  it paints. `fallback` is what an unset color follows — the app accent for a checkbox, the OS
 *  accent for a link — and resolves to no cell, so the picker rings nothing and the accent's own
 *  cell stays assignable. */
export function resolveColor(
  color: string | undefined,
  fallback: string,
): { name: ChipColorName; css: string } {
  if (!color) return { name: 'accent', css: fallback }
  return { name: chipColorFor(color), css: solidColorCss(color) }
}
