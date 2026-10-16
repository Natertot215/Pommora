import { useRef, type RefObject } from 'react'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { AccessoryButton } from '@pommora/uix/Menus'
import type { ConnPage } from '../../Connections/pageIndex'
import type { EditorHost } from '../../MarkdownPM/api'
import type { PropertyValue } from '../propertyValue'
import { ValueEditor } from './ValueEditor'

/** A Text value's pane: the value editor in a popover with a close, saving once on every way out. The editor lives in the pane's body, which `PickerMenu` mounts and unmounts around each open. */
export function TextPane({
  current,
  holder,
  host,
  open,
  triggerRef,
  onCommit,
  onDismiss,
}: {
  current: PropertyValue | null
  holder?: ConnPage
  host: EditorHost
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  onCommit: (value: PropertyValue | null) => void
  onDismiss: () => void
}): React.JSX.Element {
  const saveRef = useRef<() => void>(() => {})
  const close = (): void => {
    saveRef.current()
    onDismiss()
  }
  return (
    <PickerMenu
      open={open}
      onDismiss={close}
      triggerRef={triggerRef}
      direction="down"
      origin="center"
      contentClassName="text-pane"
    >
      <ValueEditor
        initial={current?.kind === 'text' ? current.value : ''}
        holder={holder}
        host={host}
        saveRef={saveRef}
        onCommit={(text) => onCommit(text === '' ? null : { kind: 'text', value: text })}
        onClose={close}
      />
      <AccessoryButton
        icon="x"
        size="control"
        ariaLabel="Save and close"
        className="text-pane-close"
        onClick={close}
      />
    </PickerMenu>
  )
}
