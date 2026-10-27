import { memo, type ReactNode, useMemo, useState } from 'react'
import { Checkbox } from '@pommora/uix/Controls/Checkbox'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { historical } from '@pommora/uix/Elements/nav-trail.css'
import { isSecondaryClick } from '@pommora/uix/Interactions/chords'
import { LineZone, lineList, useLineRow } from '@pommora/uix/Interactions/drag'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { overScrollLabel } from '@pommora/uix/Interactions/OverScroll'
import { useVirtualRows } from '@pommora/uix/Interactions/virtualRows'
import { DropOutline } from '@pommora/uix/Menus'
import { Icon } from '@pommora/uix/Symbols'
import { rowIndent } from '@pommora/uix/Table/rowIndent'
import { RowRail } from '@pommora/uix/Table/RowRail'
import { text } from '@pommora/uix/Theme'
import { cx } from '@pommora/uix/Utilities/cx'
import { useStableApi } from '@pommora/uix/Utilities/stableApi'
import { entityIcon } from '../Assets/entityIconPolicy'
import { propertyTypeIconName } from '../Properties/typeDisplay'
import { personalizationOf } from '../Session/configSlice'
import { useSession } from '../Session/store'
import type { Personalization } from '../Settings/personalization'
import { COLUMN_LAYOUT } from '../Views/Table/useColumns'
import { crumbSegments, type useBundleBrowser } from './browser'
import type { BundleRow } from './rows'
import './bundle-table.css'

type Browser = ReturnType<typeof useBundleBrowser>

/** TableView's row as it draws, measured live: the cell's padding around a body line its inline title stands a little taller than, and the hairline between rows. */
const ROW_H = 29.75

/** The table's grid in its body type, each skin setting its own heading and rows in it: the title track, at least TableView's title width, and the date track, the date column's measured width inside the cell's padding; narrower than both, it scrolls sideways. */
export function BundleTable({
  date: { width },
  children,
}: {
  date: Browser['date']
  children: ReactNode
}): React.JSX.Element {
  const track =
    width === null
      ? `${COLUMN_LAYOUT.dateTime.width}px`
      : `calc(${width}px + 2 * var(--cell-padding-x))`
  const style = {
    '--cols': `minmax(${COLUMN_LAYOUT.title.width}px, 1fr) ${track}`,
    minWidth: `calc(${COLUMN_LAYOUT.title.width}px + ${track})`,
  } as React.CSSProperties
  return (
    <div className={cx('table-grid', text.body.standard)} style={style}>
      {children}
    </div>
  )
}

/** A store's date heading: `label` over the column's widest date, drawn unseen in the rows' type, so the column measures whichever is wider; a right-click picks the date's style. */
export function DateHeading({
  date,
  label,
  className,
}: {
  date: Browser['date']
  label: ReactNode
  className: string
}): React.JSX.Element {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a column label, as TableView's headings are
    <div className={cx('col-header', className)} onContextMenu={date.onContextMenu}>
      <span ref={date.measureRef} className="col-measure">
        {label}
        <span className={text.body.standard} aria-hidden>
          {date.sample}
        </span>
      </span>
    </div>
  )
}

type RowApi = Pick<Browser, 'toggle' | 'rowClick' | 'openMenu'> & {
  focus: (address: string) => void
}

/** A store's rows under its skin's heading, drawn in a window of `scrollEl` that keeps the row focus last stood on: one Tab stop whose arrows step between rows, whose Space acts as a click and whose Enter as a keyboard's, each row a tree item that discloses, checks, and opens through the browser. */
export function BundleRows({
  browser: { visible, checked, picked, date, toggle, rowClick, openMenu },
  scrollEl,
}: {
  browser: Pick<
    Browser,
    'visible' | 'checked' | 'picked' | 'date' | 'toggle' | 'rowClick' | 'openMenu'
  >
  scrollEl: HTMLElement | null
}): React.JSX.Element {
  const icons = useSession((s) => personalizationOf(s).defaultIcons)
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const keep = useMemo(() => {
    const at = visible.findIndex((t) => t.row.bundlePath === focused)
    return at < 0 ? null : at
  }, [visible, focused])
  const { rows: slots, height } = useVirtualRows(
    { count: visible.length, rowHeight: ROW_H, listEl, scrollEl, keep },
    [],
  )
  const api = useStableApi({ toggle, rowClick, openMenu, focus: setFocused })
  return (
    <LineZone {...lineList({ locked: true, commit: () => {}, label: () => '', watch: [] })}>
      <div ref={setListEl} className="bundle-rows" style={{ height }}>
        {slots.map(({ index, start }) => {
          const { row, depth, open } = visible[index]
          return (
            <BundleRowView
              key={row.bundlePath}
              row={row}
              depth={depth}
              open={open}
              start={start}
              lead={index === 0}
              checked={checked.has(row.bundlePath)}
              revealed={picked.length > 0}
              when={date.when(row.storedAt)}
              icons={icons}
              api={api}
            />
          )
        })}
      </div>
    </LineZone>
  )
}

/** A row's glyph: a property's by its type, any other item's own ahead of its kind's. */
const rowIcon = (row: BundleRow, icons: Personalization['defaultIcons']): string =>
  row.kind === 'property'
    ? row.propertyType
      ? propertyTypeIconName(row.propertyType)
      : 'tag'
    : entityIcon(row.kind, row.icon, icons)

const BundleRowView = memo(function BundleRowView({
  row,
  depth,
  open,
  start,
  lead,
  checked,
  revealed,
  when,
  icons,
  api,
}: {
  row: BundleRow
  depth: number
  open: boolean | null
  start: number
  lead: boolean
  checked: boolean
  revealed: boolean
  when: string
  icons: Personalization['defaultIcons']
  api: RowApi
}): React.JSX.Element {
  const chevron = open === null ? null : <DropOutline open={open} />
  const { ref, handle } = useLineRow(row.bundlePath, { open: () => api.rowClick(row, 0) })
  return (
    <div
      ref={ref}
      {...handle}
      tabIndex={handle.tabIndex}
      // Space checks a row as a click does, where Enter opens an Archive page as a double-click does.
      onKeyDown={(e) => {
        if (e.key !== ' ' || e.target !== e.currentTarget) return handle.onKeyDown(e)
        e.preventDefault()
        if (!e.repeat) api.rowClick(row, 1)
      }}
      className={cx('data-row', lead && 'row-lead')}
      data-reveal-host={revealed ? 'on' : ''}
      style={{ height: ROW_H, transform: `translateY(${start}px)` }}
      role="treeitem"
      aria-expanded={open ?? undefined}
      onFocus={() => api.focus(row.bundlePath)}
      onClick={(e) => {
        if (!isSecondaryClick(e)) api.rowClick(row, e.detail)
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        void api.openMenu(row)
      }}
    >
      <div className="data-cell cell-lead">
        <RowRail />
        <span className={cx('row-check', revealTarget)}>
          <Checkbox
            size="compact"
            state={checked}
            tabIndex={-1}
            onChange={() => api.toggle(row.bundlePath)}
            ariaLabel={`Select ${row.title}`}
          />
        </span>
        <span className="bundle-title" style={{ marginLeft: rowIndent(depth) }}>
          {depth > 0 && chevron && <span className="row-chevron">{chevron}</span>}
          <span className={cx(overScrollLabel, 'cell-title')}>
            <Icon name={rowIcon(row, icons)} size="body" />
            <span className={cx('cell-title-text', open !== null && text.body.emphasized)}>
              {row.title}
            </span>
          </span>
          {depth === 0 && chevron}
        </span>
        <NavTrail
          segments={crumbSegments(row.crumbs, icons)}
          iconSize="control"
          className={cx('bundle-trail', row.historical && historical)}
        />
        {row.partial && (
          <Icon
            name="triangle-alert"
            size="body"
            role="img"
            aria-label="Recorded Partly"
            className="bundle-partial"
          />
        )}
      </div>
      <div className="data-cell bundle-date">{when}</div>
    </div>
  )
})
