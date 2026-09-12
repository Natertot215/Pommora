import { useEffect, useRef, useState } from 'react'
import { TextPicker } from '@pommora/uix/Pickers/TextPicker'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { linkEditText } from '@pommora/core/Connections/linkValue'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import { PropertyPicker } from '../../Properties/Pickers/PropertyPicker'
import { parseEditorValue } from '../../Properties/parseEditorValue'
import { useSession } from '../../Session/store'

export function ValuePickPresenter(): React.JSX.Element | null {
  const pending = useSession((s) => s.pendingPick)
  const dismiss = useSession((s) => s.dismissPick)
  const shown = useHeld(pending, pending !== null)
  const triggerRef = useRef<HTMLElement | null>(null)
  triggerRef.current = shown?.trigger ?? null
  const [picked, setPicked] = useState<PropertyValue | null | undefined>(undefined)
  useEffect(() => setPicked(undefined), [pending?.id])
  if (!shown) return null
  const { def, commit } = shown
  const current = picked === undefined ? shown.current : picked
  const datetime = def.type === 'datetime'
  return (
    <>
      <PropertyPicker
        open={pending !== null && datetime}
        triggerRef={triggerRef}
        target={datetime ? { kind: 'datetime', def, current } : null}
        onCommit={(value) => {
          setPicked(value)
          commit(value)
        }}
        onDismiss={dismiss}
      />
      <TextPicker
        open={pending !== null && !datetime}
        triggerRef={triggerRef}
        value={
          current?.kind === 'number'
            ? String(current.value)
            : current?.kind === 'url'
              ? linkEditText(current.value)
              : ''
        }
        onCommit={(raw) => {
          const next = parseEditorValue(def.type, raw, current)
          if (next !== undefined) commit(next)
          dismiss()
        }}
        onDismiss={dismiss}
      />
    </>
  )
}
