import { memo, useRef } from 'react'
import { Bullet } from '@pommora/uix/Elements/Bullet'
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
import { type Marker, type SavedView, type Side, viewOption } from '../views'
import { sideFor } from './listSides'
import '../Rows/table-shell.css'
import './list-view.css'

const drawnOf = (row: ViewRow, columns: ResolvedColumn[]): ResolvedColumn[] =>
  drawnColumns(row, columns, true)
const TITLE = cx('list-view-title', text.body.emphasized)
const rowMarker = (marker: Marker): React.ReactNode =>
  marker === 'bullet' && <Bullet className="row-marker" aria-hidden="true" />

export function ListView({ host }: { host: ViewHostApi }): React.JSX.Element {
  const { view, columns, ctx, styleById, dragDisabled } = host
  const interactions = useViewInteractions(host, {
    ghost: { graceMs: 0 },
    seat: { anchor: seatOf, drawn: (row) => drawnOf(row, columns) },
    newPages: 'pair',
    item: {},
  })
  const { seat } = interactions
  const open = seat.open

  // ── The render ────────────────────────────────────────────────────────────

  const hideIcon = viewOption(view, 'hide_page_icons')
  const marker = viewOption(view, 'marker')
  return (
    <div ref={host.viewRootRef} className="table table-shell list-view">
      <LineZone {...interactions.listZone()}>
        <div
          className={cx(
            'table-grid no-borders',
            text.body.standard,
            !viewOption(view, 'hide_outlines') && 'outlined',
            viewOption(view, 'colored_outlines') && 'colored',
            viewOption(view, 'wrap_rows') && 'wraps',
          )}
        >
          <BandRows
            host={host}
            interactions={interactions}
            fill
            ghost={(padLeft) => (
              <RowLead className="ghost-worn" indent={padLeft}>
                {rowMarker(marker)}
                <div className="list-view-group">
                  <span className={TITLE}>
                    <GhostTitle hideIcon={hideIcon} />
                  </span>
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
                seatAnchor={open?.rowId === row.id ? seat.anchor.current : null}
                hideIcon={hideIcon}
                marker={marker}
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
  seatAnchor,
  hideIcon,
  marker,
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
  seatAnchor: HTMLElement | null
  hideIcon: boolean
  marker: Marker
  dragDisabled: boolean
}): React.JSX.Element {
  const addRef = useRef<HTMLButtonElement>(null)
  const pageMenu = rowMenu(api, row)
  const drawn = drawnOf(row, columns)
  const item = (c: ResolvedColumn): React.JSX.Element =>
    c.kind === 'title' ? (
      // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the row has the keys, and Enter opens it
      <span key={c.id} className={TITLE} data-title={row.title} onClick={rowOpen(api, row)}>
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
  const parts: Record<Side, React.JSX.Element[]> = { left: [], right: [] }
  for (const c of columns)
    if (c.kind === 'title' || drawn.includes(c)) parts[sideFor(c, view)].push(item(c))
  // Held, and kept mounted, while what it opened is open, though the value that landed left nothing to add.
  const held = seatAnchor !== null && seatAnchor === addRef.current
  const add = (held || addable(drawn, ctx.schema, ctx.contexts)) && (
    <AccessoryButton
      ref={addRef}
      icon="plus"
      size="body"
      ariaLabel="Add Property"
      className="list-view-add"
      create
      reveal
      data-reveal-held={held || undefined}
      tabIndex={-1}
      onClick={(e) => api.openAdd(row, e.currentTarget)}
    />
  )
  return (
    // A List row draws no selection fill; Table's row marks the selected page.
    <PageRow row={row} api={api} lead={lead} dragDisabled={dragDisabled}>
      <RowLead indent={padLeft} onContextMenu={pageMenu}>
        <RowGrip onMenu={pageMenu} dragDisabled={dragDisabled} />
        {rowMarker(marker)}
        <div className="list-view-line">
          <div className={cx('list-view-group', overScrollLabel)}>
            <Segments parts={parts.left} />
          </div>
          {parts.right.length > 0 && (
            <div className={cx('list-view-group list-view-right', overScrollLabel)}>
              <Segments parts={parts.right} />
            </div>
          )}
          {add}
        </div>
      </RowLead>
    </PageRow>
  )
})
