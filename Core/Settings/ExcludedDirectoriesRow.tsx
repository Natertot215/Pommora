import { reportRefusal } from '../Interface/Notifications/notifications'
import { useState } from 'react'
import { PathField } from '@pommora/uix/Fields/PathField'
import { ManageList, ManageRow } from '@pommora/uix/Menus/ManageRow'
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

  return (
    <ManageList
      values={stored}
      noun="exclusion"
      onAdd={(folder) => commit([...stored, folder])}
      onRename={(from, to) => commit(stored.map((f) => (f === from ? to : f)))}
      onRemove={(folder) => void commit(stored.filter((f) => f !== folder))}
      field={({ value, onCommit }) => (
        <PathField
          label="Excluded folder"
          value={value}
          empty="No folder"
          onCommit={onCommit}
          onBrowse={() => browse(onCommit)}
        />
      )}
    />
  )
}
