import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Checkbox } from '@renderer/design-system/components/Checkbox'
import { SearchField } from '@renderer/design-system/components/SearchField'
import { OverflowScroll } from '@renderer/design-system/components/OverflowScroll'
import { cx } from '@renderer/design-system/cx'
import { entityIcon, Icon } from '@renderer/design-system/symbols'
import { text } from '@renderer/design-system/tokens'
import { DEFAULT_TIME_FORMAT, type Personalization, type TrashRow } from '@shared/types'
import { PropertyTypeIcon } from '../Components/Detail/PropertyTypes'
import { formatDate } from '../Detail/Views/PropertyEditing/formatValue'
import { fuzzyScore } from '../Navigation/navSearch'
import { useSession } from '../store'
import '../Navigation/navList.css'
import './trashLeaf.css'

/** A deleted entity carries no column configuration to read a format from, so the surface names the
 *  one it wants: the date a person would say out loud, and the clock the nexus is set to. */
const DATE_FORMAT = 'short' as const

/** The kinds a row can be, as plurals, for a report that can say what it acted on. */
const PLURALS: Record<TrashRow['kind'], string> = {
  page: 'pages',
  collection: 'collections',
  set: 'sets',
  space: 'spaces',
  context: 'contexts',
}

/** "3 pages" when every row is one kind, "3 items" when they are not — the counts carry the
 *  meaning either way. */
export function countPhrase(rows: TrashRow[]): string {
  const kinds = new Set(rows.map((r) => r.kind))
  const noun =
    kinds.size === 1
      ? rows.length === 1
        ? [...kinds][0]
        : PLURALS[[...kinds][0]]
      : rows.length === 1
        ? 'item'
        : 'items'
  return `${rows.length} ${noun}`
}

/** Rows whose title or location answers the query, best first. Empty query keeps the list whole and
 *  in the order main sent it, which is newest first. */
export function filterRows(rows: TrashRow[], query: string): TrashRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  const scored: { row: TrashRow; score: number }[] = []
  for (const row of rows) {
    const where = row.crumbs.map((c) => c.title).join(' ')
    const score = Math.max(
      fuzzyScore(row.title.toLowerCase(), q) ?? Number.NEGATIVE_INFINITY,
      fuzzyScore(where.toLowerCase(), q) ?? Number.NEGATIVE_INFINITY,
    )
    if (score > Number.NEGATIVE_INFINITY) scored.push({ row, score })
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.row)
}

export function TrashLeaf(): React.JSX.Element {
  const timeFormat = useSession((s) => s.tree?.timeFormat ?? DEFAULT_TIME_FORMAT)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const [rows, setRows] = useState<TrashRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())

  // `.trash` is excluded from the watcher by design, so nothing is ever pushed: the list is asked
  // for on open and again after every action this leaf takes. A deletion made elsewhere while it
  // is open leaves the list behind until it is reopened.
  const refresh = useCallback(async (): Promise<void> => {
    const res = await window.nexus.listTrash()
    if (!res.ok) {
      setFailed(true)
      return
    }
    setFailed(false)
    setRows(res.value)
    setChecked((prev) => {
      const live = new Set(res.value.map((r) => r.bundlePath))
      const next = new Set([...prev].filter((p) => live.has(p)))
      return next.size === prev.size ? prev : next
    })
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const shown = useMemo(() => filterRows(rows ?? [], query), [rows, query])
  const allChecked = shown.length > 0 && shown.every((r) => checked.has(r.bundlePath))
  const someChecked = shown.some((r) => checked.has(r.bundlePath))

  const toggle = (bundlePath: string): void =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (!next.delete(bundlePath)) next.add(bundlePath)
      return next
    })

  const toggleAll = (on: boolean): void =>
    setChecked((prev) => {
      const next = new Set(prev)
      for (const r of shown) {
        if (on) next.add(r.bundlePath)
        else next.delete(r.bundlePath)
      }
      return next
    })

  return (
    <div className="trash-leaf">
      <div className="trash-search">
        <Icon name="search" size={14} />
        <SearchField
          className={text.body.standard}
          value={query}
          onValueChange={setQuery}
          placeholder="Search Trash…"
          // Escape belongs to the field while it holds a query; the window's own listener stands
          // down on a handled press, so clearing never also closes.
          onKeyDown={(e) => {
            if (e.key === 'Escape' && query) {
              e.preventDefault()
              setQuery('')
            }
          }}
        />
      </div>

      <div className={cx('trash-head', text.caption.standard)}>
        <span className="trash-head-name">
          <Checkbox
            state={allChecked ? true : someChecked ? 'mixed' : false}
            onChange={toggleAll}
            ariaLabel="Select all"
          />
          <PropertyTypeIcon type="title" size={13} />
          File Name
        </span>
        <span className="trash-head-date">
          <Icon name="clock-fading" size={13} />
          Time Deleted
        </span>
      </div>

      {failed ? (
        <div className={cx('trash-empty', text.body.standard)}>The trash couldn't be read.</div>
      ) : rows === null ? (
        <div className="trash-empty" />
      ) : shown.length === 0 ? (
        <div className={cx('trash-empty', text.body.standard)}>
          {rows.length === 0 ? 'Trash is empty.' : 'Nothing matches.'}
        </div>
      ) : (
        <div className="trash-scroll edge-fade">
          <div className="nav-list">
            {shown.map((row) => (
              <TrashRowView
                key={row.bundlePath}
                row={row}
                checked={checked.has(row.bundlePath)}
                onToggle={() => toggle(row.bundlePath)}
                icon={entityIcon(row.kind, undefined, defaultIcons)}
                defaultIcons={defaultIcons}
                when={
                  row.deletedAt === null
                    ? ''
                    : formatDate(new Date(row.deletedAt).toISOString(), DATE_FORMAT, timeFormat)
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** A row wears its KIND's glyph rather than any icon the entity was decorated with, so what a row
 *  *is* can never be mistaken for how it was dressed. */
function TrashRowView({
  row,
  checked,
  onToggle,
  icon,
  when,
  defaultIcons,
}: {
  row: TrashRow
  checked: boolean
  onToggle: () => void
  icon: string
  when: string
  defaultIcons: Personalization['defaultIcons']
}): React.JSX.Element {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: a pointer convenience over the checkbox inside it, which already carries the role, the tab stop and the keyboard — a second stop per row would say there were two things to reach
    <div className={cx('nav-item', row.historical && 'is-historical')} onClick={onToggle}>
      <Checkbox
        className="trash-check"
        state={checked}
        onChange={onToggle}
        ariaLabel={`Select ${row.title}`}
      />
      <div className="nav-item-main">
        <Icon name={icon} size={15} className="nav-item-lead" />
        <OverflowScroll className="nav-item-title">{row.title}</OverflowScroll>
        {row.crumbs.length > 0 && (
          <OverflowScroll className={cx('nav-item-path', text.caption.standard)}>
            {row.crumbs.map((crumb, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a breadcrumb is strictly positional
              <Fragment key={i}>
                {i > 0 && <span className="nav-path-sep">›</span>}
                {crumb.kind && (
                  <Icon
                    name={entityIcon(crumb.kind, undefined, defaultIcons)}
                    size={12}
                    className="nav-path-icon"
                  />
                )}
                <span className="nav-path-name">{crumb.title}</span>
              </Fragment>
            ))}
          </OverflowScroll>
        )}
      </div>
      <span className={cx('trash-date', text.caption.standard)}>{when}</span>
    </div>
  )
}
