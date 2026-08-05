import { type Ref, useState } from 'react'
import { InteractionField, fieldInputClass } from '../../design-system/components/InteractionField'
import { Icon } from '../../design-system/symbols'
import { RenamableLabel } from '../RenamableLabel'
import { DashIcon } from './DashIcon'
import * as s from './settingsPane.css'

/** `iconRef` registers the icon button's element so an external picker's beak can anchor to it. */
export function InlineEditHeader({
  value,
  icon,
  iconRef,
  onCommit,
  onIconClick,
  outline,
  readOnly = false,
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
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  return (
    <div
      className={s.header}
      style={outline ? ({ '--field-ring': outline } as React.CSSProperties) : undefined}
    >
      <button
        ref={iconRef}
        type="button"
        className={s.iconButton}
        aria-label="Edit icon"
        disabled={readOnly || !onIconClick}
        onClick={onIconClick}
      >
        {icon ? <Icon name={icon} /> : <DashIcon />}
      </button>
      <RenamableLabel
        renames="title"
        editing={editing && !readOnly}
        value={value}
        className={`${fieldInputClass} ${s.titleField}`}
        onCommit={(next) => {
          setEditing(false)
          onCommit(next)
        }}
        onCancel={() => setEditing(false)}
      >
        <InteractionField
          className={s.titleField}
          onClick={readOnly ? undefined : () => setEditing(true)}
        >
          {value}
        </InteractionField>
      </RenamableLabel>
    </div>
  )
}
