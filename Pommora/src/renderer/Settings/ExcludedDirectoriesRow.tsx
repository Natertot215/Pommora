import { useRef, useState } from 'react'
import { Button } from '@renderer/DesignSystem/Buttons'
import { PathField } from '@renderer/DesignSystem/Fields'
import { MenuRowView } from '@renderer/DesignSystem/Menus'
import { PickerMenu } from '@renderer/DesignSystem/Pickers/picker-base'
import { Reveal } from '@renderer/DesignSystem/Animation/Reveal'
import { useSession } from '../store'
import * as x from './exclusionRows.css'

const PANE_MIN_W = 250
const PANE_MAX_W = 500

export function ExcludedDirectoriesRow({
  label,
  hint,
}: {
  label: string
  hint: string
}): React.JSX.Element {
  const stored = useSession((s) => s.tree?.excluded ?? [])
  const setExclusions = useSession((s) => s.setExclusions)
  const [open, setOpen] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [busy, setBusy] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

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
      if (!r.ok) await window.nexus.showError(r.error.message)
      return r.ok
    } finally {
      setBusy(false)
    }
  }
  const replaceFolder = (folder: string, next: string): void => {
    void commit(
      next ? stored.map((f) => (f === folder ? next : f)) : stored.filter((f) => f !== folder),
    )
  }
  const commitDraft = async (next: string): Promise<void> => {
    if (next && (await commit([...stored, next]))) setDrafting(false)
    else if (!next) setDrafting(false)
  }
  const browse = (apply: (picked: string) => void): void => {
    void window.nexus.chooseExclusion().then((r) => {
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
        disabled={busy}
        onClick={onRemove}
      />
    </div>
  )

  return (
    <MenuRowView
      row={{
        kind: 'item',
        label,
        caption: hint,
        trailing: {
          kind: 'field',
          children: (
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
                  {stored.map((folder) =>
                    fieldRow(
                      folder,
                      (next) => replaceFolder(folder, next),
                      () => replaceFolder(folder, ''),
                      folder,
                    ),
                  )}
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
          ),
        },
      }}
    />
  )
}
