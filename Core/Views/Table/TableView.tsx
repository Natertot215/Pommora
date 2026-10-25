import { memo, useEffect, useRef, useState } from 'react'
import type { ResolvedColumn, ResolvedGroup, ViewRow } from '../viewRow'
import type { ColumnStyle } from '../../Properties/columnStyles'
import { cellMenuModel } from '../../Actions/cellMenu'
import { type ColumnAlign, viewOption } from '../views'
import type { PropertyValue } from '../../Properties/propertyValue'
import { pickKindOf } from '../../Properties/properties'
import { resolveFieldValue } from '../../Properties/fieldValue'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { fillInput } from '@pommora/uix/Fields/fields.css'
import { MassPropertyPicker } from '../../Properties/Pickers/MassPropertyPicker'
import { groupUndo } from '../../Session/undo'
import { useValueSeat, ValueSeat } from '../../Properties/Cells/ValueSeat'
import type { ViewHostApi } from '../Host/useViewHost'
import { rowHover, useViewInteractions } from '../Host/useViewInteractions'
import { useSession } from '../../Session/store'
import { glanceShown } from '../../Interface/Glance/glanceAction'
import type { ValueContext } from '../../Properties/valueContext'
import { isCmd, isSecondaryClick } from '@pommora/uix/Interactions/chords'
import { Cell } from '../../Properties/Cells/Cell'
import { EntityIcon } from '../../Assets/EntityIcon'
import { GroupBand } from '../Bands/GroupBand'
import { memberDepth } from '../Bands/bandModel'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { columnIcon, columnLabel } from '../../Properties/columnLabel'
import { type DragShift, gapShift, useColumns } from './useColumns'
import { cx } from '@pommora/uix/Utilities/cx'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { overScrollLabel } from '@pommora/uix/Interactions/OverScroll'
import { useStableApi } from '@pommora/uix/Utilities/stableApi'
import { text } from '@pommora/uix/Theme'
import { Icon } from '@pommora/uix/Symbols'
import { ColumnHeader } from './ColumnHeader'
import './table-view.css'
import type { GhostAnchor } from '@pommora/uix/Interactions/ghostCreate'
import { useCellSweep } from './cellSweep'
import { LineZone, useLineRow } from '@pommora/uix/Interactions/drag'
import { popMenu } from '../../Actions/menuActions'

export function TableView({ host }: { host: ViewHostApi }): React.JSX.Element {
  const {
    view,
    columns,
    groups,
    ctx,
    rowById,
    bands,
    collapsed,
    dragDisabled,
    commitValue,
    mutate,
  } = host
  const selection = useSession((s) => s.selection)
  const {
    iconsShown,
    alignByCol,
    styleByCol,
    dragShift,
    cols,
    reflowWidth,
    overflowing,
    hiding,
    sliding,
    resizing,
    resizeColumn,
    startResize,
    abortResize,
    endResize,
    commitResize,
    openHeaderMenu,
    startColumnDrag,
    onTrackTransitionEnd,
  } = useColumns(host)

  // ── The title's rename ────────────────────────────────────────────────────

  const [renaming, setRenaming] = useState<{ rowId: string; fromCreate?: true } | null>(null)
  const strandedEditId = renaming !== null && !rowById.has(renaming.rowId) ? renaming.rowId : null
  useEffect(() => {
    if (strandedEditId !== null) setRenaming((r) => (r?.rowId === strandedEditId ? null : r))
  }, [strandedEditId])
  const titleCol = columns.find((c) => c.kind === 'title')
  const titleColId = titleCol?.id

  const interactions = useViewInteractions(host, {
    ghost: {
      graceMs: 0,
      suppressed: () => seat.open !== null || renaming !== null || glanceShown(),
    },
    rename: (target, fromCreate) =>
      setRenaming({ rowId: target.id, ...(fromCreate ? { fromCreate: true } : {}) }),
  })
  const seat = useValueSeat({
    ...host.seatHost,
    anchor: (el) => el.closest<HTMLElement>('.data-cell') ?? el,
    hold: interactions.holdGhost,
  })

  // ── Cell click ────────────────────────────────────────────────────────────

  const onCellClick = (row: ViewRow, col: ResolvedColumn, e: React.MouseEvent): void => {
    // A secondary-click fires `click` alongside `contextmenu`, so bail and let the right-click menu win.
    if (isSecondaryClick(e)) return
    if (col.kind === 'title') {
      e.stopPropagation()
      interactions.openPage(row, isCmd(e))
      return
    }
    seat.click(row, col, e)
  }

  // ── The title cell ────────────────────────────────────────────────────────

  const titleCell = (row: ViewRow, opened: boolean, hideIcon: boolean): React.ReactNode => {
    const fromCreate = opened && renaming?.fromCreate
    return (
      <span className={opened ? 'cell-rename' : cx(overScrollLabel, 'cell-title')}>
        {hideIcon ? null : <EntityIcon kind="page" icon={row.icon} size="body" />}
        <RenamableLabel
          renames="title"
          editing={opened}
          emptyInitial={fromCreate}
          value={row.title}
          className={fillInput}
          onCommit={(newName) => {
            setRenaming(null)
            return mutate({
              op: 'rename',
              path: row.path,
              kind: 'page',
              newName,
              ...(fromCreate ? { fromCreate } : {}),
            })
          }}
          onCancel={() => setRenaming(null)}
        >
          {(shown) => <span className="cell-title-text">{shown}</span>}
        </RenamableLabel>
      </span>
    )
  }

  // ── The title menu ────────────────────────────────────────────────────────

  /** The page's own menu: its answer runs the page half, and its Icon seats the picker on the title's glyph. */
  const openTitleMenu = async (row: ViewRow, e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    // Captured before the await, since React recycles the synthetic event.
    const el = e.currentTarget as HTMLElement
    const cellEl = el.closest<HTMLElement>('.data-cell') ?? el
    const action = await interactions.holdGhost(() =>
      popMenu(cellMenuModel({ kind: 'title', ...interactions.titleMenuContext(row) })),
    )
    const glyph = cellEl.querySelector<HTMLElement>('.cell-title > :first-child') ?? cellEl
    if (action) interactions.runTitleAction(action, row, glyph)
  }

  // ── The sweep ─────────────────────────────────────────────────────────────

  const [mass, setMass] = useState<{ colId: string; rowIds: string[] } | null>(null)
  const [massOpen, setMassOpen] = useState(false)
  const massTriggerRef = useRef<HTMLElement | null>(null)
  const cellSweep = useCellSweep({
    gridEl: () => host.viewRootRef.current,
    onSettle: (colId, rowIds, settleRowId) => {
      const at = columns.findIndex((c) => c.id === colId)
      const cell = host.viewRootRef.current
        ?.querySelector(`[data-rid="${CSS.escape(settleRowId)}"]`)
        ?.children.item(at)
      if (!(cell instanceof HTMLElement)) return cellSweep.clear()
      massTriggerRef.current = cell
      setMass({ colId, rowIds })
      setMassOpen(true)
    },
  })
  const startSweep = (row: ViewRow, col: ResolvedColumn, e: React.PointerEvent): boolean => {
    if (pickKindOf(col.type) === null) return false
    if (e.button !== 0 || (e.target as Element).closest('.row-grip')) return false
    cellSweep.begin(row.id, col.id, e)
    return true
  }
  const massDegraded =
    mass !== null &&
    massOpen &&
    (columns.every((c) => c.id !== mass.colId) ||
      mass.rowIds.filter((id) => rowById.has(id)).length < 2)
  useEffect(() => {
    if (!massDegraded) return
    setMassOpen(false)
    cellSweep.clear()
  })

  const massPicker = (): React.ReactNode => {
    if (!mass) return null
    const col = columns.find((c) => c.id === mass.colId)
    if (!col) return null
    const rows = mass.rowIds.flatMap((id) => {
      const r = rowById.get(id)
      return r ? [r] : []
    })
    if (rows.length < 2) return null
    const target = seat.target(rows[0], col)
    if (target?.kind !== 'options') return null
    const currents = rows.map((r) => resolveFieldValue(r, col))
    return (
      <MassPropertyPicker
        key={`${mass.colId}:${mass.rowIds.join('.')}`}
        target={target}
        currents={currents}
        open={massOpen}
        triggerRef={massTriggerRef}
        onPick={(commits) => {
          if (commits.length)
            groupUndo(() => {
              for (const { index, next } of commits) commitValue(rows[index], col, next)
            })
        }}
        onDismiss={() => {
          setMassOpen(false)
          cellSweep.clear()
        }}
      />
    )
  }

  // ── The row api ───────────────────────────────────────────────────────────

  const cellApi = useStableApi<RowCellApi>({
    menu: (row, col, e) =>
      void (col.kind === 'title' ? openTitleMenu(row, e) : seat.menu(row, col, e)),
    click: onCellClick,
    pane: seat.pane,
    title: titleCell,
    overlay: seat.editor,
    commit: commitValue,
    grip: (row, e) => void openTitleMenu(row, e),
    sweep: startSweep,
    hover: interactions.ghost.onHover,
    open: (row) => interactions.openPage(row, false),
  })
  const open = seat.open
  const overlayTarget =
    renaming && titleColId
      ? { rowId: renaming.rowId, colId: titleColId }
      : open?.mode === 'editor'
        ? { rowId: open.rowId, colId: open.columnId }
        : null
  const popoverTarget =
    open?.mode === 'popover' ? { rowId: open.rowId, colId: open.columnId } : null
  const activeCell = overlayTarget ?? (open && { rowId: open.rowId, colId: open.columnId })

  // ── The render ────────────────────────────────────────────────────────────

  const headerIcon = (column: ResolvedColumn): React.ReactNode =>
    iconsShown && (
      <span className="col-header-icon">
        <Icon name={columnIcon(column, ctx.contexts)} size="body" />
      </span>
    )
  const indent = (depth: number): string =>
    depth > 0 ? `calc(var(--loose-inset) + var(--row-indent) * ${depth})` : 'var(--loose-inset)'
  const groupIndent = (depth: number): string => `calc(var(--row-indent) * ${depth})`

  const ghost = interactions.ghost.ghost
  const ghostRowProps = {
    columns,
    hideIcon: viewOption(view, 'hide_page_icons'),
    onClosed: interactions.ghost.closed,
    onEnter: interactions.ghost.onGhostEnter,
    onLeave: interactions.ghost.onGhostLeave,
    onCreate: () => void interactions.ghostCreate(),
  }
  let renderedAnyRow = false
  const renderRows = (g: ResolvedGroup, depth: number, visible: boolean): React.JSX.Element[] => {
    const isCollapsed = collapsed.has(g.key)
    const itemsVisible = visible && !isCollapsed
    const itemDepth = memberDepth(g.kind, depth)
    const memberIndent = g.kind === 'tail' ? indent : groupIndent
    const members: React.JSX.Element[] = [
      ...g.items.flatMap((row, i) => {
        const lead = i === 0 && (g.kind !== 'tail' || !renderedAnyRow)
        if (itemsVisible) renderedAnyRow = true
        const rendered = [
          <DataRow
            key={row.id}
            row={row}
            columns={columns}
            ctx={ctx}
            padLeft={memberIndent(itemDepth)}
            dragShift={dragShift}
            alignByCol={alignByCol}
            styleByCol={styleByCol}
            api={cellApi}
            overlayCol={overlayTarget?.rowId === row.id ? overlayTarget.colId : null}
            popoverCol={popoverTarget?.rowId === row.id ? popoverTarget.colId : null}
            activeCol={activeCell?.rowId === row.id ? activeCell.colId : null}
            hideIcon={viewOption(view, 'hide_page_icons')}
            selected={selection.kind === 'page' && selection.id === row.id}
            dragDisabled={dragDisabled}
            sweepCol={cellSweep.sweep?.rows.has(row.id) ? cellSweep.sweep.colId : null}
            lead={lead}
          />,
        ]
        if (itemsVisible && ghost?.anchorId === row.id && !open && !renaming)
          rendered.push(
            <GhostRow
              key={`ghost-${row.id}`}
              padLeft={memberIndent(itemDepth)}
              closing={ghost.closing}
              {...ghostRowProps}
            />,
          )
        return rendered
      }),
      ...(g.children ?? []).flatMap((child) => renderRows(child, itemDepth, itemsVisible)),
    ]
    return [
      <GroupBand
        key={`gb-${g.key}`}
        node={bands.byKey.get(g.key)}
        bands={interactions.bandView}
        indent={groupIndent(depth)}
      >
        {members}
      </GroupBand>,
    ]
  }
  return (
    <div
      ref={(el) => {
        host.viewRootRef.current = el
      }}
      className={cx('table table-view', overflowing && 'overflowing')}
    >
      {interactions.iconPicker}
      <LineZone {...interactions.listZone(groupIndent)}>
        <div
          className={cx(
            'table-grid',
            text.body.standard,
            viewOption(view, 'hide_borders') && 'no-borders',
            columns.length === 1 && 'single-column',
            hiding && 'col-hiding',
            sliding && 'col-sliding',
            dragShift !== null && 'col-dragging-active',
            resizing && 'col-resizing-active',
          )}
          style={{ minWidth: reflowWidth, '--cols': cols } as React.CSSProperties}
        >
          <div className="table-head" onTransitionEnd={onTrackTransitionEnd}>
            {columns.map((c, i) => (
              <ColumnHeader
                key={c.id}
                id={c.id}
                label={columnLabel(c, ctx.contexts)}
                icon={headerIcon(c)}
                align={alignByCol[i]}
                transform={gapShift(dragShift, i)}
                dragging={dragShift?.from === i}
                onDragStart={(e) => startColumnDrag(e, i)}
                onResize={resizeColumn}
                onResizeStart={startResize}
                onResizeAbort={abortResize}
                onResizeEnd={endResize}
                onResizeCommit={commitResize}
                onContextMenu={(e) => void openHeaderMenu(c, e)}
              />
            ))}
          </div>
          {groups.flatMap((g) => renderRows(g, 0, true))}
          {interactions.ghostStanding && (
            <GhostRow padLeft={indent(0)} closing={false} {...ghostRowProps} />
          )}
        </div>
      </LineZone>
      <ValueSeat seat={seat} />
      {massPicker()}
    </div>
  )
}

type RowCellApi = {
  menu: (row: ViewRow, col: ResolvedColumn, e: React.MouseEvent) => void
  click: (row: ViewRow, col: ResolvedColumn, e: React.MouseEvent) => void
  pane: (row: ViewRow, col: ResolvedColumn, anchor: HTMLElement) => void
  title: (row: ViewRow, renaming: boolean, hideIcon: boolean) => React.ReactNode
  overlay: (row: ViewRow, col: ResolvedColumn) => React.ReactNode
  commit: (row: ViewRow, col: ResolvedColumn, next: PropertyValue | null) => void
  grip: (row: ViewRow, e: React.MouseEvent) => void
  open: (row: ViewRow) => void
  sweep: (row: ViewRow, col: ResolvedColumn, e: React.PointerEvent) => boolean
  hover: GhostAnchor['onHover']
}

function GhostRow({
  padLeft,
  columns,
  hideIcon,
  closing,
  onClosed,
  onEnter,
  onLeave,
  onCreate,
}: {
  padLeft: string | undefined
  columns: ResolvedColumn[]
  hideIcon: boolean
  closing: boolean
  onClosed: () => void
  onEnter: () => void
  onLeave: () => void
  onCreate: () => void
}): React.JSX.Element {
  return (
    <Reveal open={!closing} enterOnMount onCollapsed={onClosed}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/useSemanticElements: a hover-born affordance that must use the row grid's own chrome — a real <button> can't host a .data-row, and keyboard creation lives in the menus */}
      <div
        data-ghost-root
        className="data-row ghost-row"
        role="button"
        tabIndex={-1}
        aria-label="New Page"
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onClick={onCreate}
      >
        {columns.map((c, i) => (
          <div
            key={c.id}
            className={cx('data-cell', 'ghost-worn', i === 0 && 'cell-lead')}
            style={i === 0 ? { paddingLeft: padLeft } : undefined}
          >
            {c.kind === 'title' && (
              <span className="cell-title">
                {hideIcon ? null : <EntityIcon kind="page" size="body" />}
                <span className="cell-title-text">New Page</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </Reveal>
  )
}

const DataRow = memo(function DataRow({
  row,
  columns,
  ctx,
  padLeft,
  dragShift,
  alignByCol,
  styleByCol,
  api,
  overlayCol,
  popoverCol,
  activeCol,
  hideIcon,
  selected,
  dragDisabled,
  sweepCol,
  lead,
}: {
  row: ViewRow
  columns: ResolvedColumn[]
  ctx: ValueContext
  padLeft: string | undefined
  dragShift: DragShift | null
  alignByCol: ColumnAlign[]
  styleByCol: ColumnStyle[]
  api: RowCellApi
  overlayCol: string | null
  popoverCol: string | null
  activeCol: string | null
  hideIcon: boolean
  selected: boolean
  dragDisabled: boolean
  sweepCol: string | null
  lead: boolean
}): React.JSX.Element {
  const { ref, handle } = useLineRow(row.id, { open: () => api.open(row) })
  return (
    <div
      ref={ref}
      data-rid={row.id}
      data-reveal-host=""
      className={cx('data-row', selected && 'selected', lead && 'row-lead')}
      {...rowHover(row, api.hover)}
      {...handle}
    >
      {columns.map((c, i) => {
        const style: React.CSSProperties = {
          transform: gapShift(dragShift, i),
          textAlign: alignByCol[i],
        }
        if (i === 0 && alignByCol[i] === 'left') style.paddingLeft = padLeft
        const stateCx = activeCol === c.id && 'cell-active'
        const opened = overlayCol === c.id
        const content =
          c.kind === 'title'
            ? api.title(row, opened, hideIcon)
            : ((opened ? api.overlay(row, c) : null) ?? (
                <Cell
                  row={row}
                  column={c}
                  ctx={ctx}
                  style={styleByCol[i]}
                  showFullLink={popoverCol === c.id}
                  commit={(next) => api.commit(row, c, next)}
                  onPane={(anchor) => api.pane(row, c, anchor)}
                />
              ))
        return (
          // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
          <div
            key={c.id}
            className={cx(
              'data-cell',
              i === 0 && 'cell-lead',
              dragShift?.from === i && 'col-dragging',
              sweepCol === c.id && 'cell-sweep',
              stateCx,
            )}
            style={style}
            onContextMenu={(e) => api.menu(row, c, e)}
            onPointerDown={(e) => {
              if (api.sweep(row, c, e)) e.stopPropagation()
            }}
            onClick={(e) => api.click(row, c, e)}
          >
            {i === 0 && (
              <span
                className="row-rail"
                aria-hidden="true"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.stopPropagation()}
              />
            )}
            {i === 0 && (
              // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a bubble guard, not a control
              <span
                className={cx('row-grip', revealTarget)}
                // A right-press is defaulted away here — preventing only the context menu comes too late to stop a seated caret.
                onPointerDown={(e) => {
                  if (e.button === 2) e.preventDefault()
                }}
                onContextMenu={(e) => api.grip(row, e)}
                onClick={(e) => e.stopPropagation()}
                title={dragDisabled ? undefined : 'Drag to reorder'}
              >
                <Icon name="grip-vertical" size="body" />
              </span>
            )}
            {content}
          </div>
        )
      })}
    </div>
  )
})
