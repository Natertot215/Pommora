import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyValue } from '@pommora/uix/Elements/EmptyValue'
import { Icon } from '@pommora/uix/Symbols'
import { AccessoryButton, MenuItem, MenuSeparator, menuDropLine } from '@pommora/uix/Menus/MenuRows'
import { heading } from '@pommora/uix/Menus/menu-row.css'
import { ICON } from '@pommora/uix/Menus/frames.css'
import { ghostAnchorProps, useGhostAnchor } from '@pommora/uix/Interactions/ghostCreate'
import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import { fullOrderIndex, moveItem } from '@pommora/uix/Utilities/moveItem'
import { cx } from '@pommora/uix/Utilities/cx'
import { text } from '@pommora/uix/Theme/typography.css'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { useHeldPresence } from '@pommora/uix/Animations/useExitPresence'
import type { PageFrontmatter } from '../Nexus/schemas'
import type { ResolvedColumn, ViewRow } from '../Views/viewRow'
import { Cell } from './Cells/Cell'
import { holdsValue } from './fieldValue'
import { columnIcon, columnLabel } from './columnDisplay'
import { useValueSeat, ValueSeat } from './Cells/ValueSeat'
import { assignValue, useValueWriter } from './assignValue'
import { pageRowOf, spaceRowOf } from '../Views/pageRow'
import { holderSchema, owningCollection } from '../Nexus/treePatch'
import { useValuesEpoch } from '../Views/Host/useContainerValues'
import { holderOf, useValueContext } from './valueContext'
import { FLUSH_GHOST } from './Schema/GhostOptionChip'
import { pushUndo } from '../Session/undo'
import { contextIdsOf } from '../Contexts/contextIdentity'
import { type ItemColumns, itemColumns, resolveColumn } from '../Views/Pipeline/columns'
import { relDirname } from '../Paths/posix'
import { spaceNodeOf } from '../Nexus/treeIndex'
import { type Overrides, retireSettled } from './valueOverride'
import { useSession, useSetting } from '../Session/store'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import { dateDefaults } from './columnStyles'
import { fetchPageDetail, readPageDetail } from '../Session/pageDetailCache'
import * as s from './property-panel.css'
import { AliasesRow } from '../Pages/AliasesRow'

const GROUPS = [
  { key: 'contexts', label: 'Contexts', add: 'Add Context' },
  { key: 'properties', label: 'Properties', add: 'Add Property' },
] as const

type PanelSubject =
  | { kind: 'page'; id: string; path: string; title?: string }
  | { kind: 'space'; id: string }

export function PropertyPanel({
  subject,
  host: panelHost,
  connections: hostConnections,
}: {
  subject: PanelSubject
  host: 'dropdown' | 'side-pane'
  /** A window's own routing for the links its values hold, as `TileHost` takes it; preview otherwise. */
  connections?: ConnectionsApi
}): React.JSX.Element {
  const isSpace = subject.kind === 'space'
  const tree = useSession((st) => st.tree)
  const mutate = useSession((st) => st.mutate)
  const rootRef = useRef<HTMLDivElement>(null)
  const addRefs = useRef<Record<keyof ItemColumns, HTMLButtonElement | null>>({
    contexts: null,
    properties: null,
  })
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set())
  const [base, setBase] = useState<PageFrontmatter | null>(null)
  const [override, setOverride] = useState<Overrides | null>(null)
  const [fetchedTitle, setFetchedTitle] = useState('')
  const rowEl = (id: string): HTMLElement | null | undefined =>
    rootRef.current?.querySelector<HTMLElement>(`[data-property-row="${id}"]`)
  const seat = useValueSeat({
    rowOf: (id) => (row?.id === id ? row : undefined),
    columnOf: (id) => resolveColumn(id, schema, contextIds),
    commit: (r, column, next) => assignValue(writer, r, column, next),
    // The label and the value both open on the value's span.
    anchor: (el, column) => rowEl(column.id) ?? el,
    holder: (r) => (ctx ? holderOf(r, ctx) : undefined),
    connections: () => ctx?.connections(),
    style: () => null,
    clear: (r, column) => emptyRow(r, column, true),
    hide: { from: 'row', run: (r, column) => emptyRow(r, column, false) },
    add: {
      columns: () => ({ contexts: unshown('contexts'), properties: unshown('properties') }),
      show: (column) => reveal(column.id),
      inPlace: true,
    },
  })
  const subjectId = subject.id
  const spaceNode = isSpace ? spaceNodeOf(tree, subjectId) : null
  const path = subject.kind === 'page' ? subject.path : (spaceNode?.path ?? '')
  const [editingFor, setEditingFor] = useState(path)
  if (editingFor !== path) {
    setEditingFor(path)
    seat.close()
  }

  useEffect(() => {
    if (isSpace) return
    const cached = readPageDetail(path)
    if (cached) {
      setBase(cached.frontmatter as PageFrontmatter)
      setFetchedTitle(cached.title)
      return
    }
    let live = true
    setBase(null)
    void fetchPageDetail(path).then((detail) => {
      if (!live || !detail) return
      setBase(detail.frontmatter as PageFrontmatter)
      setFetchedTitle(detail.title)
    })
    return () => {
      live = false
    }
  }, [path, isSpace])

  useEffect(() => setOverride(null), [subjectId])
  useValuesEpoch(
    isSpace ? null : relDirname(path),
    (v) => {
      const next = v[subjectId]?.frontmatter
      if (next) setBase(next)
    },
    setOverride,
    subjectId,
  )

  // A Space has no values push; its override retires on its node's swap.
  useEffect(() => {
    if (isSpace) setOverride((prev) => retireSettled(prev, null))
  }, [isSpace, spaceNode])

  const nexusId = tree?.nexus.id
  useEffect(() => {
    seat.close()
    setRevealed(new Set())
  }, [nexusId])

  const title = subject.kind === 'page' ? (subject.title ?? fetchedTitle) : ''
  const schema = useMemo(() => holderSchema(tree, spaceNode ?? path), [tree, spaceNode, path])
  const ctx = useValueContext(tree, schema, hostConnections)
  const dateFormat = useSetting('dateFormat')
  const pending = override?.[subjectId]
  const row = useMemo<ViewRow | null>(() => {
    if (isSpace) return tree && spaceNode ? spaceRowOf(tree, spaceNode, pending?.picked) : null
    return base ? pageRowOf(tree, { id: subjectId, path, title }, base, pending?.picked) : null
  }, [isSpace, tree, spaceNode, pending, base, subjectId, path, title])
  const fm = row?.frontmatter ?? null

  const contextIds = contextIdsOf(tree)

  const writer = useValueWriter({ rowOf: (id) => (row?.id === id ? row : undefined), setOverride })

  const fields = itemColumns(tree, schema, subjectId)
  const held = (c: ResolvedColumn): boolean =>
    row !== null &&
    (holdsValue(row, c) ||
      (c.def !== undefined && !row.picked?.[c.id] && Object.hasOwn(row.frontmatter, c.def.key)))
  const isShown = (c: ResolvedColumn): boolean => held(c) || revealed.has(c.id)
  const shown: ItemColumns = {
    contexts: fields.contexts.filter(isShown),
    properties: fields.properties.filter(isShown),
  }
  const unshown = (key: keyof ItemColumns): ResolvedColumn[] =>
    fields[key].filter((c) => !isShown(c))
  const entering = useEntrance([...shown.contexts, ...shown.properties], (f) => f.id, fm !== null)
  const adding = seat.open?.mode === 'add' ? seat.open : null
  const addKey = adding?.group ?? null
  const addFromRow = addKey !== null && seat.anchor.current !== addRefs.current[addKey]
  const openAdd = (key: keyof ItemColumns, anchor?: HTMLElement): void => {
    if (row) seat.openAdd(row, anchor ?? addRefs.current[key], key)
  }

  const sendWithUndo = <T,>(send: (order: T) => void, next: T, prior: T): void => {
    send(next)
    pushUndo(() => {
      if (!writer.current) return false
      send(prior)
      return true
    })
  }
  const commitOrder = (group: keyof ItemColumns, id: string, toIndex: number): void => {
    const shownIds = shown[group].map((f) => f.id)
    if (isSpace) {
      const moved = moveItem(shown[group], shownIds.indexOf(id), toIndex)
      const next = [
        ...(group === 'contexts' ? moved : shown.contexts),
        ...(group === 'properties' ? moved : shown.properties),
      ].map((f) => f.id)
      sendWithUndo(
        (ids) => void mutate({ op: 'setSpaceRowOrder', path, ids }),
        next,
        spaceNode?.rowOrder ?? [],
      )
      return
    }
    if (group === 'contexts') {
      const full = fields.contexts.map((f) => f.id)
      const ids = moveItem(full, full.indexOf(id), fullOrderIndex(full, shownIds, id, toIndex))
      sendWithUndo(
        (o) => void mutate({ op: 'reorderPanelContexts', ids: o }),
        ids,
        tree?.config.order.contexts ?? [],
      )
      return
    }
    const collection = owningCollection(tree, path)
    if (!collection) return
    const full = schema.map((d) => d.id)
    sendWithUndo(
      (index) =>
        void mutate({
          op: 'reorderAssigned',
          containerPath: collection.path,
          propertyId: id,
          toIndex: index,
        }),
      fullOrderIndex(full, shownIds, id, toIndex),
      full.indexOf(id),
    )
  }

  const glyphOf = (id: string): React.ReactNode => {
    const column = seat.host.columnOf(id)
    return column && ctx && <Icon name={columnIcon(column, ctx.contexts)} />
  }
  const ghostApi = useGhostAnchor({
    ...FLUSH_GHOST,
    suppressed: () => seat.open !== null,
  })
  const addSeat = useHeldPresence(addFromRow ? addKey : null, 'fast')

  const reveal = (id: string): void => setRevealed((prev) => new Set([...prev, id]))
  const emptyRow = (at: ViewRow, column: ResolvedColumn, keep: boolean): void => {
    assignValue(writer, at, column, null)
    if (keep) reveal(column.id)
    else setRevealed((prev) => new Set([...prev].filter((id) => id !== column.id)))
  }

  const body = (): React.ReactNode => {
    if (!ctx || !row || !fm) return null
    const renderRow = (column: ResolvedColumn): React.ReactNode => {
      const { id } = column
      const rowBody = (
        <MenuItem
          className={s.row}
          leading={<Icon name={columnIcon(column, ctx.contexts)} size="control" />}
          onContextMenu={(e) => void seat.menu(row, column, e, { label: true })}
          trailing={
            // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell; the grid wants roving tabindex, not per-cell tab stops
            <span
              className={cx(s.value, 'value-seat')}
              data-property-row={id}
              onContextMenu={(e) => void seat.menu(row, column, e)}
              onClick={(e) => seat.click(row, column, e)}
            >
              {seat.editor(row, column) ?? (
                <Cell
                  row={row}
                  column={column}
                  ctx={ctx}
                  style={{ look: 'standard', ...dateDefaults(dateFormat) }}
                  commit={(next) => assignValue(writer, row, column, next)}
                  empty={<EmptyValue className={cx('cell-empty', text.caption.standard)} />}
                  onPane={(anchor) => seat.pane(row, column, anchor)}
                />
              )}
            </span>
          }
        >
          {columnLabel(column, ctx.contexts)}
        </MenuItem>
      )
      return (
        <Reveal key={id} open enterOnMount={entering(id)} fill>
          <LineRow id={id}>{rowBody}</LineRow>
        </Reveal>
      )
    }
    return (
      <>
        <div className={panelHost === 'dropdown' ? s.pageRows : cx(s.panelRows, 'scroll-fade')}>
          {GROUPS.map(({ key, label, add }) => {
            const rows = shown[key]
            const addable = fields[key].some((f) => !isShown(f))
            const standing = addable && rows.length === 0
            const opened = addKey === key
            const rowOpened = opened && addFromRow
            const addHeld = rowOpened || addSeat?.held === key
            const ghost =
              addable && !standing && ghostApi.ghost?.anchorId === key ? ghostApi.ghost : null
            const addRow = (
              onClick: (anchor: HTMLElement) => void,
              hover?: { onPointerEnter: () => void; onPointerLeave: () => void },
            ): React.JSX.Element => (
              <div
                data-ghost-root
                data-reveal-held={rowOpened || undefined}
                className={cx(s.addSlot, 'ghost-worn')}
                {...hover}
              >
                <MenuItem
                  className={s.row}
                  leading={<Icon name="plus" size="control" />}
                  onClick={(e) => onClick(e.currentTarget)}
                >
                  {add}
                </MenuItem>
              </div>
            )
            return (
              <div key={key} data-reveal-host="" {...ghostAnchorProps(ghostApi, key)}>
                <div className={heading}>
                  <span>{label}</span>
                  {(addable || opened) && (
                    <AccessoryButton
                      ref={(el) => {
                        addRefs.current[key] = el
                      }}
                      icon="plus"
                      size={ICON.optionsAdd}
                      ariaLabel={add}
                      className={opened && !rowOpened ? undefined : revealTarget}
                      create
                      onClick={() => openAdd(key)}
                    />
                  )}
                </div>
                {(rows.length > 0 || addHeld || standing) && (
                  <LineZone
                    className={cx(s.group, panelHost === 'dropdown' && s.groupBordered)}
                    {...lineList({
                      commit: (id, slot) => commitOrder(key, id, slot.index),
                      line: menuDropLine,
                      label: (id) => {
                        const column = seat.host.columnOf(id)
                        return column ? columnLabel(column, ctx.contexts) : id
                      },
                      glyph: glyphOf,
                      watch: [rows.map((f) => f.id).join()],
                    })}
                  >
                    {rows.map(renderRow)}
                    {(standing || ghost || addHeld) && (
                      <Reveal
                        open={standing || rowOpened || (ghost !== null && !ghost.closing)}
                        enterOnMount={!standing}
                        onCollapsed={ghostApi.closed}
                      >
                        {addRow(
                          (anchor) => {
                            ghostApi.take()
                            openAdd(key, anchor)
                          },
                          {
                            onPointerEnter: ghostApi.onGhostEnter,
                            onPointerLeave: ghostApi.onGhostLeave,
                          },
                        )}
                      </Reveal>
                    )}
                  </LineZone>
                )}
              </div>
            )
          })}
          {subject.kind === 'page' && (
            <>
              <MenuSeparator />
              <AliasesRow page={{ id: subject.id, path: subject.path, title }} />
            </>
          )}
        </div>
        <ValueSeat seat={seat} />
      </>
    )
  }

  return (
    <div ref={rootRef} className={panelHost === 'dropdown' ? s.frame : 'window-panel-column'}>
      {body()}
    </div>
  )
}
