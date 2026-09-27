import { useMemo } from 'react'
import {
  groupOptions,
  PROPERTY_TYPES,
  type PropertyDefinition,
  optionsOf,
} from '@pommora/core/Properties/properties'
import type { GroupConfig } from '@pommora/core/Views/views'
import { heading, type PickerRowLook } from '@pommora/uix/Menus'
import { side } from '@pommora/uix/Menus/menu-row.css'
import { hiddenRow, optionRow } from '@pommora/uix/Menus/frames.css'
import { EyeToggle } from '@pommora/uix/Elements/EyeToggle'
import { nextOrder } from '@pommora/uix/Interactions/reorderModel'
import { cx } from '@pommora/uix/Utilities/cx'
import { OptionChip } from '../../Properties/Cells/OptionChip'
import type { Band } from '../Bands/bandDndModel'
import { bucketOrder } from '../Pipeline/group'
import { useGroupingListDrag } from './groupDnd'
import * as oo from './option-order.css'

export const SUB_LOOK: PickerRowLook = {
  className: oo.subOrderRow,
  labelClassName: oo.orderLabel,
}

export type PropertyGroupConfig = Extract<GroupConfig, { kind: 'property' }>

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

export function PropertyPreview({
  group,
  def,
  isHidden,
  onToggleHidden,
}: {
  group: Pick<PropertyGroupConfig, 'order_mode' | 'order'>
  def: PropertyDefinition | undefined
} & HideControls): React.JSX.Element | null {
  if (!def) return null
  const chip = (o: { value: string; color?: string }): React.JSX.Element => (
    <div key={o.value} className={cx(optionRow, isHidden?.(o.value) && hiddenRow)}>
      <OptionChip type={def.type} option={o} />
      {rowEye(o.value, o.value, { isHidden, onToggleHidden })}
    </div>
  )
  if (PROPERTY_TYPES[def.type].options === 'status') {
    const statusGroups = def.status_groups ?? []
    const groups = group.order_mode === 'reversed' ? [...statusGroups].reverse() : statusGroups
    return (
      <>
        {groups.map((g) => (
          <div key={g.id}>
            <div className={heading}>{g.label}</div>
            {(group.order_mode === 'reversed' ? groupOptions(g).reverse() : groupOptions(g)).map(
              chip,
            )}
          </div>
        ))}
      </>
    )
  }
  const all = optionsOf(def)
  const ordered = bucketOrder(group, def, new Set(all.map((o) => o.value)))
  const byValue = new Map(all.map((o) => [o.value, o]))
  return <>{ordered.flatMap((v) => (byValue.has(v) ? [chip(byValue.get(v)!)] : []))}</>
}

export function CustomList({
  group,
  def,
  onSave,
  isHidden,
  onToggleHidden,
}: {
  group: Pick<PropertyGroupConfig, 'order_mode' | 'order'>
  def: PropertyDefinition | undefined
  onSave: (order: string[]) => void
} & HideControls): React.JSX.Element | null {
  const { ordered, byValue, bands } = useMemo(() => {
    const all = optionsOf(def)
    const orderedValues = bucketOrder(group, def, new Set(all.map((o) => o.value)))
    return {
      ordered: orderedValues,
      byValue: new Map(all.map((o) => [o.value, o])),
      bands: orderedValues.map(
        (v): Band => ({ id: v, kind: 'property', depth: 0, parentId: null }),
      ),
    }
  }, [group, def])
  const dnd = useGroupingListDrag({
    bands,
    nestable: false,
    labelFor: (id) => id,
    onDrop: (draggedId, drop) => onSave(nextOrder(ordered, draggedId, drop.beforeId)),
  })
  if (!def) return null
  return (
    <div ref={dnd.containerRef} className="drop-line-host">
      <div className={heading}>Options</div>
      {ordered.flatMap((v) => {
        const o = byValue.get(v)
        if (!o) return []
        return [
          <div
            key={v}
            ref={dnd.rowRef(v)}
            {...dnd.rowHandle(v)}
            className={cx(
              optionRow,
              isHidden?.(v) && hiddenRow,
              dnd.draggingId === v && oo.ghosted,
            )}
          >
            <OptionChip type={def.type} option={o} />
            {rowEye(o.value, v, { isHidden, onToggleHidden })}
          </div>,
        ]
      })}
      {dnd.line}
      {dnd.ghost}
    </div>
  )
}
