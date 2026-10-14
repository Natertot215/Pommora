import { type CSSProperties, type ReactNode, useRef, useState } from 'react'
import { Reveal } from '../Animations/Reveal'
import { useEntrance } from '../Animations/useEntrance'
import { useRenameKeys } from '../Animations/useRenameKeys'
import { Button } from '../Buttons/Button'
import { PickerMenu } from '../Pickers/PickerMenu'
import { Icon, type IconName } from '../Symbols'
import { MenuRowView } from './MenuIndex'
import { AccessoryButton, FootingCreate } from './MenuRows'
import { trailingCluster, trailingFigure } from './menu-row.css'
import * as s from './manage-row.css'

/** A row whose value is a list edited in its own pane: its count where it shows one, and Manage to open the pane. */
export function ManageRow({
  label,
  hint,
  icon,
  count,
  solid,
  style,
  children,
}: {
  label: string
  hint?: string
  icon?: IconName
  count?: number
  /** Stacked over another glass surface, as a picker opened from a menu is. */
  solid?: boolean
  style?: CSSProperties
  children: ReactNode
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  return (
    <MenuRowView
      row={{
        kind: 'item',
        icon: icon ? <Icon name={icon} size="control" /> : undefined,
        label,
        caption: hint,
        trailing: {
          kind: 'field',
          children: (
            <span className={trailingCluster}>
              {count !== undefined && <span className={trailingFigure}>{count}</span>}
              <Button
                ref={triggerRef}
                type="filled"
                label="Manage"
                pressed={open}
                onClick={() => setOpen((o) => !o)}
              />
              <PickerMenu
                open={open}
                onDismiss={() => setOpen(false)}
                triggerRef={triggerRef}
                solid={solid}
                bareSurface
                contentClassName={s.pane}
                style={style}
              >
                {children}
              </PickerMenu>
            </span>
          ),
        },
      }}
    />
  )
}

export interface ManageFieldProps {
  value: string
  onCommit: (next: string) => void
  /** Present on the row being drafted, for a field that closes its draft when left unwritten. */
  onCancel?: () => void
}

const keepFocus = (e: { preventDefault: () => void }): void => e.preventDefault()

/** A Manage pane's list: each value in its own field beside a × that removes it, and + drafting one more at the end, which closes once its value is written. An empty value is never written, so × is the only removal, and × keeps the focus, so it discards an edit in progress rather than committing it; a rename keeps its row. */
export function ManageList({
  values,
  noun,
  field,
  onAdd,
  onRename,
  onRemove,
}: {
  values: readonly string[]
  noun: string
  field: (props: ManageFieldProps) => ReactNode
  onAdd: (value: string) => Promise<boolean>
  onRename: (from: string, to: string) => Promise<boolean>
  onRemove: (value: string) => void
}): React.JSX.Element {
  const [drafting, setDrafting] = useState(false)
  const keys = useRenameKeys(values)
  const entering = useEntrance(values, keys.keyOf)
  const add = async (value: string): Promise<void> => {
    if (value && (await onAdd(value))) setDrafting(false)
  }
  const rename = (from: string, to: string): void => {
    if (!to) return
    keys.rename(from, to)
    void onRename(from, to).then((ok) => ok || keys.revert(to))
  }
  const row = (props: ManageFieldProps, remove: () => void): React.JSX.Element => (
    <div className={s.row}>
      <span className={s.field}>{field(props)}</span>
      <AccessoryButton
        icon="x"
        size="control"
        ariaLabel={`Remove ${noun}`}
        onMouseDown={keepFocus}
        onClick={remove}
      />
    </div>
  )
  return (
    <div className={s.list}>
      {values.map((value) => (
        <Reveal key={keys.keyOf(value)} open enterOnMount={entering(keys.keyOf(value))} fill>
          {row({ value, onCommit: (next) => rename(value, next) }, () => onRemove(value))}
        </Reveal>
      ))}
      {drafting && (
        <Reveal open enterOnMount fill>
          {row(
            { value: '', onCommit: (next) => void add(next), onCancel: () => setDrafting(false) },
            () => setDrafting(false),
          )}
        </Reveal>
      )}
      <FootingCreate
        ariaLabel={`Add ${noun}`}
        disabled={drafting}
        onClick={() => setDrafting(true)}
      />
    </div>
  )
}
