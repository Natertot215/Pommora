import type { RefObject } from 'react'
import type { PropertyValue } from '../propertyValue'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { type PickCommit, pickOver } from './pickModel'
import { PropertyOptionRows, type PickTarget } from './PropertyPicker'

export function MassPropertyPicker({
  target,
  currents,
  open,
  triggerRef,
  onPick,
  onDismiss,
}: {
  target: Extract<PickTarget, { kind: 'options' }>
  currents: Array<PropertyValue | null>
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  onPick: (commits: PickCommit[]) => void
  onDismiss: () => void
}): React.JSX.Element {
  const { selected, pick } = pickOver(target.pick, currents, onPick, onDismiss)
  return (
    <PickerMenu open={open} onDismiss={onDismiss} triggerRef={triggerRef} solid>
      <PropertyOptionRows
        column={target.column}
        style={target.style}
        contextOptions={target.contextOptions}
        selected={selected}
        onPick={pick}
        editable
      />
    </PickerMenu>
  )
}
