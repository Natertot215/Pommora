import { useMemo } from 'react'
import {
  groupOptions,
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
  hiddenSet?: ReadonlySet<string>
  onToggleHidden?: (key: string) => void
}

export function rowEye(
  label: string,
  hideKey: string,
  { hiddenSet, onToggleHidden }: HideControls,
): React.JSX.Element | null {
  if (!onToggleHidden) return null
  return (
    <span className={side}>
      <EyeToggle
        hidden={hiddenSet?.has(hideKey) ?? false}
        name={label}
        onToggle={() => onToggleHidden(hideKey)}
      />
    </span>
  )
}

export function PropertyPreview({
  group,
  def,
  hiddenSet,
  onToggleHidden,
}: {
  group: Pick<PropertyGroupConfig, 'order_mode' | 'order'>
  def: PropertyDefinition | undefined
} & HideControls): React.JSX.Element | null {
  if (!def) return null
  const type = def.type === 'status' ? 'status' : 'select'
  const chip = (o: { value: string; label: string; color?: string }): React.JSX.Element => (
    <div key={o.value} className={cx(optionRow, hiddenSet?.has(o.value) && hiddenRow)}>
      <OptionChip type={type} option={o} />
      {rowEye(o.label, o.value, { hiddenSet, onToggleHidden })}
    </div>
  )
  if (type === 'status') {
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
  hiddenSet,
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
    labelFor: (id) => byValue.get(id)?.label ?? id,
    lineClassName: oo.dropLineInset,
    onDrop: (draggedId, drop) => onSave(nextOrder(ordered, draggedId, drop.beforeId)),
  })
  if (!def) return null
  const type = def.type === 'status' ? 'status' : 'select'
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
              hiddenSet?.has(v) && hiddenRow,
              dnd.draggingId === v && oo.ghosted,
            )}
          >
            <OptionChip type={type} option={o} />
            {rowEye(o.label, v, { hiddenSet, onToggleHidden })}
          </div>,
        ]
      })}
      {dnd.line}
      {dnd.ghost}
    </div>
  )
}
