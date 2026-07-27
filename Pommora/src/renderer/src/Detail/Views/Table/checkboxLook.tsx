import type { CSSProperties } from 'react'
import { chipBox, chipColor } from '@renderer/design-system/tokens'
import { cx } from '@renderer/design-system/cx'
import { Icon } from '@renderer/design-system/symbols'
import { tint } from '@renderer/design-system/tokens/tint'
import { solidColorCss } from './solidColor'

/** The inline style for a checkbox/group-on box at a given checked state + property colour. An empty
 *  box stays neutral grey (the caller adds `chipColor.default`); a checked box tints its colour — a set
 *  solid, else the configured accent via `var(--accent)` so it matches the switch look and resolves for
 *  a palette OR system accent. The check glyph always reads label-control. `verticalAlign: middle`
 *  pins the box's line box the SAME whether or not it holds the check glyph, so toggling a cell never
 *  changes the row height (an empty inline-flex box otherwise sits on the baseline and adds descender). */
export function checkboxBoxStyle(checked: boolean, color: string | undefined): CSSProperties {
  const base: CSSProperties = { verticalAlign: 'middle', color: 'var(--label-control)' }
  return checked ? { ...tint(color ? solidColorCss(color) : 'var(--accent)'), ...base } : base
}

/** The checkbox box itself — the box chip, its checked tint, and the check glyph as one component.
 *  Every surface that draws a checkbox value (cells, group bands, the grouping and filter panes)
 *  renders this, so the look can't drift between them. `className` carries a caller's extra hook. */
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
      className={cx(chipBox, checked ? undefined : chipColor.default, className)}
      style={checkboxBoxStyle(checked, color)}
    >
      {checked ? <Icon name="check" size={12} strokeWidth={3} /> : null}
    </span>
  )
}
