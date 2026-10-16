import { useEffect, useRef, useState } from 'react'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import { useKeepInView } from '@pommora/uix/Interactions/paneCtl'
import {
  emphasizeMatch,
  FootingCreate,
  MenuFooting,
  MenuItem,
  MenuScrollFrame,
  menuDropLine,
  RowRemove,
} from '@pommora/uix/Menus'
import { titleInput } from '@pommora/uix/Menus/menu-row.css'
import { type ListRow, useListEdit } from '@pommora/uix/Menus/useListEdit'
import { Icon } from '@pommora/uix/Symbols'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import type { AliasRowAction } from '../../Actions/aliasRowMenu'
import { ALIAS_ICON } from '../../Assets/entityIconPolicy'
import type { AliasEdit } from '../../Connections/aliasMemory'
import { keepsAlias } from '../../Connections/connections'

// KNOB — how long a click on a picker row waits for a second click that makes it a rename.
const PICK_DELAY_MS = 300

/** What an alias list edits through: the page's title, its edits, its row menu, and, for a host that lends the list its focus, every edit's end — `stay` when it ended inside the list, by Enter, Escape, a removal, or its row or the whole list being taken away. */
export interface AliasHost {
  title: string
  edit: (e: AliasEdit) => Promise<boolean>
  menu: () => Promise<AliasRowAction | null>
  onEditEnd?: (stay: boolean) => void
}

/** A page's aliases as menu rows: × or the row menu's Delete deletes one, a double-click on its name or the row menu's Rename renames it in place, + drafts one more at the end, and a drag reorders them. A picker passes `onPick`, which a single click calls once the double-click window passes, and its keyboard highlight. */
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
  const entering = useEntrance(list.rows, (r) => r.key, match === 0)
  const [renaming, setRenaming] = useState<string | null>(null)
  const rows = useRef<HTMLDivElement>(null)
  const keyed = useRef(false)
  const pick = useRef<number | undefined>(undefined)
  const picked = useLatest(onPick)
  const keepInView = useKeepInView(active ?? -1)
  // A pending pick belongs to the list it was clicked in: typing in the slot or moving to another changes the list and drops it.
  const listed = aliases.join('\u0000')
  useEffect(() => () => window.clearTimeout(pick.current), [listed, match])
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
  // A field taken away with its row or with the whole list fires no blur, so its edit ends here.
  const dropped = renaming !== null && !list.rows.some((r) => r.key === renaming) ? renaming : null
  useEffect(() => {
    if (dropped !== null) end(dropped, true)
  }, [dropped])
  const editOpen = useLatest(renaming !== null || list.drafting)
  const ends = useLatest(host.onEditEnd)
  useEffect(
    () => () => {
      if (editOpen.current) ends.current?.(true)
    },
    [],
  )
  const unpick = (): void => window.clearTimeout(pick.current)
  // A field already open commits by blur, as leaving it any other way would, before the next opens.
  const rename = (row: ListRow): void => {
    unpick()
    const open = document.activeElement
    if (open instanceof HTMLElement && rows.current?.contains(open)) open.blur()
    setRenaming(row.key)
  }
  const remove = (row: ListRow): void => {
    unpick()
    if (row.draft) list.cancel()
    else void host.edit({ op: 'forget', alias: row.value })
    if (editing(row)) end(row.key, true)
  }
  const rowMenu = async (row: ListRow, e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    unpick()
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
            <FootingCreate
              ariaLabel="Add alias"
              disabled={list.drafting}
              onClick={() => {
                unpick()
                list.begin()
              }}
            />
          }
        />
      }
    >
      <LineZone
        {...lineList({
          disabled: match > 0 || renaming !== null || list.drafting,
          commit: (alias, slot) => void host.edit({ op: 'move', alias, toIndex: slot.index }),
          line: menuDropLine,
          label: (alias) => alias,
          glyph: () => <Icon name={ALIAS_ICON} />,
          watch: [listed],
        })}
      >
        <div
          ref={rows}
          onKeyDownCapture={(e) => {
            keyed.current =
              (e.key === 'Enter' || e.key === 'Escape') && e.target instanceof HTMLInputElement
          }}
        >
          {list.rows.map((row, i) => {
            const item = (
              <MenuItem
                ref={i === active ? keepInView : undefined}
                active={i === active}
                tabIndex={-1}
                leading={<Icon name={ALIAS_ICON} size="body" />}
                trailing={<RowRemove ariaLabel="Delete alias" onClick={() => remove(row)} />}
                onClick={
                  onPick && !row.draft
                    ? (e) => {
                        unpick()
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
                  invalid={(text) => !keepsAlias(text, host.title)}
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
            )
            return (
              <Reveal key={row.key} open enterOnMount={entering(row.key)} fill>
                {row.draft ? item : <LineRow id={row.value}>{item}</LineRow>}
              </Reveal>
            )
          })}
        </div>
      </LineZone>
    </MenuScrollFrame>
  )
}
