import type { RefObject } from 'react'
import type { ColumnLook } from '@pommora/core/Properties/columnStyles'
import type { PickOption, PropertyDefinition } from '@pommora/core/Properties/properties'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import { PickerMenu } from '@pommora/uix/Pickers/picker-base'
import { massPickCommits, massSelected } from './massAssign'
import { pickShape, PropertyOptionRows, selectedValues } from './PropertyPicker'

export function MassPropertyPicker({
  def,
  currents,
  open,
  triggerRef,
  look,
  contextOptions,
  onPick,
  onDismiss,
}: {
  def: PropertyDefinition
  currents: Array<PropertyValue | null>
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  look?: ColumnLook
  contextOptions?: PickOption[]
  onPick: (commits: Array<{ index: number; next: PropertyValue | null }>) => void
  onDismiss: () => void
}): React.JSX.Element {
  const { options, kind } = pickShape(def, contextOptions)
  const rows = currents.map(selectedValues)
  const selected = massSelected(
    options.map((o) => o.value),
    rows,
  )
  const pick = (value: string): void => {
    onPick(massPickCommits(rows, value, kind))
    if (kind === 'select') onDismiss()
  }
  return (
    <PickerMenu open={open} onDismiss={onDismiss} triggerRef={triggerRef} solid>
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
