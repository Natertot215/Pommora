import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Checkbox } from '@renderer/design-system/components/Checkbox'
import { SearchField } from '@renderer/design-system/components/SearchField'
import { OverflowScroll } from '@renderer/design-system/components/OverflowScroll'
import { cx } from '@renderer/design-system/cx'
import { entityIcon, Icon } from '@renderer/design-system/symbols'
import { text } from '@renderer/design-system/tokens'
import type { MutateRequest } from '@shared/mutate'
import type { CollectionNode } from '@shared/types'
import { DEFAULT_TIME_FORMAT, type Personalization, type TrashRow } from '@shared/types'
import { PropertyTypeIcon } from '../Components/Detail/PropertyTypes'
import { formatDate } from '../Detail/Views/PropertyEditing/formatValue'
import { containerTargets, contextTargets } from '../destinationTree'
import { fuzzyScore } from '../Navigation/navSearch'
import { useSession } from '../store'
import '../Navigation/navList.css'
import '../Detail/Views/Table/table-tokens.css'
import '../Detail/Views/Table/Table.css'
import './trashLeaf.css'

/** A deleted entity carries no column configuration to read a format from, so the surface names the
 *  one it wants: the date a person would say out loud, and the clock the nexus is set to. */
const DATE_FORMAT = 'short' as const

/** Identity-stable, so a tree push with no collections can't re-run the destination walk. */
const EMPTY_COLLECTIONS: CollectionNode[] = []

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
  const kind = kinds.size === 1 ? [...kinds][0] : null
  if (rows.length === 1) return `1 ${kind ?? 'item'}`
  return `${rows.length} ${kind === null ? 'items' : PLURALS[kind]}`
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
  const tree = useSession((s) => s.tree)
  const collections = useSession((s) => s.tree?.collections ?? EMPTY_COLLECTIONS)
  const mutate = useSession((s) => s.mutate)
  const load = useSession((s) => s.load)
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
  const toggle = (bundlePath: string): void =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (!next.delete(bundlePath)) next.add(bundlePath)
      return next
    })

  /** A single action rides the store's mutate: its refetch is what makes a restored entity
   *  reachable without reloading the nexus, and its failure already reaches the user natively. */
  const one = async (req: MutateRequest): Promise<void> => {
    if (await mutate(req)) await refresh()
  }

  /** A batch calls the channel directly. `store.mutate` re-walks the whole nexus after every op,
   *  so five restores would pay five whole-tree reads; this pays one at the end. What it gives up
   *  is that action's free error dialog, so the report carries both halves itself. */
  const many = async (
    targets: TrashRow[],
    req: (row: TrashRow) => MutateRequest,
    reloads: boolean,
  ): Promise<{ done: TrashRow[]; failed: TrashRow[] }> => {
    const done: TrashRow[] = []
    const failed: TrashRow[] = []
    for (const row of targets) {
      const res = await window.nexus.mutate(req(row))
      ;(res.ok ? done : failed).push(row)
    }
    // One refresh for the whole batch, and none at all when nothing landed.
    if (done.length > 0 && reloads) await load()
    await refresh()
    return { done, failed }
  }

  const restoreBatch = async (targets: TrashRow[]): Promise<void> => {
    // A homeless member keeps its row and is named in the count; each is then answered through the
    // picker it already has. A batch is a convenience over the single action, never a second one.
    const addressable = targets.filter((r) => r.homeResolves)
    const { done, failed } = await many(
      addressable,
      (row) => ({ op: 'restore', bundlePath: row.bundlePath }),
      true,
    )
    const stuck = [...targets.filter((r) => !r.homeResolves), ...failed]
    void window.nexus.reportTrash(
      `Restored ${countPhrase(done)}.`,
      stuck.length === 0
        ? 'Everything went back where it came from.'
        : `${countPhrase(stuck)} could not be resolved — restore those one at a time to choose where they go.`,
    )
  }

  const emptyBatch = async (targets: TrashRow[]): Promise<void> => {
    if (!(await window.nexus.confirmEmptyTrash(targets.length))) return
    // Emptying happens wholly inside `.trash`, which the tree does not see.
    const { done, failed } = await many(
      targets,
      (row) => ({ op: 'emptyBundle', bundlePath: row.bundlePath }),
      false,
    )
    void window.nexus.reportTrash(
      `Deleted ${countPhrase(done)}.`,
      failed.length === 0
        ? 'They have left the trash for good.'
        : `${countPhrase(failed)} could not be deleted.`,
    )
  }

  const openMenu = async (row: TrashRow): Promise<void> => {
    // Right-clicking an unchecked row acts on that row alone, whatever else is checked — a checked
    // set is a deliberate construction, and a menu that silently retargeted it would spend it on a
    // click that never named it.
    // The batch is what the menu will actually act on — the CHECKED rows still in view. Deriving
    // its voice from the unfiltered selection would let a filtered right-click read "Restore All",
    // act on one row, and withhold the destination picker that row was owed.
    const inSet = checked.has(row.bundlePath) ? shown.filter((r) => checked.has(r.bundlePath)) : []
    const batch = inSet.length > 1
    const targets = batch ? inSet : [row]
    const homeless = !batch && !row.homeResolves
    const destinationKind = row.kind === 'space' ? ('context' as const) : ('container' as const)
    const action = await window.nexus.trashMenu({
      batch,
      ...(homeless
        ? {
            destinationKind,
            destinations:
              destinationKind === 'context' ? contextTargets(tree) : containerTargets(collections),
          }
        : {}),
    })
    if (!action) return
    switch (action.kind) {
      case 'restore':
        await one({ op: 'restore', bundlePath: row.bundlePath })
        break
      case 'restoreTo':
        await one({ op: 'restore', bundlePath: row.bundlePath, destination: action.destination })
        break
      case 'delete':
        if (await window.nexus.confirmEmptyTrash(1))
          await one({ op: 'emptyBundle', bundlePath: row.bundlePath })
        break
      case 'restoreAll':
        await restoreBatch(targets)
        break
      case 'deleteAll':
        await emptyBatch(targets)
        break
    }
  }

  return (
    <div className={cx('trash-leaf', checked.size > 0 && 'has-checked')}>
      <div className="nav-search-row">
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

      {/* The table's heading, borrowed whole — its fill, its seam and the segment bars that bound
          the strip — over the two lanes this list actually has. */}
      <div className={cx('trash-head', 'table-head', text.callout.semibold)}>
        <span className={cx('trash-head-name', 'col-header')}>
          <span className="trash-head-glyph">
            <PropertyTypeIcon type="title" size={13} />
          </span>
          File Name
        </span>
        <span className={cx('trash-head-date', 'col-header')}>
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
                onMenu={() => void openMenu(row)}
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
  onMenu,
  icon,
  when,
  defaultIcons,
}: {
  row: TrashRow
  checked: boolean
  onToggle: () => void
  onMenu: () => void
  icon: string
  when: string
  defaultIcons: Personalization['defaultIcons']
}): React.JSX.Element {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: a pointer convenience over the checkbox inside it, which already carries the role, the tab stop and the keyboard — a second stop per row would say there were two things to reach
    <div
      className={cx('nav-item', row.historical && 'is-historical')}
      onClick={onToggle}
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu()
      }}
    >
      <Checkbox
        className="trash-check"
        small
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
