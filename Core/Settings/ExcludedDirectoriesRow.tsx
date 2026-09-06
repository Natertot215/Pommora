import { useRef, useState } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { PathField } from '@pommora/uix/Fields/PathField'
import { SettingsFieldRow } from './SettingsFieldRow'
import { PickerMenu } from '@pommora/uix/Pickers/picker-base'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { useSession } from '../Session/store'
import * as x from './exclusion-rows.css'
import { host } from '../Platform/dialer'

const PANE_MIN_W = 250
const PANE_MAX_W = 500

export function ExcludedDirectoriesRow({
  label,
  hint,
}: {
  label: string
  hint?: string
}): React.JSX.Element {
  const stored = useSession((s) => s.tree?.excluded ?? [])
  const setExclusions = useSession((s) => s.setExclusions)
  const [open, setOpen] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [busy, setBusy] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const entering = useEntrance(stored, (f) => f)

  const dismiss = (): void => {
    setOpen(false)
    setDrafting(false)
  }

  // One write in flight at a time — the pane reads the list back through the tree, so a second edit on the stale list would undo the first.
  const commit = async (list: string[]): Promise<boolean> => {
    if (busy) return false
    setBusy(true)
    try {
      const r = await setExclusions(list)
      if (!r.ok) await host().ask('error:show', r.error.message)
      return r.ok
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
    void host()
      .ask('exclusions:choose')
      .then((r) => {
        if (r.ok && r.value !== null) apply(r.value)
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
      <Button
        type="base"
        size="button-inline"
        icon="x"
        aria-label="Remove exclusion"
        onClick={onRemove}
      />
    </div>
  )

  return (
    <SettingsFieldRow label={label} hint={hint}>
      <span className={x.manageCluster}>
        <span className={x.count}>{stored.length}</span>
        <Button
          ref={triggerRef}
          type="filled"
          label="Manage"
          pressed={open}
          onClick={() => setOpen((o) => !o)}
        />
        <PickerMenu
          open={open}
          onDismiss={dismiss}
          triggerRef={triggerRef}
          bareSurface
          style={{ minWidth: PANE_MIN_W, maxWidth: PANE_MAX_W }}
        >
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
            <div className={x.addRow}>
              <Button
                icon="plus"
                label="Add Exclusion"
                className={x.addButton}
                paddingX="0"
                disabled={drafting || busy}
                onClick={() => setDrafting(true)}
              />
            </div>
          </div>
        </PickerMenu>
      </span>
    </SettingsFieldRow>
  )
}
