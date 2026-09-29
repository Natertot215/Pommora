import {
  optionsOf,
  PROPERTY_TYPES,
  type PropertyDefinition,
} from '@pommora/core/Properties/properties'
import { heading, menuDropLine, type PickerRowLook } from '@pommora/uix/Menus'
import { side } from '@pommora/uix/Menus/menu-row.css'
import { hiddenRow, optionRow } from '@pommora/uix/Menus/frames.css'
import { EyeToggle } from '@pommora/uix/Elements/EyeToggle'
import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import { moveBefore } from '@pommora/uix/Utilities/moveItem'
import { cx } from '@pommora/uix/Utilities/cx'
import { OptionChip } from '../../Properties/Cells/OptionChip'
import { liveBucketOrder, type PropertyGroup } from '../Pipeline/group'
import * as oo from './option-order.css'

export const SUB_LOOK: PickerRowLook = {
  className: oo.subOrderRow,
  labelClassName: oo.orderLabel,
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
    const values = g.options.map((o) => o.value)
    return { key: g.id, label: g.label, values: reversed ? values.reverse() : values }
  })
}

export function OptionOrderList({
  group,
  def,
  onSave,
  isHidden,
  onToggleHidden,
}: {
  group: Pick<PropertyGroup, 'order_mode' | 'order'>
  def: PropertyDefinition | undefined
  onSave?: (order: string[]) => void
} & HideControls): React.JSX.Element | null {
  if (!def) return null
  const byValue = new Map(optionsOf(def).map((o) => [o.value, o]))
  const order = liveBucketOrder(group, def, [])
  const chip = (v: string): React.JSX.Element => (
    <OptionChip type={def.type} option={byValue.get(v)} />
  )
  return (
    <LineZone
      {...lineList({
        locked: !onSave,
        commit: (v, slot) => {
          const next = moveBefore(order, (x) => x, v, slot.before)
          if (next) onSave?.(next)
        },
        line: menuDropLine,
        label: (v) => v,
        chip,
        watch: [def, group.order_mode, group.order],
      })}
    >
      {sectionsOf(group, def, order).map((section) => (
        <div key={section.key}>
          {section.label !== null && <div className={heading}>{section.label}</div>}
          {section.values.flatMap((v) =>
            byValue.has(v)
              ? [
                  <LineRow key={v} id={v} className={cx(optionRow, isHidden?.(v) && hiddenRow)}>
                    {chip(v)}
                    {rowEye(v, v, { isHidden, onToggleHidden })}
                  </LineRow>,
                ]
              : [],
          )}
        </div>
      ))}
    </LineZone>
  )
}
