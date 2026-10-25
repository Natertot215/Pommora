import { EyeToggle } from '@pommora/uix/Elements/EyeToggle'
import type { PickerRowLook } from '@pommora/uix/Menus'
import { side } from '@pommora/uix/Menus/menu-row.css'
import type { PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { type SortDirections, viewSpecOf } from '../valueKinds'
import type { ResolvedColumn } from '../viewRow'
import * as oo from './option-order.css'

export const SUB_LOOK: PickerRowLook = {
  className: oo.subOrderRow,
  labelClassName: oo.orderLabel,
}

// Each family's words for an order's two directions; a column that's gone reads a value's.
const ORDER_WORDS: Record<SortDirections, readonly [string, string]> = {
  option: ['Default', 'Reversed'],
  text: ['A → Z', 'Z → A'],
  value: ['Ascending', 'Descending'],
}

/** A column's Order list under the values its pane stores, closed by Custom where the pane offers one and the kind takes it. */
export function orderOptions<V extends string>(
  column: ResolvedColumn | undefined,
  [up, down, custom]: readonly [V, V, V?],
): PickerOption<V>[] {
  const kind = viewSpecOf(column?.type)?.directions ?? 'value'
  const [upWord, downWord] = ORDER_WORDS[kind]
  return [
    { value: up, label: upWord },
    { value: down, label: downWord },
    ...(kind === 'option' && custom ? [{ value: custom, label: 'Custom' }] : []),
  ]
}

export interface HideControls {
  isHidden?: (key: string) => boolean
  onToggleHidden?: (key: string) => void
}

export function rowEye(
  label: string,
  hideKey: string,
  { isHidden, onToggleHidden }: HideControls,
): React.JSX.Element | null {
  if (!onToggleHidden) return null
  return (
    <span className={side}>
      <EyeToggle
        hidden={isHidden?.(hideKey) ?? false}
        name={label}
        onToggle={() => onToggleHidden(hideKey)}
      />
    </span>
  )
}
