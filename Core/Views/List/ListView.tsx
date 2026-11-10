import { memo } from 'react'
import { Segments } from '@pommora/uix/Elements/Segments'
import { LineZone } from '@pommora/uix/Interactions/drag'
import { overScrollLabel } from '@pommora/uix/Interactions/OverScroll'
import { AccessoryButton } from '@pommora/uix/Menus/MenuRows'
import { RowLead } from '@pommora/uix/Table/RowLead'
import { text } from '@pommora/uix/Theme'
import { cx } from '@pommora/uix/Utilities/cx'
import { SeatedValue, seatOf } from '../../Properties/Cells/SeatedValue'
import type { ColumnStyle } from '../../Properties/columnStyles'
import { ValueSeat } from '../../Properties/Pickers/ValueSeat'
import type { ResolvedColumn } from '../../Properties/properties'
import type { ValueContext } from '../../Properties/valueContext'
import type { ViewHostApi } from '../Host/useViewHost'
import { type ItemApi, useViewInteractions } from '../Host/useViewInteractions'
import { addable, drawnColumns } from '../Pipeline/columns'
import {
  BandRows,
  GhostTitle,
  PageRow,
  PageTitle,
  RowGrip,
  rowMenu,
  rowOpen,
} from '../Rows/RowFrame'
import type { ViewRow } from '../viewRow'
import { type SavedView, type Side, viewOption } from '../views'
import { sideFor } from './listSides'
import '../Rows/table-shell.css'
import './list-view.css'

export function ListView({ host }: { host: ViewHostApi }): React.JSX.Element {
  const { view, columns, ctx, styleById, dragDisabled } = host
  const interactions = useViewInteractions(host, {
    ghost: { graceMs: 0 },
    seat: { anchor: seatOf, drawn: (row) => drawnColumns(row, columns, true) },
    newPages: 'pair',
    item: {},
  })
  const { seat } = interactions
  const open = seat.open

  // ── The render ────────────────────────────────────────────────────────────

  const hideIcon = viewOption(view, 'hide_page_icons')
  return (
    <div ref={host.viewRootRef} className="table table-shell list-view">
      <LineZone {...interactions.listZone()}>
        <div
          className={cx(
            'table-grid no-borders',
            text.body.standard,
            !viewOption(view, 'hide_outlines') && 'outlined',
            viewOption(view, 'wrap_rows') && 'wraps',
          )}
        >
          <BandRows
            host={host}
            interactions={interactions}
            fill
            ghost={(padLeft) => (
              <RowLead className="ghost-worn" indent={padLeft}>
                <div className="list-view-group">
                  <GhostTitle hideIcon={hideIcon} />
                </div>
              </RowLead>
            )}
            row={(row, { padLeft, lead }) => (
              <ListPageRow
                key={row.id}
                row={row}
                view={view}
                columns={columns}
                ctx={ctx}
                styleById={styleById}
                padLeft={padLeft}
                lead={lead}
                api={interactions.item}
                naming={host.naming?.id === row.id ? host.naming : null}
                editing={open?.mode === 'editor' && open.rowId === row.id ? open.columnId : null}
                adding={open?.mode === 'add' && open.rowId === row.id}
                hideIcon={hideIcon}
                dragDisabled={dragDisabled}
              />
            )}
          />
        </div>
      </LineZone>
      <ValueSeat seat={seat} />
    </div>
  )
}

// ── A row ───────────────────────────────────────────────────────────────────

const ListPageRow = memo(function ListPageRow({
  row,
  view,
  columns,
  ctx,
  styleById,
  padLeft,
  lead,
  api,
  naming,
  editing,
  adding,
  hideIcon,
  dragDisabled,
}: {
  row: ViewRow
  view: SavedView
  columns: ResolvedColumn[]
  ctx: ValueContext
  styleById: Map<string, ColumnStyle>
  padLeft: string
  lead: boolean
  api: ItemApi
  naming: ViewHostApi['naming']
  editing: string | null
  adding: boolean
  hideIcon: boolean
  dragDisabled: boolean
}): React.JSX.Element {
  const pageMenu = rowMenu(api, row)
  const drawn = drawnColumns(row, columns, true)
  const item = (c: ResolvedColumn): React.JSX.Element =>
    c.kind === 'title' ? (
      // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the row has the keys, and Enter opens it
      <span
        key={c.id}
        className="list-view-title"
        data-title={row.title}
        onClick={rowOpen(api, row)}
      >
        <PageTitle row={row} naming={naming} hideIcon={hideIcon} api={api} />
      </span>
    ) : (
      <SeatedValue
        key={c.id}
        className="value-inline"
        row={row}
        column={c}
        ctx={ctx}
        style={styleById.get(c.id)!}
        api={api}
        editor={editing === c.id ? api.editor(row, c) : null}
      />
    )
  const on = (side: Side): React.JSX.Element[] =>
    columns
      .filter((c) => sideFor(c, view) === side && (c.kind === 'title' || drawn.includes(c)))
      .map(item)
  const right = on('right')
  const add = addable(drawn, ctx.schema, ctx.contexts) && (
    <AccessoryButton
      icon="plus"
      size="body"
      ariaLabel="Add Property"
      create
      reveal
      data-reveal-held={adding || undefined}
      tabIndex={-1}
      onClick={(e) => api.openAdd(row, e.currentTarget)}
    />
  )
  return (
    <PageRow row={row} api={api} lead={lead} dragDisabled={dragDisabled}>
      <RowLead indent={padLeft} onContextMenu={pageMenu}>
        <RowGrip onMenu={pageMenu} dragDisabled={dragDisabled} />
        <div className="list-view-line">
          <div className={cx('list-view-group', overScrollLabel)}>
            <Segments parts={on('left')} />
            {right.length === 0 && add}
          </div>
          {right.length > 0 && (
            <div className={cx('list-view-group list-view-right', overScrollLabel)}>
              <Segments parts={right} />
              {add}
            </div>
          )}
        </div>
      </RowLead>
    </PageRow>
  )
})
