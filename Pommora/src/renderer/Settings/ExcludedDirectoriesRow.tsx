import { useRef, useState } from 'react'
import { Button } from '@renderer/DesignSystem/Buttons'
import { PathField } from '@renderer/DesignSystem/Fields'
import { MenuRowView } from '@renderer/DesignSystem/Menus'
import { PickerMenu } from '@renderer/DesignSystem/Pickers/picker-base'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { useSession } from '../store'
import * as x from './exclusionRows.css'

/** KNOB — the Manage pane's width floor and ceiling. A short path holds the floor; a deeply nested
 *  one scrolls inside the ceiling rather than widening past it. */
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
  const triggerRef = useRef<HTMLButtonElement>(null)

  const dismiss = (): void => {
    setOpen(false)
    setDrafting(false)
  }

  // Every edit writes the whole list; a refusal leaves the tree — and so the rendered list —
  // untouched, so nothing needs a local rollback.
  const replaceAt = (i: number, next: string): void => {
    void setExclusions(
      next ? stored.map((f, idx) => (idx === i ? next : f)) : stored.filter((_, idx) => idx !== i),
    )
  }
  const commitDraft = (next: string): void => {
    if (next) void setExclusions([...stored, next])
    setDrafting(false)
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
      <button
        type="button"
        className={x.removeButton}
        aria-label="Remove exclusion"
        onClick={onRemove}
      >
        <Icon name="x" size="caption" />
      </button>
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
                label="Manage"
                pressed={open}
                onClick={() => setOpen((o) => !o)}
              />
              {open ? (
                <PickerMenu
                  open={open}
                  onDismiss={dismiss}
                  triggerRef={triggerRef}
                  bareSurface
                  dismissOnOutside={false}
                  style={{ minWidth: PANE_MIN_W, maxWidth: PANE_MAX_W }}
                >
                  <div className={x.paneList}>
                    {stored.map((folder, i) =>
                      fieldRow(
                        folder,
                        (next) => replaceAt(i, next),
                        () => replaceAt(i, ''),
                        `f${i}`,
                      ),
                    )}
                    {drafting ? fieldRow('', commitDraft, () => setDrafting(false), 'draft') : null}
                    <div className={x.addRow}>
                      <Button
                        icon="plus"
                        label="Add Exclusion"
                        disabled={drafting}
                        onClick={() => setDrafting(true)}
                      />
                    </div>
                  </div>
                </PickerMenu>
              ) : null}
            </span>
          ),
        },
      }}
    />
  )
}
