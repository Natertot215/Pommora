import type { RefObject } from 'react'
import type { ColumnLook } from '@pommora/core/Properties/columnStyles'
import { type PropertyDefinition, statusOptions } from '@pommora/core/Properties/properties'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import { PickerMenu, PickerRow } from '@pommora/uix/Pickers/picker-base'
import { labelColorFor } from '@pommora/uix/Theme/colorMap'
import { SpaceChip } from '@pommora/uix/Labels'
import type { PickKind } from './massAssign'
import { OptionChip } from '../Cells/OptionChip'

export type PickOption = { value: string; label: string; color?: string; icon?: string }

/** An option is never filtered by what it's called: the starter options a new property seeds are ordinary values. Groups are containers, never pickable chips. */
export const optionsOf = (def: PropertyDefinition): PickOption[] => {
  return def.type === 'status' ? statusOptions(def) : (def.select_options ?? [])
}

export const selectedValues = (current: PropertyValue | null): string[] => {
  if (!current) return []
  if (current.kind === 'multiSelect' || current.kind === 'context') return current.value
  if (current.kind === 'select') return [current.value]
  return []
}

export const pickShape = (
  def: PropertyDefinition,
  contextOptions?: PickOption[],
): { options: PickOption[]; kind: PickKind } => ({
  options: contextOptions ?? optionsOf(def),
  kind: contextOptions ? 'context' : def.type === 'multi_select' ? 'multiSelect' : 'select',
})

export const toggleValue = (selected: string[], value: string): string[] =>
  selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]

export const syntheticContextDef = (id: string): PropertyDefinition => ({
  id,
  name: '',
  type: 'context',
})

export function PropertyPicker({
  def,
  current,
  open,
  triggerRef,
  anchorX,
  look,
  contextOptions,
  onCommit,
  onDismiss,
}: {
  def: PropertyDefinition
  current: PropertyValue | null
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  anchorX?: number
  look?: ColumnLook
  contextOptions?: PickOption[]
  onCommit: (value: PropertyValue | null) => void
  onDismiss: () => void
}): React.JSX.Element | null {
  const { options, selected, pick } = pickSemantics(
    def,
    current,
    onCommit,
    onDismiss,
    contextOptions,
  )

  return (
    <PickerMenu
      open={open}
      onDismiss={onDismiss}
      triggerRef={triggerRef}
      solid
      origin={anchorX !== undefined ? 'center' : 'right'}
      anchorX={anchorX}
    >
      <PropertyOptionRows
        def={def}
        look={look}
        contextOptions={contextOptions}
        options={options}
        selected={selected}
        onPick={pick}
      />
    </PickerMenu>
  )
}

export function PropertyOptionRows({
  def,
  look,
  contextOptions,
  options,
  selected,
  onPick,
}: {
  def: PropertyDefinition
  look?: ColumnLook
  contextOptions?: PickOption[]
  options: PickOption[]
  selected: string[]
  onPick: (value: string) => void
}): React.JSX.Element {
  if (options.length === 0)
    // The spacer keeps the pane's proportions so an emptied option list doesn't collapse to nothing.
    return <div style={{ minWidth: 96, height: 24 }} />
  return (
    <>
      {options.map((o) => (
        <PickerRow
          key={o.value}
          selected={selected.includes(o.value)}
          onClick={() => onPick(o.value)}
        >
          {contextOptions ? (
            <SpaceChip color={labelColorFor(o.color)} title={o.label} icon={o.icon} />
          ) : (
            <OptionChip
              type={def.type}
              look={def.type === 'status' ? look : undefined}
              option={o}
              def={def}
            />
          )}
        </PickerRow>
      ))}
    </>
  )
}

export function pickSemantics(
  def: PropertyDefinition,
  current: PropertyValue | null,
  onCommit: (value: PropertyValue | null) => void,
  onSinglePicked: () => void,
  contextOptions?: PickOption[],
): {
  options: PickOption[]
  selected: string[]
  pick: (value: string) => void
} {
  const { options, kind } = pickShape(def, contextOptions)
  const selected = selectedValues(current)
  const pick = (value: string): void => {
    if (kind !== 'select') {
      onCommit({ kind, value: toggleValue(selected, value) })
      return
    }
    onCommit(selected.includes(value) ? null : { kind: 'select', value })
    onSinglePicked()
  }
  return { options, selected, pick }
}
