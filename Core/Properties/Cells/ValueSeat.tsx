import { useEffect, useReducer, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { isSecondaryClick } from '@pommora/uix/Interactions/chords'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import type { ResolvedColumn, ViewRow } from '../../Views/viewRow'
import { type ItemColumns, propertyColumn } from '../../Views/Pipeline/columns'
import type { ConnPage } from '../../Connections/pageIndex'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { readLinkText, resolveLink } from '../../Connections/linkValue'
import {
  type CellMenuAction,
  cellMenuContextFor,
  cellMenuModel,
  type HideFrom,
} from '../../Actions/cellMenu'
import { parseStyleAction } from '../../Actions/columnMenu'
import { type ConnEditAction, type LinkAction, linkMenuTarget } from '../../Actions/connectionMenu'
import { popMenu } from '../../Actions/menuActions'
import { showConnectionMenu } from '../../Interface/Menus/connectionMenuActions'
import { contextOptionsFor } from '../../Contexts/contextOptions'
import { previewConnections } from '../../Session/pageConnections'
import { useSession } from '../../Session/store'
import { groupUndo } from '../../Session/undo'
import type { ColumnStyle } from '../columnStyles'
import { numberBarCapable } from '../formatValue'
import { resolveFieldValue } from '../fieldValue'
import { pickKindOf } from '../properties'
import { isBlankValue, type PropertyValue } from '../propertyValue'
import { fileChipIndex, pickFileInto, runFileMenuAction } from '../Pickers/filePick'
import { MetadataPicker } from '../Pickers/MetadataPicker'
import type { PickCommit } from '../Pickers/pickModel'
import { PropertyPicker, type PickTarget } from '../Pickers/PropertyPicker'
import { PropertyValueInput } from '../Pickers/PropertyValueInput'
import { type ValueIntent, valueClickIntent, valueMenuIntent } from '../Pickers/valueClick'

/** What a surface hands the seat: how it reads and writes a row, where a pane anchors, and the few things it does differently from the others. */
export type SeatHost = {
  rowOf: (id: string) => ViewRow | undefined
  /** The open value's column, read fresh each render so the picker lists an option created while it's open. */
  columnOf: (id: string) => ResolvedColumn | undefined
  commit: (row: ViewRow, column: ResolvedColumn, value: PropertyValue | null) => void
  /** The element a pane opened from `el` anchors to. */
  anchor: (el: HTMLElement, column: ResolvedColumn) => HTMLElement
  holder: (row: ViewRow) => ConnPage | undefined
  connections: () => ConnectionsApi | undefined
  /** Null where a surface holds no column look: the panel, whose menu offers no Style and whose calendar reads the Nexus's forms. */
  style: (column: ResolvedColumn) => ColumnStyle | null
  /** A surface that styles its columns: its picker edits option looks. */
  setStyle?: (column: ResolvedColumn, key: keyof ColumnStyle & string, value: string) => void
  /** Cards center an option picker on the click. */
  centered?: true
  /** Keeps the surface's hover ghost down while a value's menu is open. */
  hold?: <T>(menu: () => Promise<T>) => Promise<T>
  /** Present where a surface adds metadata from a list: what the list holds for a row, how a held value shows, and, with `inPlace`, that a typed value edits where the surface shows it. */
  add?: {
    columns: (row: ViewRow) => ItemColumns
    show: (column: ResolvedColumn) => void
    inPlace?: true
  }
  /** Present where a value's menu offers Remove, naming what Remove takes the value out of. */
  hide?: { from: HideFrom; run: (row: ViewRow, column: ResolvedColumn) => void }
  /** The panel's Clear, which keeps its row shown. */
  clear?: (row: ViewRow, column: ResolvedColumn) => void
  onClose?: () => void
}

type Mode = 'picker' | 'editor' | 'popover'

/** React events cross portals along the component tree, so a gesture inside a pane a value's field opened, such as its link suggestions, reaches the seat too. */
const fromPane = (e: React.MouseEvent): boolean => !e.currentTarget.contains(e.target as Node)

type PaneOpen = {
  rowId: string
  columnId: string
  mode: Mode
  seat?: ConnEditAction
  x?: number
  swept?: string[]
  /** Counts every open, so opening the same value again mounts a fresh popover. */
  nonce: number
}

type SeatOpen = PaneOpen | { mode: 'add'; rowId: string; group?: keyof ItemColumns; slid?: string }

export type ValueSeatApi = ReturnType<typeof useValueSeat>

/** One value's click, right-click, and editing, a surface's Add list, and the Table's sweep, shared by the table, cards, the Properties panel, and the menus that open away from a value. */
export function useValueSeat(host: SeatHost) {
  const tree = useSession((s) => s.tree)
  // A menu resolves after its await, by when a view save may have handed the seat a new host.
  const live = useLatest(host)
  const [open, setOpen] = useState<SeatOpen | null>(null)
  const anchor = useRef<HTMLElement | null>(null)
  const opens = useRef(0)
  const close = (): void => {
    setOpen(null)
    host.onClose?.()
  }
  // A pane whose anchor left the page closes: its row is gone, or a compact card dropped the value it just cleared. So does one whose column no longer resolves.
  useEffect(() => {
    if (!open) return
    if (!anchor.current?.isConnected || (open.mode !== 'add' && !host.columnOf(open.columnId)))
      close()
  })

  const intentOf = (row: ViewRow, column: ResolvedColumn): ValueIntent | null =>
    valueClickIntent(
      column.type,
      resolveFieldValue(row, column),
      host.style(column)?.look,
      column.def,
    )

  /** True when a handler ran. `from` is the element the gesture landed on, which picks a File chip; `at` carries the click's x, which centers an option picker, or a sweep's rows. */
  const run = (
    row: ViewRow,
    column: ResolvedColumn,
    intent: ValueIntent | null,
    el: HTMLElement | null,
    from: EventTarget | null = null,
    at?: Pick<PaneOpen, 'x' | 'swept'>,
  ): boolean => {
    const float = (mode: Mode, seat?: ConnEditAction): true => {
      anchor.current = el
      opens.current += 1
      setOpen({ rowId: row.id, columnId: column.id, mode, seat, ...at, nonce: opens.current })
      return true
    }
    const { commit, clear, hide } = live.current
    if (!intent) return false
    switch (intent.kind) {
      case 'commit':
        if (intent.value === null && clear) clear(row, column)
        else commit(row, column, intent.value)
        return true
      case 'file':
        if (column.def)
          pickFileInto(column.def, resolveFieldValue(row, column), fileChipIndex(from), (value) =>
            commit(row, column, value),
          )
        return true
      case 'picker':
        return float('picker')
      case 'edit':
        return float('editor', intent.seat)
      case 'popover':
        return float('popover', intent.seat)
      case 'hide':
        hide?.run(row, column)
        return hide !== undefined
    }
  }

  const click = (row: ViewRow, column: ResolvedColumn, e: React.MouseEvent): void => {
    // A secondary click fires `click` beside `contextmenu`, and the menu takes it.
    if (isSecondaryClick(e)) return
    const el = host.anchor(e.currentTarget as HTMLElement, column)
    const x = host.centered ? e.clientX : undefined
    if (fromPane(e) || run(row, column, intentOf(row, column), el, e.target, { x }))
      e.stopPropagation()
  }

  const pane = (row: ViewRow, column: ResolvedColumn, at: HTMLElement): void => {
    run(row, column, { kind: 'popover' }, host.anchor(at, column))
  }

  const sweep = (
    row: ViewRow,
    column: ResolvedColumn,
    rowIds: string[],
    cell: HTMLElement,
  ): void => {
    run(row, column, { kind: 'picker' }, cell, null, { swept: rowIds })
  }

  const openAway = (row: ViewRow, column: ResolvedColumn, el: HTMLElement | null): void => {
    const intent = intentOf(row, column)
    if (intent?.kind !== 'edit') run(row, column, intent, el)
    else if (!host.add?.inPlace) run(row, column, { kind: 'popover' }, el)
    else {
      flushSync(() => host.add?.show(column))
      run(row, column, intent, el && host.anchor(el, column))
    }
    // A commit or the file dialog opens no pane, so nothing is left to hold the anchor.
    if (intent?.kind === 'commit' || intent?.kind === 'file') close()
  }

  const openAdd = (row: ViewRow, el: HTMLElement | null, group?: keyof ItemColumns): void => {
    const item = host.add?.columns(row)
    if (!item || (group ? item[group] : [...item.contexts, ...item.properties]).length === 0) return
    anchor.current = el
    setOpen({ mode: 'add', rowId: row.id, group })
  }

  const slide = (columnId?: string): void =>
    setOpen((prev) => (prev?.mode === 'add' ? { ...prev, slid: columnId } : prev))

  const commitPicks = (rows: ViewRow[], column: ResolvedColumn, commits: PickCommit[]): void =>
    groupUndo(() => {
      for (const { index, next } of commits) live.current.commit(rows[index], column, next)
    })

  /** `label` is the panel row's name, which offers the row menu even over a link the connection menu could open. */
  const menu = async (
    row: ViewRow,
    column: ResolvedColumn,
    e: React.MouseEvent,
    { label }: { label?: true } = {},
  ): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    if (fromPane(e)) return
    // Read before the await, since React recycles the event once the menu resolves.
    const el = host.anchor(e.currentTarget as HTMLElement, column)
    const chip = fileChipIndex(e.target)
    const value = resolveFieldValue(row, column)
    const hold: NonNullable<SeatHost['hold']> = host.hold ?? ((show) => show())
    const act = (action: CellMenuAction | LinkAction): boolean =>
      run(row, column, valueMenuIntent(action), el)
    const link =
      !label && value.kind === 'link'
        ? linkMenuTarget(
            resolveLink(readLinkText(value.value), host.connections()?.index, host.holder(row)),
            true,
            { hideable: host.hide?.from },
          )
        : null
    if (link) {
      const action = await hold(() => showConnectionMenu(link))
      if (action) act(action)
      return
    }
    const filled = !isBlankValue(value)
    const context = cellMenuContextFor(column.type, host.style(column), filled, {
      hideable: host.hide?.from,
      barCapable: numberBarCapable(column.def),
      onChip: chip !== null,
    })
    if (!context) return
    const action = await hold(() => popMenu(cellMenuModel(context)))
    const commit = (next: PropertyValue | null): void => live.current.commit(row, column, next)
    if (!action || runFileMenuAction(action, column.def, value, chip, commit) || act(action)) return
    const style = parseStyleAction(action)
    if (style) live.current.setStyle?.(column, style.key, style.value)
  }

  /** A typed value's field, inline or, with `popover`, floating; a popover mounts fresh for every open. */
  const input = (row: ViewRow, at: PaneOpen, popover = false): React.ReactNode => {
    const column = host.columnOf(at.columnId)
    return column?.def ? (
      <PropertyValueInput
        key={popover ? at.nonce : undefined}
        popover={popover ? { open: open?.mode === 'popover', triggerRef: anchor } : undefined}
        def={column.def}
        current={resolveFieldValue(row, column)}
        holder={host.holder(row)}
        connections={host.connections}
        seat={at.seat}
        onCommit={(next) => host.commit(row, column, next)}
        onClose={close}
      />
    ) : null
  }

  const editor = (row: ViewRow, column: ResolvedColumn): React.ReactNode =>
    open?.mode === 'editor' && open.rowId === row.id && open.columnId === column.id
      ? input(row, open)
      : null

  /** A row never lists itself among a Context's Spaces; a page row's id names no Space, so it excludes nothing. */
  const target = (rows: ViewRow[], column: ResolvedColumn): PickTarget | null => {
    const style = host.style(column)
    if (column.type === 'dateTime')
      return {
        kind: 'dateTime',
        current: resolveFieldValue(rows[0], column),
        dateFormat: style?.date_format,
        timeFormat: style?.time_format,
      }
    const pick = pickKindOf(column.type)
    if (!pick) return null
    const { setStyle } = host
    return {
      kind: 'options',
      column,
      pick,
      currents: rows.map((row) => resolveFieldValue(row, column)),
      style:
        setStyle && style
          ? { current: style, set: (key, value) => setStyle(column, key, value) }
          : undefined,
      contextOptions: contextOptionsFor(column, tree, rows[0].id),
    }
  }

  return {
    open,
    anchor,
    host,
    close,
    click,
    pane,
    menu,
    input,
    editor,
    target,
    sweep,
    openAway,
    openAdd,
    slide,
    commitPicks,
  }
}

/** The seat's floating panes: a value's picker, the Add list where the surface has one, and one typed-value popover. Each holds the value it last opened on through its exit; the picker mounts fresh for another value and the popover for every open. */
export function ValueSeat({ seat }: { seat: ValueSeatApi }): React.JSX.Element {
  const { open, host } = seat
  const last = useRef<{ picker?: PaneOpen; popover?: PaneOpen }>({})
  if (open?.mode === 'picker' || open?.mode === 'popover') last.current[open.mode] = open
  const picked = last.current.picker
  const pickColumn = picked && host.columnOf(picked.columnId)
  const pickRows = picked
    ? (picked.swept ?? [picked.rowId]).flatMap((id) => host.rowOf(id) ?? [])
    : []
  const typed = last.current.popover
  const typedRow = typed && host.rowOf(typed.rowId)
  return (
    <>
      <PropertyPicker
        key={picked ? `${picked.rowId}:${picked.columnId}` : 'none'}
        target={
          open?.mode === 'picker' && pickRows.length > 0 && pickColumn
            ? seat.target(pickRows, pickColumn)
            : null
        }
        triggerRef={seat.anchor}
        centerX={open?.mode === 'picker' ? open.x : undefined}
        onCommit={(commits) => {
          if (pickColumn) seat.commitPicks(pickRows, pickColumn, commits)
        }}
        onDismiss={seat.close}
      />
      {host.add && <MetadataPicker seat={seat} />}
      {typed && typedRow && seat.input(typedRow, typed, true)}
    </>
  )
}

/** The seat for a value picked from a menu away from it: what a click would do, anchored at the menu's trigger, with a typed value in a popover since no value sits there to edit in place. */
export function MenuSeat(): React.JSX.Element {
  const pending = useSession((s) => s.pendingPick)
  const dismiss = useSession((s) => s.dismissPick)
  const registry = useSession((s) => s.tree?.config.registry)
  const held = useHeld(pending, pending !== null)
  // The request's row lives in its writer, so the seat reads it again after each commit.
  const [, reread] = useReducer((n: number) => n + 1, 0)
  const seat = useValueSeat({
    rowOf: () => held?.rowOf(),
    // A definition can change under its open picker, so a property's column resolves from the live registry.
    columnOf: (id) => {
      if (held?.column.kind !== 'property') return held?.column
      const def = registry?.find((d) => d.id === id)
      return def && propertyColumn(def)
    },
    commit: (_, column, value) => {
      held?.commit(column, value)
      reread()
    },
    anchor: (el) => el,
    holder: () => held?.holder,
    connections: previewConnections,
    style: () => held?.style ?? null,
    onClose: dismiss,
  })
  useEffect(() => {
    if (!pending) return
    const row = pending.rowOf()
    if (!row) return dismiss()
    seat.openAway(row, pending.column, pending.trigger)
  }, [pending])
  return <ValueSeat seat={seat} />
}
