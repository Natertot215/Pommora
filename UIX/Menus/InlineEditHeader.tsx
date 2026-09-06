import { type Ref, useState } from 'react'
import { InputField } from '../Fields/InputField'
import { Button } from '../Buttons/Button'
import { Icon } from '../Symbols'
import * as s from './frames.css'

export function InlineEditHeader({
  value,
  icon,
  iconRef,
  onCommit,
  onIconClick,
  iconOpen,
  outline,
  readOnly = false,
  editing: editingProp,
  onEditingChange,
}: {
  value: string
  icon?: string
  iconRef?: Ref<HTMLButtonElement>
  onCommit: (next: string) => void
  onIconClick?: () => void
  iconOpen?: boolean
  outline?: string
  readOnly?: boolean
  /** Uncontrolled by default; a host with its own way in drives it so the caret lands here. */
  editing?: boolean
  onEditingChange?: (editing: boolean) => void
}): React.JSX.Element {
  const [ownEditing, setOwnEditing] = useState(false)
  const editing = editingProp ?? ownEditing
  const setEditing = (next: boolean): void => {
    setOwnEditing(next)
    onEditingChange?.(next)
  }
  return (
    <div
      className={s.header}
      style={outline ? ({ '--field-ring': outline } as React.CSSProperties) : undefined}
    >
      <Button
        ref={iconRef}
        type="filled"
        size="button-medium"
        paddingX="0"
        className={s.iconButton}
        aria-label="Edit icon"
        pressed={iconOpen}
        disabled={readOnly || !onIconClick}
        onClick={onIconClick}
      >
        <Icon name={icon ?? 'square-dashed'} />
      </Button>
      <InputField
        className={s.titleField}
        label="Title"
        edit={readOnly ? undefined : { value, onCommit, editing, onEditingChange: setEditing }}
      >
        {value}
      </InputField>
    </div>
  )
}
