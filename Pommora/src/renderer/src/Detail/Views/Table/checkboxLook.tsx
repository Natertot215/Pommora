import type { CSSProperties } from 'react'
import { labelColor, shape } from '@renderer/design-system/labels'
import { cx } from '@renderer/design-system/cx'
import { Icon } from '@renderer/design-system/symbols'
import { tint } from '@renderer/design-system/tokens/tint'
import { solidColorCss } from './solidColor'

/** A checked box tints its color — a set solid, else the system accent, so it matches the switch
 *  look; the check glyph itself always stays label-control regardless. `verticalAlign: middle` pins
 *  the box's line box the SAME whether or not it holds the check glyph, so toggling a cell never
 *  changes the row height (an empty inline-flex box otherwise sits on the baseline and adds
 *  descender). */
export function checkboxBoxStyle(checked: boolean, color: string | undefined): CSSProperties {
  const base: CSSProperties = { verticalAlign: 'middle', color: 'var(--label-control)' }
  return checked ? { ...tint(color ? solidColorCss(color) : 'var(--accent)'), ...base } : base
}

/** The checkbox box itself — the box chip, its checked tint, and the check glyph as one component,
 *  so the look can't drift between every surface that draws a checkbox value. */
export function CheckboxGlyph({
  checked,
  color,
  className,
}: {
  checked: boolean
  color?: string
  className?: string
}): React.JSX.Element {
  return (
    <span
      className={cx(shape.box, checked ? undefined : labelColor.default, className)}
      style={checkboxBoxStyle(checked, color)}
    >
      {checked ? <Icon name="check" size="control" strokeWidth={3} /> : null}
    </span>
  )
}
