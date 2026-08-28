import { useCallback, useEffect, useMemo, useState } from 'react'
import { Checkbox } from '@renderer/DesignSystem/Components/Controls/Checkbox'
import { SearchField } from '@renderer/DesignSystem/Components/Fields'
import { overScrollEllipsis } from '@renderer/DesignSystem/Interactions/OverScroll'
import { NavTrail } from '@renderer/DesignSystem/Elements/NavTrail'
import { MenuItem } from '@renderer/DesignSystem/Menus'
import { overlay } from '@renderer/DesignSystem/Menus/menu-base.css'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { entityIcon, Icon } from '@renderer/DesignSystem/Symbols'
import { text } from '@renderer/DesignSystem/Tokens'
import { type DateFormat, defaultStyleFor } from '@shared/columnStyles'
import type { MutateRequest } from '@shared/mutate'
import type { CollectionNode } from '@shared/types'
import { DEFAULT_TIME_FORMAT, type Personalization, type TrashRow } from '@shared/types'
import { PropertyTypeIcon } from '../Properties/PropertyTypes'
import { formatDate } from '@renderer/Properties/Editing/formatValue'
import { containerTargets, contextTargets } from '../destinationTree'
import { fuzzyScore } from '../Navigation/navSearch'
import { useSession } from '../store'
import '../Navigation/navList.css'
import './trashFrame.css'

const EMPTY_COLLECTIONS: CollectionNode[] = []

const PLURALS: Record<TrashRow['kind'], string> = {
  page: 'pages',
  collection: 'collections',
  set: 'sets',
  space: 'spaces',
  context: 'contexts',
}

export function countPhrase(rows: TrashRow[]): string {
  const kinds = new Set(rows.map((r) => r.kind))
  const kind = kinds.size === 1 ? [...kinds][0] : null
  if (rows.length === 1) return `1 ${kind ?? 'item'}`
  return `${rows.length} ${kind === null ? 'items' : PLURALS[kind]}`
}

interface Refusal {
  row: TrashRow
  why: string
}

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

export function TrashFrame(): React.JSX.Element {
  const nexusClock = useSession((s) => s.personalization.timeFormat ?? DEFAULT_TIME_FORMAT)
  const nexusDateFormat = useSession((s) => s.personalization.dateFormat)
  const columnDefault: DateFormat =
    defaultStyleFor('datetime', undefined, nexusDateFormat).date_format ?? 'full'
  const dateFormat = useSession((s) => s.personalization.trashDateFormat) ?? columnDefault
  const timeShown = useSession((s) => s.personalization.trashHideTime !== true)
  const setPersonalization = useSession((s) => s.setPersonalization)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const tree = useSession((s) => s.tree)
  const collections = useSession((s) => s.tree?.collections ?? EMPTY_COLLECTIONS)
  const mutate = useSession((s) => s.mutate)
  const load = useSession((s) => s.load)
  const [rows, setRows] = useState<TrashRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())

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

  const one = async (req: MutateRequest): Promise<void> => {
    if (await mutate(req)) await refresh()
  }

  const many = async (
    targets: TrashRow[],
    req: (row: TrashRow) => MutateRequest,
    reloads: boolean,
  ): Promise<{ done: TrashRow[]; refused: Refusal[] }> => {
    const done: TrashRow[] = []
    const refused: Refusal[] = []
    for (const row of targets) {
      const res = await window.nexus.mutate(req(row))
      if (res.ok) done.push(row)
      else refused.push({ row, why: res.error.message })
    }
    if (done.length > 0 && reloads) await load()
    await refresh()
    return { done, refused }
  }

  const restoreBatch = async (targets: TrashRow[]): Promise<void> => {
    const addressable = targets.filter((r) => r.homeResolves)
    const { done, refused } = await many(
      addressable,
      (row) => ({ op: 'restore', bundlePath: row.bundlePath }),
      true,
    )
    const homeless = targets.filter((r) => !r.homeResolves)
    void window.nexus.reportTrash(
      `Restored ${countPhrase(done)}.`,
      [
        homeless.length > 0 &&
          `${countPhrase(homeless)} had nowhere to go — restore those one at a time to choose where.`,
        ...refused.map((r) => `${r.row.title}: ${r.why}`),
      ]
        .filter(Boolean)
        .join('\n') || 'Everything went back where it came from.',
    )
  }

  const emptyBatch = async (targets: TrashRow[]): Promise<void> => {
    if (!(await window.nexus.confirmEmptyTrash(targets.length))) return
    const { done, refused } = await many(
      targets,
      (row) => ({ op: 'emptyBundle', bundlePath: row.bundlePath }),
      false,
    )
    void window.nexus.reportTrash(
      `Deleted ${countPhrase(done)}.`,
      refused.length === 0
        ? 'They have left the trash for good.'
        : refused.map((r) => `${r.row.title}: ${r.why}`).join('\n'),
    )
  }

  const openColumnMenu = async (): Promise<void> => {
    const action = await window.nexus.trashColumnMenu({ format: dateFormat, timeShown })
    if (!action) return
    if (action.kind === 'toggleTime')
      setPersonalization('trashHideTime', timeShown ? true : undefined)
    else
      setPersonalization(
        'trashDateFormat',
        action.format === columnDefault ? undefined : action.format,
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
    <div className={cx('trash-frame table is-clear', checked.size > 0 && 'has-checked')}>
      <div className="nav-search-row">
        <SearchField
          className={text.body.standard}
          value={query}
          onValueChange={setQuery}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && query) {
              e.preventDefault()
              setQuery('')
            }
          }}
        />
      </div>

      <div className={cx('trash-head', 'table-head', text.caption.semibold)}>
        <span className="trash-head-name col-header">
          <span className="trash-head-glyph">
            <PropertyTypeIcon type="title" size="body" />
          </span>
          File Name
        </span>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a column label — it carries no click and no keyboard gesture of its own, exactly as the banner's and the cards' right-click surfaces do */}
        <span
          className="trash-head-date col-header"
          onContextMenu={(e) => {
            e.preventDefault()
            void openColumnMenu()
          }}
        >
          <Icon name="clock-fading" size="body" />
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
        <div className="trash-scroll over-scroll">
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
                    : formatDate(
                        new Date(row.deletedAt).toISOString(),
                        dateFormat,
                        timeShown ? nexusClock : 'none',
                      )
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
    <MenuItem
      className="trash-row table-segment"
      leading={<Icon name={icon} size="headline" />}
      detail={
        <NavTrail
          segments={row.crumbs.map((crumb) => ({
            title: crumb.title,
            icon: crumb.kind && entityIcon(crumb.kind, undefined, defaultIcons),
          }))}
          iconSize="control"
          className={cx(row.historical && 'is-historical')}
        />
      }
      trailing={
        <span className={cx('trash-date', text.caption.standard, overScrollEllipsis)}>{when}</span>
      }
      overlay={
        <Checkbox
          className={cx(overlay, 'trash-check')}
          small
          state={checked}
          onChange={onToggle}
          ariaLabel={`Select ${row.title}`}
        />
      }
      onClick={onToggle}
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu()
      }}
    >
      {row.title}
    </MenuItem>
  )
}
