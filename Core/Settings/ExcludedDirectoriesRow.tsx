import { reportRefusal } from '../Interface/Notifications/notifications'
import { useState } from 'react'
import { PathField } from '@pommora/uix/Fields/PathField'
import { AccessoryButton, FootingCreate } from '@pommora/uix/Menus/MenuRows'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { useSession } from '../Session/store'
import { ManageRow } from './ManageRow'
import * as x from './settings-rows.css'
import { dialer } from '../Platform/dialer'

const EXCLUDED_MIN_W = 250
const EXCLUDED_MAX_W = 500

export function ExcludedDirectoriesRow({
  label,
  hint,
}: {
  label: string
  hint?: string
}): React.JSX.Element {
  const count = useSession((s) => s.tree?.config.excluded.length ?? 0)
  return (
    <ManageRow
      label={label}
      hint={hint}
      count={count}
      style={{ minWidth: EXCLUDED_MIN_W, maxWidth: EXCLUDED_MAX_W }}
    >
      <ExclusionPane />
    </ManageRow>
  )
}

function ExclusionPane(): React.JSX.Element {
  const stored = useSession((s) => s.tree?.config.excluded ?? [])
  const [drafting, setDrafting] = useState(false)
  const [busy, setBusy] = useState(false)
  const entering = useEntrance(stored, (f) => f)

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
  // Emptying a field is accepted, not a delete — the row stays; only the × removes.
  const rename = (folder: string, next: string): void => {
    if (next) void commit(stored.map((f) => (f === folder ? next : f)))
  }
  const commitDraft = async (next: string): Promise<void> => {
    if (next && (await commit([...stored, next]))) setDrafting(false)
  }
  const browse = (apply: (picked: string) => void): void => {
    void dialer()
      .ask('exclusions:choose')
      .then((r) => {
        if (reportRefusal(r) && r.value !== null) apply(r.value)
      })
  }

  const fieldRow = (
    value: string,
    onCommit: (n: string) => void,
    onRemove: () => void,
    key: string,
  ) => (
    <div className={x.paneRow} key={key}>
      <span className={x.field}>
        <PathField
          label="Excluded folder"
          value={value}
          empty="No folder"
          onCommit={onCommit}
          onBrowse={() => browse(onCommit)}
        />
      </span>
      <AccessoryButton icon="x" size="control" ariaLabel="Remove exclusion" onClick={onRemove} />
    </div>
  )

  return (
    <div className={x.paneList}>
      {stored.map((folder) => (
        <Reveal key={folder} open enterOnMount={entering(folder)} fill>
          {fieldRow(
            folder,
            (next) => rename(folder, next),
            () => void commit(stored.filter((f) => f !== folder)),
            folder,
          )}
        </Reveal>
      ))}
      {drafting ? (
        <Reveal open enterOnMount fill key="draft">
          {fieldRow(
            '',
            (n) => void commitDraft(n),
            () => setDrafting(false),
            'draft',
          )}
        </Reveal>
      ) : null}
      <FootingCreate
        ariaLabel="Add exclusion"
        disabled={drafting || busy}
        onClick={() => setDrafting(true)}
      />
    </div>
  )
}
