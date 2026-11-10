import { memo } from 'react'
import type { ViewRow } from '../viewRow'
import type { ColumnStyle } from '../../Properties/columnStyles'
import { type ColumnAlign, viewOption } from '../views'
import { pickKindOf, type ResolvedColumn } from '../../Properties/properties'
import { ValueSeat } from '../../Properties/Pickers/ValueSeat'
import type { ViewHostApi } from '../Host/useViewHost'
import { type ItemApi, useViewInteractions } from '../Host/useViewInteractions'
import type { ValueContext } from '../../Properties/valueContext'
import { Cell } from '../../Properties/Cells/Cell'
import { RowLead } from '@pommora/uix/Table/RowLead'
import { columnIcon, columnLabel } from '../../Properties/columnDisplay'
import {
  BandRows,
  GhostTitle,
  PageRow,
  RowGrip,
  PageTitle,
  rowMenu,
  rowOpen,
} from '../Rows/RowFrame'
import { type ColumnDrag, gapShift, useColumns } from './useColumns'
import { cx } from '@pommora/uix/Utilities/cx'
import { text } from '@pommora/uix/Theme'
import { Icon } from '@pommora/uix/Symbols'
import '../Rows/table-shell.css'
import './table-view.css'
import { useCellSweep } from './useCellSweep'
import { LineZone } from '@pommora/uix/Interactions/drag'
import { overScrollLabel } from '@pommora/uix/Interactions/OverScroll'

export function TableView({ host }: { host: ViewHostApi }): React.JSX.Element {
  const { view, columns, ctx, rowById, dragDisabled } = host
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
    startResize,
    openHeaderMenu,
    startColumnDrag,
    onTrackTransitionEnd,
  } = useColumns(host)

  const titleColId = columns.find((c) => c.kind === 'title')?.id

  // ── The sweep ─────────────────────────────────────────────────────────────

  const cellSweep = useCellSweep({
    gridEl: () => host.viewRootRef.current,
    onSettle: (colId, rowIds, settleRowId) => {
      const at = columns.findIndex((c) => c.id === colId)
      const rowEl = host.viewRootRef.current?.querySelector(
        `[data-rid="${CSS.escape(settleRowId)}"]`,
      )
      const cell = rowEl?.children.item(at)
      const row = rowById.get(settleRowId)
      if (!(cell instanceof HTMLElement) || !row) return cellSweep.clear()
      seat.sweep(row, columns[at], rowIds, cell)
    },
  })
  const startSweep = (row: ViewRow, col: ResolvedColumn, e: React.PointerEvent): boolean => {
    if (pickKindOf(col.type) === null) return false
    if (e.button !== 0 || (e.target as Element).closest('.row-grip')) return false
    cellSweep.begin(row.id, col.id, e)
    return true
  }

  const interactions = useViewInteractions(host, {
    ghost: { graceMs: 0 },
    seat: {
      anchor: (el) => el.closest<HTMLElement>('.data-cell') ?? el,
      onClose: () => cellSweep.clear(),
    },
    newPages: 'pair',
    item: { sweep: startSweep },
  })
  const { seat } = interactions

  const open = seat.open
  const paneTarget =
    open && open.mode !== 'add' ? { rowId: open.rowId, colId: open.columnId } : null
  const editorTarget = open?.mode === 'editor' ? paneTarget : null
  const popoverTarget = open?.mode === 'popover' ? paneTarget : null
  const activeCell =
    host.naming && titleColId ? { rowId: host.naming.id, colId: titleColId } : paneTarget

  // ── The render ────────────────────────────────────────────────────────────

  const hideIcon = viewOption(view, 'hide_page_icons')
  const ghost = (padLeft: string): React.ReactNode =>
    columns.map((c, i) => {
      const title = c.kind === 'title' && <GhostTitle hideIcon={hideIcon} />
      return i === 0 ? (
        <RowLead key={c.id} className="ghost-worn" indent={padLeft}>
          {title}
        </RowLead>
      ) : (
        <div key={c.id} className="data-cell ghost-worn">
          {title}
        </div>
      )
    })
  return (
    <div ref={host.viewRootRef} className={cx('table table-shell', overflowing && 'overflowing')}>
      <LineZone {...interactions.listZone()}>
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
          <div className="table-head" data-view-lead="head" onTransitionEnd={onTrackTransitionEnd}>
            {columns.map((c, i) => (
              // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
              <div
                key={c.id}
                className={cx('col-header', dragShift?.from === i && 'col-dragging')}
                style={{ transform: gapShift(dragShift, i), textAlign: alignByCol[i] }}
                onPointerDown={(e) => startColumnDrag(e, i)}
                onContextMenu={(e) => void openHeaderMenu(c, e)}
              >
                {iconsShown && (
                  <span className="col-header-icon">
                    <Icon name={columnIcon(c, ctx.contexts)} size="body" />
                  </span>
                )}
                {columnLabel(c, ctx.contexts)}
                <span className="col-resizer" onPointerDown={(e) => startResize(e, c.id)} />
              </div>
            ))}
          </div>
          <BandRows
            host={host}
            interactions={interactions}
            ghost={ghost}
            row={(row, { padLeft, lead }) => (
              <DataRow
                key={row.id}
                row={row}
                columns={columns}
                ctx={ctx}
                padLeft={padLeft}
                dragShift={dragShift}
                alignByCol={alignByCol}
                styleByCol={styleByCol}
                api={interactions.item}
                naming={host.naming?.id === row.id ? host.naming : null}
                editingCol={editorTarget?.rowId === row.id ? editorTarget.colId : null}
                popoverCol={popoverTarget?.rowId === row.id ? popoverTarget.colId : null}
                activeCol={activeCell?.rowId === row.id ? activeCell.colId : null}
                hideIcon={hideIcon}
                dragDisabled={dragDisabled}
                sweepCol={cellSweep.sweep?.rows.has(row.id) ? cellSweep.sweep.colId : null}
                lead={lead}
              />
            )}
          />
        </div>
      </LineZone>
      <ValueSeat seat={seat} />
    </div>
  )
}

type RowItem = ItemApi & {
  sweep: (row: ViewRow, col: ResolvedColumn, e: React.PointerEvent) => boolean
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
  naming,
  editingCol,
  popoverCol,
  activeCol,
  hideIcon,
  dragDisabled,
  sweepCol,
  lead,
}: {
  row: ViewRow
  columns: ResolvedColumn[]
  ctx: ValueContext
  padLeft: string
  dragShift: ColumnDrag | null
  alignByCol: ColumnAlign[]
  styleByCol: ColumnStyle[]
  api: RowItem
  naming: ViewHostApi['naming']
  editingCol: string | null
  popoverCol: string | null
  activeCol: string | null
  hideIcon: boolean
  dragDisabled: boolean
  sweepCol: string | null
  lead: boolean
}): React.JSX.Element {
  const pageMenu = rowMenu(api, row)
  const open = rowOpen(api, row)
  return (
    <PageRow row={row} api={api} lead={lead} dragDisabled={dragDisabled}>
      {columns.map((c, i) => {
        const style: React.CSSProperties = {
          transform: gapShift(dragShift, i),
          textAlign: alignByCol[i],
        }
        const content =
          c.kind === 'title' ? (
            <PageTitle
              row={row}
              naming={naming}
              hideIcon={hideIcon}
              api={api}
              className={overScrollLabel}
            />
          ) : (
            ((editingCol === c.id ? api.editor(row, c) : null) ?? (
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
          )
        // A cell takes no tab stop: per-cell stops are wrong and roving tabindex is a feature, so the row has the keys.
        const cell = {
          className: cx(
            dragShift?.from === i && 'col-dragging',
            sweepCol === c.id && 'cell-sweep',
            activeCol === c.id && 'cell-active',
          ),
          style,
          onContextMenu: (e: React.MouseEvent) =>
            c.kind === 'title' ? pageMenu(e) : void api.menu(row, c, e),
          onPointerDown: (e: React.PointerEvent) => {
            if (api.sweep(row, c, e)) e.stopPropagation()
          },
          onClick: (e: React.MouseEvent) => (c.kind === 'title' ? open(e) : api.click(row, c, e)),
        }
        if (i > 0)
          return (
            <div key={c.id} {...cell} className={cx('data-cell', cell.className)}>
              {content}
            </div>
          )
        return (
          <RowLead key={c.id} {...cell} indent={alignByCol[i] === 'left' ? padLeft : undefined}>
            <RowGrip onMenu={pageMenu} dragDisabled={dragDisabled} />
            {content}
          </RowLead>
        )
      })}
    </PageRow>
  )
})
