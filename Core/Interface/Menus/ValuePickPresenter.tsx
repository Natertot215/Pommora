import { useRef, useState } from 'react'
import { TextPicker } from '@pommora/uix/Pickers/TextPicker'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { linkEditText } from '@pommora/core/Connections/linkValue'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { NumberValuePicker } from '../../Properties/Pickers/NumberValuePicker'
import { PropertyPicker } from '../../Properties/Pickers/PropertyPicker'
import { parseEditorValue } from '../../Properties/parseEditorValue'
import { useSession } from '../../Session/store'

export function ValuePickPresenter(): React.JSX.Element | null {
  const pending = useSession((s) => s.pendingPick)
  const dismiss = useSession((s) => s.dismissPick)
  const shown = useHeld(pending, pending !== null)
  const triggerRef = useRef<HTMLElement | null>(null)
  triggerRef.current = shown?.trigger ?? null
  const [picked, setPicked] = useState<{ id: number; value: PropertyValue | null } | null>(null)
  if (!shown) return null
  const { def, commit } = shown
  const current = picked?.id === shown.id ? picked.value : shown.current
  if (def.type === 'number')
    return (
      <NumberValuePicker
        open={pending !== null}
        triggerRef={triggerRef}
        def={def}
        current={current}
        onCommit={commit}
        onDismiss={dismiss}
      />
    )
  if (def.type === 'datetime')
    return (
      <PropertyPicker
        open={pending !== null}
        triggerRef={triggerRef}
        target={{ kind: 'datetime', def, current }}
        onCommit={(value) => {
          setPicked({ id: shown.id, value })
          commit(value)
        }}
        onDismiss={dismiss}
      />
    )
  return (
    <TextPicker
      open={pending !== null}
      triggerRef={triggerRef}
      value={current?.kind === 'url' ? linkEditText(current.value) : ''}
      accent={solidColorCss(def.link_color)}
      onCommit={(raw) => {
        const next = parseEditorValue(def.type, raw, current)
        if (next !== undefined) commit(next)
        dismiss()
      }}
      onDismiss={dismiss}
    />
  )
}
