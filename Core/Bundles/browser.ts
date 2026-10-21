// The renderer's half of the bundle owner: what a store's browser does with the rows `rows.ts` builds host-side.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { capitalize } from '@pommora/uix/Utilities/capitalize'
import { actedOn, retained, toggled } from '@pommora/uix/Utilities/checkSet'
import { askEmptyTrash, spendBundle } from '../Interface/Confirm/confirmations'
import {
  notifyOutcome,
  notifyReport,
  unrestoredLine,
} from '../Interface/Notifications/notifications'
import { changesSettled, type MutateRequest } from '../Nexus/mutateRequest'
import { matches, matchQuery } from '../Paths/caseFold'
import { itemCount } from '../Properties/properties'
import { formatDate } from '../Properties/formatValue'
import { dateDefaults, holdsStyle, resolveStyle, storedPick } from '../Properties/columnStyles'
import { parseStyleAction, styleMenuItems } from '../Actions/columnMenu'
import { containerTargets, contextTargets } from '../Actions/destinationTree'
import { popMenu } from '../Actions/menuActions'
import { restoreMenuItems } from '../Actions/restoreMenu'
import { useNexusForms } from '../Views/Host/useColumnStyles'
import { useSession } from '../Session/store'
import { personalizationOf } from '../Session/configSlice'
import { flushAllSaves, storesChanged } from '../Session/nexusSlice'
import { dialer } from '../Platform/dialer'
import type { BundleStore } from './bundle'
import type { BundleRow } from './rows'

const PLURALS: Record<BundleRow['kind'], string> = {
  page: 'Pages',
  collection: 'Collections',
  set: 'Sets',
  space: 'Spaces',
  context: 'Contexts',
  property: 'Properties',
}

export function countPhrase(rows: BundleRow[]): string {
  const kinds = new Set(rows.map((r) => r.kind))
  const kind = kinds.size === 1 ? [...kinds][0] : null
  if (kind === null) return itemCount(rows.length)
  return rows.length === 1 ? `1 ${capitalize(kind)}` : `${rows.length} ${PLURALS[kind]}`
}

const steppedTo = (title: string, landedAs: string): string => `“${title}” as “${landedAs}”`

/** Typed search narrows in place, keeping the store's order, as a view's search does (`searchGroups`). */
export function filterRows(rows: BundleRow[], query: string): BundleRow[] {
  const q = matchQuery(query)
  return q ? rows.filter((row) => matches(row.match, q)) : rows
}

type DateKey = 'trashColumnStyle' | 'archiveColumnStyle'

/** A store's date column: its stored style over the Nexus's date form, and the heading's right-click, which picks one. */
function useDateColumn(key: DateKey): {
  when: (storedAt: number | null) => string
  onContextMenu: (e: React.MouseEvent) => Promise<void>
} {
  const nexus = useNexusForms()
  const stored = useSession((s) => personalizationOf(s)[key])
  const setPersonalization = useSession((s) => s.setPersonalization)
  // A store shows when each item entered it, where a view's date column leaves the time hidden.
  const defaults = { ...dateDefaults(nexus.dateFormat), time_format: nexus.clock }
  const style = resolveStyle(stored, defaults, nexus.clock)
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
  }
}

/** What the Trash and the Archive do differently under one browser. */
function rulesOf(kind: BundleStore['kind']): { dateKey: DateKey } {
  switch (kind) {
    case 'trash':
      return { dateKey: 'trashColumnStyle' }
    case 'archive':
      return { dateKey: 'archiveColumnStyle' }
  }
}

type Listing = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; rows: BundleRow[] }

/** A store's browser: its rows, listed again on each change while shown and on each showing; the checked set; the right-click menu's Restore and Delete over a row or the checked rows in view; and its date column. */
export function useBundleBrowser(
  store: BundleStore,
  { query, shown }: { query: string; shown: boolean },
): {
  listing: Listing
  matches: BundleRow[]
  checked: ReadonlySet<string>
  toggle: (bundlePath: string) => void
  openMenu: (row: BundleRow) => Promise<void>
  date: ReturnType<typeof useDateColumn>
} {
  const rules = rulesOf(store.kind)
  const date = useDateColumn(rules.dateKey)
  const nexusId = useSession((s) => s.tree?.nexus.id)
  const mutate = useSession((s) => s.mutate)
  const [listing, setListing] = useState<Listing>({ status: 'loading' })
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())

  // Keyed on the store's fields rather than the object, so a caller may pass a fresh literal.
  const refresh = useCallback(async (): Promise<void> => {
    const res = await dialer().ask('bundles:list', store)
    if (!res.ok) {
      setListing({ status: 'failed' })
      return
    }
    setListing({ status: 'ready', rows: res.value })
    const live = new Set(res.value.map((r) => r.bundlePath))
    setChecked((prev) => retained(prev, live))
  }, [store.kind, store.kind === 'archive' ? store.id : null])

  // A parked browser stays mounted, so it lists again on its next showing rather than on every change behind another tab.
  useEffect(() => {
    if (!shown) return
    void refresh()
    return storesChanged.subscribe(() => void refresh())
  }, [refresh, shown])

  const matches = useMemo(
    () => (listing.status === 'ready' ? filterRows(listing.rows, query) : []),
    [listing, query],
  )
  const toggle = (bundlePath: string): void => setChecked((prev) => toggled(prev, bundlePath))

  const one = async (
    req: Extract<MutateRequest, { bundlePath: string }>,
    row: BundleRow,
  ): Promise<void> => {
    const done = await mutate(req)
    if (!done) return
    spendBundle(req.bundlePath)
    if (done.landedAs)
      notifyOutcome(`Restored ${steppedTo(row.title, done.landedAs)}`, undefined, [
        done.unrestored !== undefined && unrestoredLine(done.unrestored),
        done.cascade?.warning,
      ])
  }

  /** Answers null when a Nexus switch stopped it, as the slice's `mutate` drops a held op: the paths left belong to the Nexus it left, so the batch reports nothing. */
  const many = async (
    targets: BundleRow[],
    op: 'restore' | 'emptyBundle',
  ): Promise<{
    done: BundleRow[]
    refused: BundleRow[]
    unrestored: string[]
    warnings: string[]
    renamed: string[]
  } | null> => {
    const done: BundleRow[] = []
    const refused: BundleRow[] = []
    const unrestored: string[] = []
    const warnings = new Set<string>()
    const renamed: string[] = []
    let stopped = false
    if (changesSettled(op)) await flushAllSaves()
    for (const row of targets) {
      stopped = useSession.getState().tree?.nexus.id !== nexusId
      if (stopped) break
      const res = await dialer().ask('mutate', { op, bundlePath: row.bundlePath })
      ;(res.ok ? done : refused).push(row)
      if (!res.ok) continue
      spendBundle(row.bundlePath)
      unrestored.push(...(res.value.unrestored ?? []))
      if (res.value.cascade?.warning) warnings.add(res.value.cascade.warning)
      if (res.value.landedAs) renamed.push(steppedTo(row.title, res.value.landedAs))
    }
    storesChanged.emit()
    return stopped ? null : { done, refused, unrestored, warnings: [...warnings], renamed }
  }

  const restoreBatch = async (targets: BundleRow[]): Promise<void> => {
    const addressable = targets.filter((r) => r.homeResolves)
    const homeless = targets.filter((r) => !r.homeResolves)
    const nowhere = `${countPhrase(homeless)} had nowhere to go — restore those one at a time to choose where.`
    if (addressable.length === 0) return notifyReport(nowhere, true)
    const ran = await many(addressable, 'restore')
    if (!ran) return
    const { done, refused, unrestored, warnings, renamed } = ran
    notifyOutcome(
      `Restored ${countPhrase(done)}`,
      renamed.length > 1 ? `${renamed.length} Renamed` : renamed[0],
      [
        homeless.length > 0 && nowhere,
        refused.length > 0 && `${countPhrase(refused)} couldn’t be restored.`,
        unrestored.length > 0 && unrestoredLine(unrestored),
        ...warnings,
      ],
    )
  }

  const emptyBatch = async (targets: BundleRow[]): Promise<void> => {
    if (!(await askEmptyTrash(targets.length))) return
    const ran = await many(targets, 'emptyBundle')
    if (!ran) return
    const { done, refused, warnings } = ran
    notifyOutcome(`Deleted ${countPhrase(done)}`, undefined, [
      refused.length > 0 && `${countPhrase(refused)} couldn’t be deleted.`,
      ...warnings,
    ])
  }

  const openMenu = async (row: BundleRow): Promise<void> => {
    const targets = actedOn(checked, matches, row, (r) => r.bundlePath)
    const batch = targets.length > 1
    const destinationKind = row.kind === 'space' ? ('context' as const) : ('container' as const)
    const { tree } = useSession.getState()
    const action = await popMenu(
      restoreMenuItems({
        batch,
        ...(!batch && !row.homeResolves
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
      await one({ op: 'restore', bundlePath: row.bundlePath, destination }, row)
      return
    }
    switch (action) {
      case 'restore':
        if (batch) await restoreBatch(targets)
        else await one({ op: 'restore', bundlePath: row.bundlePath }, row)
        break
      case 'delete':
        if (batch) await emptyBatch(targets)
        else if (await askEmptyTrash(1))
          await one({ op: 'emptyBundle', bundlePath: row.bundlePath }, row)
        break
    }
  }

  return { listing, matches, checked, toggle, openMenu, date }
}
