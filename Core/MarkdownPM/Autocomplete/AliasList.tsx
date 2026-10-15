import { useEffect, useRef, useState } from 'react'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { useKeepInView } from '@pommora/uix/Interactions/paneCtl'
import { keepFocus } from '@pommora/uix/Interactions/shared'
import {
  AccessoryButton,
  emphasizeMatch,
  FootingCreate,
  MenuFooting,
  MenuItem,
  MenuScrollFrame,
} from '@pommora/uix/Menus'
import { titleInput } from '@pommora/uix/Menus/menu-row.css'
import { type ListRow, useListEdit } from '@pommora/uix/Menus/useListEdit'
import { Icon } from '@pommora/uix/Symbols'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import type { AliasRowAction } from '../../Actions/aliasRowMenu'
import { ALIAS_ICON } from '../../Assets/entityIconPolicy'
import type { AliasEdit } from '../../Connections/aliasMemory'
import { normalizeTitle } from '../../Paths/caseFold'

// KNOB — how long a click on a picker row waits for a second click that makes it a rename.
const PICK_DELAY_MS = 300

/** What an alias list edits through: the page's title, its edits, its row menu, and, for a host that lends the list its focus, every edit's end — `stay` when it ended inside the list, by Enter, Escape, or a removal. */
export interface AliasHost {
  title: string
  edit: (e: AliasEdit) => Promise<boolean>
  menu: () => Promise<AliasRowAction | null>
  onEditEnd?: (stay: boolean) => void
}

/** A page's aliases as menu rows: × or the row menu's Delete deletes one, a double-click on its name or the row menu's Rename renames it in place, and + drafts one more at the end. A picker passes `onPick`, which a single click calls once the double-click window passes, and its keyboard highlight. */
export function AliasList({
  aliases,
  host,
  active,
  match = 0,
  maxHeight,
  onPick,
}: {
  aliases: readonly string[]
  host: AliasHost
  active?: number
  match?: number
  maxHeight?: number
  onPick?: (alias: string) => void
}): React.JSX.Element {
  const list = useListEdit(aliases, {
    onAdd: (alias) => host.edit({ op: 'add', alias }),
    onRename: (from, to) => host.edit({ op: 'rename', from, to }),
  })
  const [renaming, setRenaming] = useState<string | null>(null)
  const rows = useRef<HTMLDivElement>(null)
  const keyed = useRef(false)
  const pick = useRef<number | undefined>(undefined)
  const picked = useLatest(onPick)
  const keepInView = useKeepInView(active ?? -1)
  useEffect(() => () => window.clearTimeout(pick.current), [])
  const editing = (row: ListRow): boolean => row.draft || renaming === row.key
  const byKey = (): boolean => {
    const was = keyed.current
    keyed.current = false
    return was
  }
  const end = (key: string, stay: boolean): void => {
    setRenaming((k) => (k === key ? null : k))
    host.onEditEnd?.(stay)
  }
  // A row the tree dropped mid-rename took its focused field with it, which fires no blur.
  const dropped = renaming !== null && !list.rows.some((r) => r.key === renaming) ? renaming : null
  useEffect(() => {
    if (dropped !== null) end(dropped, true)
  }, [dropped])
  // A field already open commits by blur, as leaving it any other way would, before the next opens.
  const rename = (row: ListRow): void => {
    window.clearTimeout(pick.current)
    const open = document.activeElement
    if (open instanceof HTMLElement && rows.current?.contains(open)) open.blur()
    setRenaming(row.key)
  }
  const remove = (row: ListRow): void => {
    if (row.draft) list.cancel()
    else void host.edit({ op: 'forget', alias: row.value })
    if (editing(row)) end(row.key, true)
  }
  const rowMenu = async (row: ListRow, e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    switch (await host.menu()) {
      case 'rename':
        return rename(row)
      case 'delete':
        return remove(row)
    }
  }
  return (
    <MenuScrollFrame
      maxHeight={maxHeight}
      footer={
        <MenuFooting
          leading={
            <FootingCreate ariaLabel="Add alias" disabled={list.drafting} onClick={list.begin} />
          }
        />
      }
    >
      <div
        ref={rows}
        onKeyDownCapture={(e) => {
          keyed.current = e.key === 'Enter' || e.key === 'Escape'
        }}
      >
        {list.rows.map((row, i) => (
          <Reveal key={row.key} open enterOnMount={row.draft} fill>
            <MenuItem
              ref={i === active ? keepInView : undefined}
              active={i === active}
              tabIndex={-1}
              leading={<Icon name={ALIAS_ICON} size="body" />}
              trailing={
                <AccessoryButton
                  icon="x"
                  size="control"
                  ariaLabel="Delete alias"
                  onMouseDown={keepFocus}
                  onClick={() => remove(row)}
                />
              }
              onClick={
                onPick && !row.draft
                  ? (e) => {
                      window.clearTimeout(pick.current)
                      if (e.detail === 1)
                        pick.current = window.setTimeout(
                          () => picked.current?.(row.value),
                          PICK_DELAY_MS,
                        )
                    }
                  : undefined
              }
              onContextMenu={row.draft ? undefined : (e) => void rowMenu(row, e)}
            >
              <RenamableLabel
                renames="title"
                className={titleInput}
                ariaLabel="Alias"
                editing={editing(row)}
                value={row.value}
                invalid={(text) => normalizeTitle(text) === normalizeTitle(host.title)}
                onBegin={row.draft ? undefined : () => rename(row)}
                onCommit={(next) => {
                  const landed = list.commit(row, next)
                  end(row.key, byKey())
                  return landed
                }}
                onCancel={() => {
                  if (row.draft) list.cancel()
                  end(row.key, byKey())
                }}
              >
                {(shown) => emphasizeMatch(shown, 0, match)}
              </RenamableLabel>
            </MenuItem>
          </Reveal>
        ))}
      </div>
    </MenuScrollFrame>
  )
}
