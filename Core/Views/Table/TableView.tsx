import { memo } from 'react'
import type { ResolvedGroup, ViewRow } from '../viewRow'
import type { ColumnStyle } from '../../Properties/columnStyles'
import { type ColumnAlign, viewOption } from '../views'
import { pickKindOf, type ResolvedColumn } from '../../Properties/properties'
import { fillInput } from '@pommora/uix/Fields/fields.css'
import { ValueSeat } from '../../Properties/Pickers/ValueSeat'
import type { ViewHostApi } from '../Host/useViewHost'
import {
  type ItemApi,
  rowHover,
  useViewInteractions,
  type ViewInteractions,
} from '../Host/useViewInteractions'
import { isSelected, useSession } from '../../Session/store'
import { RenamableName } from '../../Interface/RenamableTitle'
import type { ValueContext } from '../../Properties/valueContext'
import { isCmd, isSecondaryClick } from '@pommora/uix/Interactions/chords'
import { Cell } from '../../Properties/Cells/Cell'
import { EntityIcon } from '../../Assets/EntityIcon'
import { GroupBand } from '../Bands/GroupBand'
import { rowIndent } from '@pommora/uix/Table/rowIndent'
import { RowLead } from '@pommora/uix/Table/RowLead'
import { memberDepth, memberIndent } from '../Bands/bandModel'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { columnIcon, columnLabel } from '../../Properties/columnDisplay'
import { type ColumnDrag, gapShift, useColumns } from './useColumns'
import { cx } from '@pommora/uix/Utilities/cx'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { overScrollLabel } from '@pommora/uix/Interactions/OverScroll'
import { text } from '@pommora/uix/Theme'
import { Icon } from '@pommora/uix/Symbols'
import './table-view.css'
import { useCellSweep } from './useCellSweep'
import { LineRow, LineZone } from '@pommora/uix/Interactions/drag'

export function TableView({ host }: { host: ViewHostApi }): React.JSX.Element {
  const { view, columns, groups, ctx, rowById, bands, disclosure, dragDisabled } = host
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
  const ghostRowProps = {
    columns,
    hideIcon,
    onClosed: interactions.onGhostClosed,
    rootProps: interactions.ghostRootProps,
  }
  let renderedAnyRow = false
  const renderRows = (g: ResolvedGroup, depth: number, visible: boolean): React.JSX.Element => {
    const itemsVisible = visible && disclosure.isOpen(g.key)
    const itemDepth = memberDepth(g.kind, depth)
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
            padLeft={memberIndent(g.kind, depth)}
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
          />,
        ]
        if (itemsVisible && interactions.ghostAt === row.id)
          rendered.push(
            <GhostRow
              key={`ghost-${row.id}`}
              padLeft={memberIndent(g.kind, depth)}
              closing={interactions.ghostClosing}
              {...ghostRowProps}
            />,
          )
        return rendered
      }),
      ...(g.children ?? []).map((child) => renderRows(child, itemDepth, itemsVisible)),
    ]
    return (
      <GroupBand
        key={`gb-${g.key}`}
        node={bands.byKey.get(g.key)}
        bands={interactions.bandView}
        indent={rowIndent(depth)}
      >
        {members}
      </GroupBand>
    )
  }
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
          {groups.map((g) => renderRows(g, 0, true))}
          {interactions.ghostStanding && (
            <GhostRow padLeft={memberIndent('tail', 0)} closing={false} {...ghostRowProps} />
          )}
        </div>
      </LineZone>
      <ValueSeat seat={seat} />
    </div>
  )
}

type RowItem = ItemApi & {
  sweep: (row: ViewRow, col: ResolvedColumn, e: React.PointerEvent) => boolean
}

const titleGlyph = (el: HTMLElement): HTMLElement => {
  const cell = el.closest<HTMLElement>('.data-cell') ?? el
  return cell.querySelector<HTMLElement>('.cell-title > :first-child') ?? cell
}

function GhostRow({
  padLeft,
  columns,
  hideIcon,
  closing,
  onClosed,
  rootProps,
}: {
  padLeft: string
  columns: ResolvedColumn[]
  hideIcon: boolean
  closing: boolean
  onClosed: () => void
  rootProps: ViewInteractions['ghostRootProps']
}): React.JSX.Element {
  return (
    <Reveal open={!closing} enterOnMount onCollapsed={onClosed}>
      {/* biome-ignore lint/a11y/useSemanticElements: a hover-born affordance that must use the row grid's own chrome — a real <button> can't host a .data-row, and keyboard creation lives in the menus */}
      <div
        {...rootProps}
        className="data-row ghost-row"
        role="button"
        tabIndex={-1}
        aria-label="New Page"
      >
        {columns.map((c, i) => {
          const title = c.kind === 'title' && (
            <span className="cell-title">
              {hideIcon ? null : <EntityIcon kind="page" size="body" />}
              <span className="cell-title-text">New Page</span>
            </span>
          )
          return i === 0 ? (
            <RowLead key={c.id} className="ghost-worn" indent={padLeft}>
              {title}
            </RowLead>
          ) : (
            <div key={c.id} className="data-cell ghost-worn">
              {title}
            </div>
          )
        })}
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
  const selected = useSession(isSelected('page', row.id))
  const pageMenu = (e: React.MouseEvent): void =>
    void api.pageMenu(row, e, titleGlyph(e.currentTarget as HTMLElement))
  return (
    <LineRow
      id={row.id}
      open={() => api.open(row, false)}
      immovable={dragDisabled}
      data-rid={row.id}
      data-reveal-host=""
      className={cx('data-row', selected && 'selected', lead && 'row-lead')}
      {...rowHover(row, api.hover)}
    >
      {columns.map((c, i) => {
        const style: React.CSSProperties = {
          transform: gapShift(dragShift, i),
          textAlign: alignByCol[i],
        }
        const content =
          c.kind === 'title' ? (
            <span className={naming ? 'cell-rename' : cx(overScrollLabel, 'cell-title')}>
              {hideIcon ? null : <EntityIcon kind="page" icon={row.icon} size="body" />}
              <RenamableName
                title={row.title}
                kind="page"
                rename={{ path: row.path, editing: naming !== null, onEnd: api.endNaming }}
                create={naming?.create}
                className={fillInput}
                renames="title"
              >
                {(shown) => <span className="cell-title-text">{shown}</span>}
              </RenamableName>
            </span>
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
          onClick: (e: React.MouseEvent) => {
            if (c.kind !== 'title') return api.click(row, c, e)
            // A secondary-click fires `click` alongside `contextmenu`, so bail and let the right-click menu win.
            if (isSecondaryClick(e)) return
            e.stopPropagation()
            api.open(row, isCmd(e))
          },
        }
        if (i > 0)
          return (
            <div key={c.id} {...cell} className={cx('data-cell', cell.className)}>
              {content}
            </div>
          )
        return (
          <RowLead key={c.id} {...cell} indent={alignByCol[i] === 'left' ? padLeft : undefined}>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a bubble guard, not a control */}
            <span
              className={cx('row-grip', revealTarget)}
              // A right-press is defaulted away here — preventing only the context menu comes too late to stop a seated caret.
              onPointerDown={(e) => {
                if (e.button === 2) e.preventDefault()
              }}
              onContextMenu={pageMenu}
              onClick={(e) => e.stopPropagation()}
              title={dragDisabled ? undefined : 'Drag to reorder'}
            >
              <Icon name="grip-vertical" size="body" />
            </span>
            {content}
          </RowLead>
        )
      })}
    </LineRow>
  )
})
