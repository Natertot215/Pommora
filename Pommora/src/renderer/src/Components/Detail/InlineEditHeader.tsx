import { type Ref, useState } from 'react'
import {
  InputField,
  RenamableLabel,
  input as fieldInputClass,
} from '@renderer/DesignSystem/Components/Fields'
import { Button } from '@renderer/DesignSystem/Components/Controls/Button'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { DashIcon } from './DashIcon'
import * as s from './settingsPane.css'

/** `iconRef` registers the icon button's element so an external picker can anchor to it. */
export function InlineEditHeader({
  value,
  icon,
  iconRef,
  onCommit,
  onIconClick,
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
  outline?: string
  /** A locked view embed sets this — an editable field whose commit can't land is the failure
   *  mode this prevents. */
  readOnly?: boolean
  /** Uncontrolled by default: clicking the field opens it. A host with its own way in — a menu's
   *  Rename — drives it instead, so the caret lands in THIS field rather than wherever the
   *  rename fence would otherwise award it. */
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
        disabled={readOnly || !onIconClick}
        onClick={onIconClick}
      >
        {icon ? <Icon name={icon} /> : <DashIcon />}
      </Button>
      <RenamableLabel
        renames="title"
        editing={editing && !readOnly}
        value={value}
        className={`${fieldInputClass} ${s.titleField}`}
        boxed
        onCommit={(next) => {
          setEditing(false)
          onCommit(next)
        }}
        onCancel={() => setEditing(false)}
      >
        <InputField
          className={s.titleField}
          onClick={readOnly ? undefined : () => setEditing(true)}
        >
          {value}
        </InputField>
      </RenamableLabel>
    </div>
  )
}
