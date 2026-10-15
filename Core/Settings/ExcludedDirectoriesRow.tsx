import { reportRefusal } from '../Interface/Notifications/notifications'
import { useState } from 'react'
import { PathField } from '@pommora/uix/Fields/PathField'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { keepFocus } from '@pommora/uix/Interactions/shared'
import { ManageRow } from '@pommora/uix/Menus/ManageRow'
import { AccessoryButton, FootingCreate } from '@pommora/uix/Menus/MenuRows'
import { useListEdit } from '@pommora/uix/Menus/useListEdit'
import * as s from './excluded-directories.css'
import { useSession } from '../Session/store'
import { dialer } from '../Platform/dialer'

export function ExcludedDirectoriesRow({
  label,
  hint,
}: {
  label: string
  hint?: string
}): React.JSX.Element {
  const count = useSession((s) => s.tree?.config.excluded.length ?? 0)
  return (
    <ManageRow label={label} hint={hint} count={count}>
      <ExclusionPane />
    </ManageRow>
  )
}

function ExclusionPane(): React.JSX.Element {
  const stored = useSession((s) => s.tree?.config.excluded ?? [])
  const [busy, setBusy] = useState(false)

  // One write in flight at a time — the pane reads the list back through the tree, so a second edit on the stale list would undo the first.
  const commit = async (list: string[]): Promise<boolean> => {
    if (busy) return false
    setBusy(true)
    try {
      return reportRefusal(await dialer().ask('exclusions:set', list))
    } finally {
      setBusy(false)
    }
  }
  const browse = (apply: (picked: string) => void): void => {
    void dialer()
      .ask('exclusions:choose')
      .then((r) => {
        if (reportRefusal(r) && r.value !== null) apply(r.value)
      })
  }
  const list = useListEdit(stored, {
    onAdd: (folder) => commit([...stored, folder]),
    onRename: (from, to) => commit(stored.map((f) => (f === from ? to : f))),
  })
  const entering = useEntrance(list.rows, (r) => r.key)

  return (
    <div className={s.list}>
      {list.rows.map((row) => {
        const onCommit = (next: string): void => void list.commit(row, next)
        return (
          <Reveal key={row.key} open enterOnMount={entering(row.key)} fill>
            <div className={s.row}>
              <span className={s.field}>
                <PathField
                  label="Excluded folder"
                  value={row.value}
                  empty="No folder"
                  onCommit={onCommit}
                  onBrowse={() => browse(onCommit)}
                />
              </span>
              <AccessoryButton
                icon="x"
                size="control"
                ariaLabel="Remove exclusion"
                onMouseDown={keepFocus}
                onClick={() =>
                  row.draft ? list.cancel() : void commit(stored.filter((f) => f !== row.value))
                }
              />
            </div>
          </Reveal>
        )
      })}
      <FootingCreate ariaLabel="Add exclusion" disabled={list.drafting} onClick={list.begin} />
    </div>
  )
}
