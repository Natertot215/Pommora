import { type CSSProperties, type ReactNode, useRef, useState } from 'react'
import { Reveal } from '../Animations/Reveal'
import { useEntrance } from '../Animations/useEntrance'
import { useRenameKeys } from '../Animations/useRenameKeys'
import { Button } from '../Buttons/Button'
import { keepFocus } from '../Interactions/shared'
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

/** A Manage pane's list: a field per value with a × beside it, and + drafting one more at the end, whose row the value keeps once written. × keeps the focus, so it discards an edit in progress, and an empty value is never written. */
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
  const drafts = useRef(0)
  const [draft, setDraft] = useState<string | null>(null)
  const keys = useRenameKeys(values)
  const entering = useEntrance(values, keys.keyOf)
  const close = (): void => setDraft(null)
  const add = async (key: string, value: string): Promise<void> => {
    if (!value) return
    keys.rename(key, value)
    if (await onAdd(value)) close()
    else keys.revert(value)
  }
  const rename = (from: string, to: string): void => {
    if (!to) return
    keys.rename(from, to)
    void onRename(from, to).then((ok) => ok || keys.revert(to))
  }
  const row = (key: string, props: ManageFieldProps, remove: () => void): React.JSX.Element => (
    <Reveal key={key} open enterOnMount={entering(key)} fill>
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
    </Reveal>
  )
  const rows = values.map((value) =>
    row(keys.keyOf(value), { value, onCommit: (next) => rename(value, next) }, () =>
      onRemove(value),
    ),
  )
  if (draft !== null && !rows.some((r) => r.key === draft))
    rows.push(
      row(draft, { value: '', onCommit: (next) => void add(draft, next), onCancel: close }, close),
    )
  return (
    <div className={s.list}>
      {rows}
      <FootingCreate
        ariaLabel={`Add ${noun}`}
        disabled={draft !== null}
        onClick={() => setDraft(`\u0000${++drafts.current}`)}
      />
    </div>
  )
}
