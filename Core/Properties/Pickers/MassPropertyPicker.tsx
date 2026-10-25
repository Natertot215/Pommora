import type { RefObject } from 'react'
import type { PickOption } from '../properties'
import type { PropertyValue } from '../propertyValue'
import type { ResolvedColumn } from '../../Views/viewRow'
import type { OptionStyleControl } from '../Schema/useOptionEdit'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { type PickCommit, pickOver } from './pickModel'
import { PropertyOptionRows } from './PropertyPicker'

export function MassPropertyPicker({
  column,
  currents,
  open,
  triggerRef,
  style,
  contextOptions,
  onPick,
  onDismiss,
}: {
  column: ResolvedColumn
  currents: Array<PropertyValue | null>
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  style?: OptionStyleControl
  contextOptions?: PickOption[]
  onPick: (commits: PickCommit[]) => void
  onDismiss: () => void
}): React.JSX.Element {
  const { selected, pick } = pickOver(column, currents, onPick, onDismiss)
  return (
    <PickerMenu open={open} onDismiss={onDismiss} triggerRef={triggerRef} solid>
      <PropertyOptionRows
        column={column}
        style={style}
        contextOptions={contextOptions}
        selected={selected}
        onPick={pick}
        editable
      />
    </PickerMenu>
  )
}
