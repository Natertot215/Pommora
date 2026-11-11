import type { ReactNode } from 'react'
import {
  PROPERTY_TYPES,
  type PropertyDefinition,
  type ResolvedColumn,
} from '../../Properties/properties'
import { findOption, optionLabel } from '../../Properties/propertyValue'
import { menuDropLine } from '@pommora/uix/Menus/MenuRows'
import type { RowLook } from '@pommora/uix/Menus/MenuIndex'
import type { PickerOption } from '@pommora/uix/Menus/PickerControl'
import { heading, side } from '@pommora/uix/Menus/menu-row.css'
import { hiddenRow, optionRow } from '@pommora/uix/Menus/frames.css'
import { EyeToggle } from '@pommora/uix/Elements/EyeToggle'
import { revealDim } from '@pommora/uix/Interactions/hover-reveal.css'
import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import { moveBefore } from '@pommora/uix/Utilities/moveItem'
import { cx } from '@pommora/uix/Utilities/cx'
import { OptionChip } from '../../Properties/Cells/OptionChip'
import { liveBucketOrder, type PropertyGroup } from '../Pipeline/group'
import { type SortDirections, viewSpecOf } from '../valueKinds'
import * as oo from './option-order.css'

export const SUB_LOOK: RowLook = {
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
  isHidden: (key: string) => boolean
  onToggleHidden: (key: string) => void
}

export function hideEye(label: string, key: string, hide?: HideControls): React.JSX.Element | null {
  if (!hide) return null
  const hidden = hide.isHidden(key)
  return (
    <EyeToggle
      hidden={hidden}
      name={label}
      className={hidden ? undefined : revealDim}
      onToggle={() => hide.onToggleHidden(key)}
    />
  )
}

export function HideableRow({
  line,
  hideKey,
  label,
  hide,
  className,
  children,
}: {
  line?: string
  hideKey: string
  label: string
  hide?: HideControls
  className?: string
  children: ReactNode
}): React.JSX.Element {
  const eye = hideEye(label, hideKey, hide)
  const row = {
    className: cx(optionRow, className, hide?.isHidden(hideKey) && hiddenRow),
    'data-reveal-host': eye ? '' : undefined,
    children: (
      <>
        {children}
        {eye && <span className={side}>{eye}</span>}
      </>
    ),
  }
  return line ? <LineRow id={line} {...row} /> : <div {...row} />
}

type Section = { key: string; label: string | null; values: string[] }

function sectionsOf(
  group: Pick<PropertyGroup, 'order_mode' | 'order'>,
  def: PropertyDefinition,
  order: string[],
): Section[] {
  if (PROPERTY_TYPES[def.type].options !== 'status' || group.order_mode === 'manual')
    return [
      { key: 'options', label: group.order_mode === 'manual' ? 'Options' : null, values: order },
    ]
  const reversed = group.order_mode === 'reversed'
  const groups = def.status_groups ?? []
  return (reversed ? [...groups].reverse() : groups).map((g) => {
    const values = g.options.map((o) => o.id)
    return { key: g.id, label: g.label, values: reversed ? values.reverse() : values }
  })
}

export function OptionOrderList({
  group,
  def,
  onSave,
  hide,
}: {
  group: Pick<PropertyGroup, 'order_mode' | 'order'>
  def: PropertyDefinition | undefined
  onSave: (order: string[]) => void
  hide?: HideControls
}): React.JSX.Element | null {
  if (!def) return null
  const order = liveBucketOrder(group, def, [])
  return (
    <LineZone
      {...lineList({
        commit: (v, slot) => {
          const next = moveBefore(order, (x) => x, v, slot.before)
          if (next) onSave(next)
        },
        line: menuDropLine,
        label: (v) => optionLabel(def, v),
        chip: (v) => <OptionChip type={def.type} option={findOption(def, v)} />,
        watch: [def, group.order_mode, group.order],
      })}
    >
      {sectionsOf(group, def, order).map((section) => (
        <div key={section.key}>
          {section.label !== null && <div className={heading}>{section.label}</div>}
          {section.values.flatMap((v) => {
            const option = findOption(def, v)
            if (!option) return []
            return [
              <HideableRow key={v} line={v} hideKey={v} label={option.label} hide={hide}>
                <OptionChip type={def.type} option={option} />
              </HideableRow>,
            ]
          })}
        </div>
      ))}
    </LineZone>
  )
}
