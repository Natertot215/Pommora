import { useCallback, useEffect, useMemo, useState } from 'react'
import { Checkbox } from '@pommora/uix/Controls/Checkbox'
import { SearchField } from '@pommora/uix/Fields/SearchField'
import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { MenuItem } from '@pommora/uix/Menus'
import { overlay } from '@pommora/uix/Menus/menu-row.css'
import { retained, toggled } from '@pommora/uix/Utilities/checkSet'
import { cx } from '@pommora/uix/Utilities/cx'
import { Icon } from '@pommora/uix/Symbols'
import { entityIcon } from '../Assets/entityIconPolicy'
import { text } from '@pommora/uix/Theme'
import { askEmptyTrash, spendBundle } from '../Interface/Confirm/confirmations'
import type { MutateRequest } from '@pommora/core/Nexus/mutateRequest'
import type { Personalization } from '@pommora/core/Settings/personalization'
import type { TrashRow } from '@pommora/core/Trash/trashRow'
import { PropertyTypeIcon, propertyTypeIconName } from '../Properties/Cells/PropertyTypes'
import { formatDate } from '../Properties/formatValue'
import { containerTargets, contextTargets } from '../Actions/destinationTree'
import { foldKey, matchScore, rankMatches } from '../Paths/caseFold'
import { useSession } from '../Session/store'
import { notifyReport, unrestoredLine } from '../Interface/Notifications/notifications'
import { displayPropertyName, useCapitalizeMetadata } from '../Properties/Cells/columnLabel'
import { dialer } from '../Platform/dialer'
import { popMenu } from '../Actions/menuActions'
import { trashMenuItems } from '@pommora/core/Actions/trashMenu'
import { parseStyleAction, styleMenuItems } from '@pommora/core/Actions/columnMenu'
import {
  dateDefaults,
  holdsStyle,
  resolveStyle,
  storedPick,
} from '@pommora/core/Properties/columnStyles'
import { useNexusForms } from '../Views/Host/useColumnStyles'
import '../Navigation/nav-list.css'
import './trash-frame.css'

const PLURALS: Record<TrashRow['kind'], string> = {
  page: 'pages',
  collection: 'collections',
  set: 'sets',
  space: 'spaces',
  context: 'contexts',
  property: 'properties',
}

export function countPhrase(rows: TrashRow[]): string {
  const kinds = new Set(rows.map((r) => r.kind))
  const kind = kinds.size === 1 ? [...kinds][0] : null
  if (rows.length === 1) return `1 ${kind ?? 'item'}`
  return `${rows.length} ${kind === null ? 'items' : PLURALS[kind]}`
}

export function filterRows(rows: TrashRow[], query: string): TrashRow[] {
  const q = foldKey(query.trim())
  if (!q) return rows
  return rankMatches(rows, (row) => {
    const title = matchScore(foldKey(row.title), q)
    const place = matchScore(foldKey(row.crumbs.map((c) => c.title).join(' ')), q)
    return title === null ? place : place === null ? title : Math.max(title, place)
  })
}

// Keyed on the nexus so a switch with Settings open mounts a body with its own list.
export function TrashFrame(): React.JSX.Element {
  const nexusId = useSession((s) => s.tree?.nexus.id ?? '')
  return <TrashBody key={nexusId} />
}

function TrashBody(): React.JSX.Element {
  const nexus = useNexusForms()
  const stored = useSession((s) => s.personalization.trashColumnStyle)
  // The Trash shows each deletion's time, where a view's date column leaves it hidden.
  const defaults = { ...dateDefaults(nexus.dateFormat), time_format: nexus.clock }
  const style = resolveStyle(stored, defaults, nexus.clock)
  const setPersonalization = useSession((s) => s.setPersonalization)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const tree = useSession((s) => s.tree)
  const mutate = useSession((s) => s.mutate)
  const trashRevision = useSession((s) => s.trashRevision)
  const [rows, setRows] = useState<TrashRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())

  const refresh = useCallback(async (): Promise<void> => {
    const res = await dialer().ask('trash:list')
    if (!res.ok) {
      setFailed(true)
      return
    }
    setFailed(false)
    setRows(res.value)
    const live = new Set(res.value.map((r) => r.bundlePath))
    setChecked((prev) => retained(prev, live))
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh, trashRevision])

  const capitalize = useCapitalizeMetadata()
  const shown = useMemo(
    () =>
      filterRows(
        (rows ?? []).map((r) =>
          r.kind === 'property' ? { ...r, title: displayPropertyName(r.title, capitalize) } : r,
        ),
        query,
      ),
    [rows, query, capitalize],
  )
  const toggle = (bundlePath: string): void => setChecked((prev) => toggled(prev, bundlePath))

  const one = (req: Extract<MutateRequest, { bundlePath: string }>): Promise<unknown> => {
    spendBundle(req.bundlePath)
    return mutate(req)
  }

  const many = async (
    targets: TrashRow[],
    op: 'restore' | 'emptyBundle',
  ): Promise<{
    done: TrashRow[]
    refused: TrashRow[]
    unrestored: string[]
    warnings: string[]
  }> => {
    const done: TrashRow[] = []
    const refused: TrashRow[] = []
    const unrestored: string[] = []
    const warnings = new Set<string>()
    for (const row of targets) spendBundle(row.bundlePath)
    for (const row of targets) {
      const res = await dialer().ask('mutate', { op, bundlePath: row.bundlePath })
      ;(res.ok ? done : refused).push(row)
      if (!res.ok) continue
      unrestored.push(...(res.value.unrestored ?? []))
      if (res.value.cascade?.warning) warnings.add(res.value.cascade.warning)
    }
    await refresh()
    return { done, refused, unrestored, warnings: [...warnings] }
  }

  const restoreBatch = async (targets: TrashRow[]): Promise<void> => {
    const addressable = targets.filter((r) => r.homeResolves)
    const { done, refused, unrestored } = await many(addressable, 'restore')
    const homeless = targets.filter((r) => !r.homeResolves)
    const unmet = [
      homeless.length > 0 &&
        `${countPhrase(homeless)} had nowhere to go — restore those one at a time to choose where.`,
      refused.length > 0 && `${countPhrase(refused)} couldn’t be restored.`,
      unrestored.length > 0 && unrestoredLine(unrestored),
    ].filter(Boolean)
    notifyReport([`Restored ${countPhrase(done)}.`, ...unmet].join(' '), unmet.length > 0)
  }

  const emptyBatch = async (targets: TrashRow[]): Promise<void> => {
    if (!(await askEmptyTrash(targets.length))) return
    const { done, refused, warnings } = await many(targets, 'emptyBundle')
    const unmet = [
      refused.length > 0 && `${countPhrase(refused)} couldn’t be deleted.`,
      ...warnings,
    ].filter(Boolean)
    notifyReport([`Deleted ${countPhrase(done)}.`, ...unmet].join(' '), unmet.length > 0)
  }

  const openColumnMenu = async (): Promise<void> => {
    const action = await popMenu(styleMenuItems({ type: 'dateTime', current: style }))
    const pick = action ? parseStyleAction(action) : null
    if (!pick) return
    const next = { ...stored, [pick.key]: storedPick(pick.key, pick.value, defaults, nexus.clock) }
    setPersonalization('trashColumnStyle', holdsStyle(next) ? next : undefined)
  }

  const openMenu = async (row: TrashRow): Promise<void> => {
    // Right-clicking an unchecked row acts on that row alone, whatever else is checked — a checked set is a deliberate construction. The batch is what the menu will actually act on: the CHECKED rows STILL IN VIEW, since deriving it from the unfiltered selection would let a filtered right-click read "Restore All", act on one row, and withhold the destination picker that row was owed.
    const inSet = checked.has(row.bundlePath) ? shown.filter((r) => checked.has(r.bundlePath)) : []
    const batch = inSet.length > 1
    const targets = batch ? inSet : [row]
    const homeless = !batch && !row.homeResolves
    const destinationKind = row.kind === 'space' ? ('context' as const) : ('container' as const)
    const action = await popMenu(
      trashMenuItems({
        batch,
        ...(homeless
          ? {
              destinations:
                destinationKind === 'context' ? contextTargets(tree) : containerTargets(tree),
            }
          : {}),
      }),
    )
    if (!action) return
    if (action.startsWith('restoreTo:')) {
      const destination = { kind: destinationKind, id: action.slice('restoreTo:'.length) }
      await one({ op: 'restore', bundlePath: row.bundlePath, destination })
      return
    }
    switch (action) {
      case 'restore':
        await one({ op: 'restore', bundlePath: row.bundlePath })
        break
      case 'delete':
        if (await askEmptyTrash(1)) await one({ op: 'emptyBundle', bundlePath: row.bundlePath })
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
        <SearchField className={text.body.standard} value={query} onValueChange={setQuery} />
      </div>

      <div className={cx('trash-head', 'table-head')}>
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
        <div className="trash-scroll scroll-fade">
          <div className="nav-list">
            {shown.map((row) => (
              <TrashRowView
                key={row.bundlePath}
                row={row}
                checked={checked.has(row.bundlePath)}
                onToggle={() => toggle(row.bundlePath)}
                onMenu={() => void openMenu(row)}
                icon={
                  row.kind === 'property'
                    ? row.propertyType
                      ? propertyTypeIconName(row.propertyType)
                      : 'tag'
                    : entityIcon(row.kind, undefined, defaultIcons)
                }
                defaultIcons={defaultIcons}
                when={
                  row.deletedAt === null
                    ? ''
                    : formatDate(
                        new Date(row.deletedAt).toISOString(),
                        style.date_format,
                        style.time_format,
                        style.weekday,
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
      className="trash-row table-divider"
      leading={<Icon name={icon} size="headline" />}
      detail={
        <NavTrail
          segments={row.crumbs.map((crumb) => ({
            title: crumb.title,
            icon: crumb.kind && entityIcon(crumb.kind, undefined, defaultIcons),
          }))}
          iconSize="control"
          className={cx('trash-trail', row.historical && 'is-historical')}
        />
      }
      trailing={
        <span className={cx('trash-date', text.caption.standard, overScrollEllipsis)}>{when}</span>
      }
      overlay={
        <Checkbox
          className={overlay}
          size="compact"
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
