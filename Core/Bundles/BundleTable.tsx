import { memo, type ReactNode, useLayoutEffect, useMemo, useState } from 'react'
import { Checkbox } from '@pommora/uix/Controls/Checkbox'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { historical } from '@pommora/uix/Elements/nav-trail.css'
import { isSecondaryClick } from '@pommora/uix/Interactions/chords'
import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
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
import { formatDate } from '../Properties/formatValue'
import {
  type DateStyle,
  dateDefaults,
  holdsStyle,
  resolveStyle,
  storedPick,
} from '../Properties/columnStyles'
import { parseStyleAction, styleMenuItems } from '../Actions/columnMenu'
import { popMenu } from '../Actions/menuActions'
import { useNexusForms } from '../Views/Host/useColumnStyles'
import type { BundleStore } from '../Paths/bundleLayout'
import { propertyTypeIconName } from '../Properties/typeDisplay'
import { personalizationOf } from '../Session/configSlice'
import { useSession } from '../Session/store'
import type { Personalization } from '../Settings/personalization'
import { COLUMN_LAYOUT } from '../Views/Table/useColumns'
import { crumbSegments, type useBundleBrowser } from './browser'
import type { BundleRow } from './rows'
import './bundle-table.css'

type Browser = ReturnType<typeof useBundleBrowser>

const WIDEST_AT = new Date(2026, 8, 30, 12, 0)
const DAY_MS = 86_400_000

/** The widest a style writes: September, a Wednesday, the 30th, and a two-digit hour, each where the style shows it; a relative style's widest is a week ago with its clock, else a year's last month. */
export function widestDate(style: DateStyle): string {
  const now = new Date(WIDEST_AT.getTime() + (style.time_format === 'none' ? 350 : 7) * DAY_MS)
  return formatDate(
    WIDEST_AT.toISOString(),
    style.date_format,
    style.time_format,
    style.weekday,
    now,
  )
}

/** A store's date column: its stored style over the Nexus's date form, the heading's right-click, which picks one, and its width: the wider of the heading and its widest date, the hidden `sample`, as the host the view draws under `measureRef` measures them. */
export function useDateColumn(kind: BundleStore['kind']): {
  when: (storedAt: number | null) => string
  onContextMenu: (e: React.MouseEvent) => Promise<void>
  sample: string
  measureRef: (el: HTMLElement | null) => void
  width: number | null
} {
  const key = `${kind}ColumnStyle` as const
  const nexus = useNexusForms()
  const stored = useSession((s) => personalizationOf(s)[key])
  const setPersonalization = useSession((s) => s.setPersonalization)
  // A store shows when each item entered it, where a view's date column leaves the time hidden.
  const defaults = { ...dateDefaults(nexus.dateFormat), time_format: nexus.clock }
  const style = resolveStyle(stored, defaults, nexus.clock)
  const sample = widestDate(style)
  const [measured, measureRef] = useState<HTMLElement | null>(null)
  const [width, setWidth] = useState<number | null>(null)
  useLayoutEffect(() => {
    // A whole pixel over, since `offsetWidth` rounds and a cell's ellipsis engages on a fraction.
    if (measured) setWidth(measured.offsetWidth + 1)
  }, [measured, sample])
  return {
    when: (storedAt) =>
      storedAt === null
        ? ''
        : formatDate(
            new Date(storedAt).toISOString(),
            style.date_format,
            style.time_format,
            style.weekday,
          ),
    onContextMenu: async (e) => {
      e.preventDefault()
      const action = await popMenu(styleMenuItems({ type: 'dateTime', current: style }))
      const pick = action ? parseStyleAction(action) : null
      if (!pick) return
      const next = {
        ...stored,
        [pick.key]: storedPick(pick.key, pick.value, defaults, nexus.clock),
      }
      setPersonalization(key, holdsStyle(next) ? next : undefined)
    },
    sample,
    measureRef,
    width,
  }
}

type DateColumn = ReturnType<typeof useDateColumn>

/** TableView's row as it draws, measured live: the cell's padding around a body line its inline title stands a little taller than, and the hairline between rows. */
const ROW_H = 29.75

/** The table's grid in its body type, each skin setting its own heading and rows in it: the title track, at least TableView's title width, and the date track, the date column's measured width inside the cell's padding; narrower than both, it scrolls sideways. */
export function BundleTable({
  date: { width },
  children,
}: {
  date: DateColumn
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
  date: DateColumn
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

/** A store's rows under its skin's heading, drawn in a window of `scrollEl` that keeps the row focus last stood on: one Tab stop whose arrows step between rows, whose Space toggles a row's check and whose Enter acts as a keyboard's click, each row a tree item that discloses, checks, and opens through the browser. */
export function BundleRows({
  browser: { visible, checked, picked, toggle, rowClick, openMenu },
  date,
  scrollEl,
}: {
  browser: Pick<Browser, 'visible' | 'checked' | 'picked' | 'toggle' | 'rowClick' | 'openMenu'>
  date: DateColumn
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

export function BundleFooting({
  browser: { listing, visible },
  className,
  failed,
  empty,
}: {
  browser: Pick<Browser, 'listing' | 'visible'>
  className: string
  failed: string
  empty: string
}): React.JSX.Element | null {
  if (listing.status === 'loading' || visible.length > 0) return null
  const line =
    listing.status === 'failed' ? failed : listing.rows.length === 0 ? empty : 'Nothing matches.'
  return <div className={className}>{line}</div>
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
  return (
    <LineRow
      id={row.bundlePath}
      open={() => api.rowClick(row, 0)}
      space={() => api.toggle(row.bundlePath)}
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
    </LineRow>
  )
})
