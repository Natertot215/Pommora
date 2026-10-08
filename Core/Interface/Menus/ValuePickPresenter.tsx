import { useState } from 'react'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import type { PropertyValue } from '../../Properties/propertyValue'
import { PropertyValueInput } from '../../Properties/Pickers/PropertyValueInput'
import { PropertyPicker } from '../../Properties/Pickers/PropertyPicker'
import { useSession } from '../../Session/store'

export function ValuePickPresenter(): React.JSX.Element | null {
  const pending = useSession((s) => s.pendingPick)
  const dismiss = useSession((s) => s.dismissPick)
  const shown = useHeld(pending, pending !== null)
  const triggerRef = useLatest(shown?.trigger ?? null)
  const [picked, setPicked] = useState<{ id: number; value: PropertyValue | null } | null>(null)
  if (!shown) return null
  const { def, commit, style } = shown
  const current = picked?.id === shown.id ? picked.value : shown.current
  if (def.type === 'dateTime')
    return (
      <PropertyPicker
        open={pending !== null}
        triggerRef={triggerRef}
        target={{
          kind: 'dateTime',
          def,
          current,
          dateFormat: style?.date_format,
          timeFormat: style?.time_format,
        }}
        onCommit={(value) => {
          setPicked({ id: shown.id, value })
          commit(value)
        }}
        onDismiss={dismiss}
      />
    )
  return (
    <PropertyValueInput
      popover={{ open: pending !== null, triggerRef }}
      def={def}
      current={current}
      holder={shown.holder}
      onCommit={commit}
      onClose={dismiss}
    />
  )
}
