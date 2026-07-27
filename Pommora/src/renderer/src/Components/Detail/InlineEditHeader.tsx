import { type Ref, useState } from 'react'
import { InteractionField, fieldInputClass } from '../../design-system/components/InteractionField'
import { Icon } from '../../design-system/symbols'
import { EditableInput } from '../EditableInput'
import { DashIcon } from './DashIcon'
import * as s from './settingsPane.css'

/**
 * The icon-button + inline-rename title header shared by the ViewPane (Collection/Set) and the
 * property editor. Owns the editing toggle; the title commits on blur with no focus ring, and
 * `onCommit` fires only on a real change. The icon button IS the editable target — it shows the
 * current glyph (dashed-square when unset), opens its picker via `onIconClick`, and registers its
 * element via `iconRef` so the picker's beak anchors to it.
 */
export function InlineEditHeader({
  value,
  icon,
  iconRef,
  onCommit,
  onIconClick,
  outline,
}: {
  value: string
  icon?: string
  iconRef?: Ref<HTMLButtonElement>
  onCommit: (next: string) => void
  /** Omit where no icon picker exists yet — the glyph then renders inert instead of as a live
   *  button wired to nothing. */
  onIconClick?: () => void
  /** OutlineTint — rings the icon button + title field in a resolved color; unset = ringless. */
  outline?: string
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
        disabled={!onIconClick}
        onClick={onIconClick}
      >
        {icon ? <Icon name={icon} /> : <DashIcon />}
      </button>
      {editing ? (
        <EditableInput
          value={value}
          className={`${fieldInputClass} ${s.titleField}`}
          onCommit={(next) => {
            setEditing(false)
            if (next && next !== value) onCommit(next)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <InteractionField className={s.titleField} onClick={() => setEditing(true)}>
          {value}
        </InteractionField>
      )}
    </div>
  )
}
