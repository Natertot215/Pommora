// The renderer's half of the bundle owner: what a store's browser does with the rows `rows.ts` builds host-side.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { actedOn, checkedIn, retained, toggled } from '@pommora/uix/Utilities/checkSet'
import { entityIcon } from '../Assets/entityIconPolicy'
import {
  askEmptyTrash,
  askTrashing,
  confirmDelete,
  offerUndo,
  spendUndo,
} from '../Interface/Confirm/confirmations'
import { countPhrase } from '../Nexus/entities'
import {
  notifyOutcome,
  notifyReport,
  unrestoredLine,
} from '../Interface/Notifications/notifications'
import type { RestoreDestination } from '../Nexus/mutateRequest'
import { nodesByIdOf } from '../Nexus/treeIndex'
import { matches, matchQuery } from '../Paths/caseFold'
import { basename } from '../Paths/posix'
import { formatDate } from '../Properties/formatValue'
import {
  type DateStyle,
  dateDefaults,
  holdsStyle,
  resolveStyle,
  storedPick,
} from '../Properties/columnStyles'
import { parseStyleAction, styleMenuItems } from '../Actions/columnMenu'
import { containerTargets, contextTargets } from '../Actions/destinationTree'
import { popMenu } from '../Actions/menuActions'
import { destinationRows } from '../Actions/pageMenu'
import { restoreMenuItems } from '../Actions/restoreMenu'
import { useNexusForms } from '../Views/Host/useColumnStyles'
import { useSession } from '../Session/store'
import { personalizationOf } from '../Session/configSlice'
import { storesChanged } from '../Session/nexusSlice'
import { dialer } from '../Platform/dialer'
import type { Personalization } from '../Settings/personalization'
import type { BundleStore } from './bundle'
import type { BundleCrumb, BundleRow } from './rows'

const steppedTo = (title: string, landedAs: string): string => `“${title}” as “${landedAs}”`

/** Typed search narrows in place, keeping the store's order, as a view's search does (`searchGroups`). */
export function filterRows(rows: BundleRow[], query: string): BundleRow[] {
  const q = matchQuery(query)
  return q ? rows.filter((row) => matches(row.match, q)) : rows
}

/** A row's origin trail as both browsers draw it, each live crumb wearing its kind's glyph. */
export const crumbSegments = (
  crumbs: BundleCrumb[],
  icons: Personalization['defaultIcons'],
): TrailSegment[] =>
  crumbs.map((crumb) => ({
    title: crumb.title,
    icon: crumb.kind && entityIcon(crumb.kind, undefined, icons),
  }))

/** What the Archive stores: a page or a Set. */
export const archivedKind = (row: BundleRow): 'page' | 'set' =>
  row.kind === 'set' ? 'set' : 'page'

const ARCHIVE_UNDO: RestoreDestination = { kind: 'archive' }

type BatchOp = 'restore' | 'emptyBundle' | 'delete'

/** A restore from the Archive undoes by archiving each item again, found by id so it follows a rename made since, under the bundle name it left, so it keeps its Archived date; one renamed or stepped aside since takes a fresh stamp, since that name no longer fits it. */
const rearchive = (rows: BundleRow[]) => async (): Promise<void> => {
  for (const row of rows) {
    const { tree, mutate } = useSession.getState()
    const id = row.stored?.id
    if (!id || !tree) continue
    const path = nodesByIdOf(tree).get(id)?.path
    if (path)
      await mutate({ op: 'archive', path, kind: archivedKind(row), leaf: basename(row.bundlePath) })
  }
}

type DateKey = 'trashColumnStyle' | 'archiveColumnStyle'

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
function useDateColumn(key: DateKey): {
  when: (storedAt: number | null) => string
  onContextMenu: (e: React.MouseEvent) => Promise<void>
  sample: string
  measureRef: (el: HTMLElement | null) => void
  width: number | null
} {
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

/** What the Trash and the Archive do differently under one browser: the date column's setting, what a delete sends and how it asks, for one row and for a batch, and what a restore's and a delete's Undo do. */
function rulesOf(kind: BundleStore['kind']): {
  dateKey: DateKey
  deleteOp: 'emptyBundle' | 'delete'
  askBatch: (targets: BundleRow[]) => Promise<boolean>
  deleteOne: (row: BundleRow) => Promise<boolean>
  restoreUndo?: (rows: BundleRow[]) => () => Promise<void>
  deleteUndo?: RestoreDestination
} {
  switch (kind) {
    case 'trash':
      return {
        dateKey: 'trashColumnStyle',
        deleteOp: 'emptyBundle',
        askBatch: askEmptyTrash,
        deleteOne: async (row) =>
          (await askEmptyTrash([row])) &&
          (await useSession
            .getState()
            .mutate({ op: 'emptyBundle', bundlePath: row.bundlePath })) !== null,
      }
    case 'archive':
      return {
        dateKey: 'archiveColumnStyle',
        deleteOp: 'delete',
        askBatch: askTrashing,
        deleteOne: (row) =>
          confirmDelete({
            path: row.bundlePath,
            kind: archivedKind(row),
            title: row.title,
            undoTo: ARCHIVE_UNDO,
          }),
        restoreUndo: rearchive,
        deleteUndo: ARCHIVE_UNDO,
      }
  }
}

type Listing = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; rows: BundleRow[] }

/** A store's browser, narrowed `within` a top-level Set when given: its rows, listed again on each change while shown and on each showing; the checked set, and the checked rows in view; Restore and Delete, run by the right-click menu over a row or the checked rows in view and by the bar over the checked rows; and its date column. */
export function useBundleBrowser(
  store: BundleStore,
  { query, shown, within }: { query: string; shown: boolean; within?: string },
): {
  listing: Listing
  visible: BundleRow[]
  checked: ReadonlySet<string>
  picked: BundleRow[]
  toggle: (bundlePath: string) => void
  openMenu: (row: BundleRow) => Promise<void>
  date: ReturnType<typeof useDateColumn>
  restore: (targets: BundleRow[]) => Promise<void>
  remove: (targets: BundleRow[]) => Promise<void>
} {
  const rules = rulesOf(store.kind)
  const date = useDateColumn(rules.dateKey)
  const nexusId = useSession((s) => s.tree?.nexus.id)
  const mutate = useSession((s) => s.mutate)
  const finishOwed = useSession((s) => s.finishOwed)
  const [listing, setListing] = useState<Listing>({ status: 'loading' })
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())

  // Keyed on the store's fields rather than the object, so a caller may pass a fresh literal; only the latest ask's reply lands, since replies can arrive out of order.
  const asks = useRef(0)
  const refresh = useCallback(async (): Promise<void> => {
    const ask = ++asks.current
    const res = await dialer().ask('bundles:list', store, within)
    if (ask !== asks.current) return
    if (!res.ok) {
      setListing({ status: 'failed' })
      return
    }
    setListing({ status: 'ready', rows: res.value })
    const live = new Set(res.value.map((r) => r.bundlePath))
    setChecked((prev) => retained(prev, live))
  }, [store.kind, store.kind === 'archive' ? store.id : null, within])

  // A parked browser stays mounted, so it lists again on its next showing rather than on every change behind another tab.
  useEffect(() => {
    if (!shown) return
    void refresh()
    return storesChanged.subscribe(() => void refresh())
  }, [refresh, shown])

  const visible = useMemo(
    () => (listing.status === 'ready' ? filterRows(listing.rows, query) : []),
    [listing, query],
  )
  const picked = useMemo(() => checkedIn(checked, visible, (r) => r.bundlePath), [checked, visible])
  const toggle = (bundlePath: string): void => setChecked((prev) => toggled(prev, bundlePath))

  // One action in flight: a press before it settles is dropped, rather than acting on a row the first already moved.
  const busy = useRef(false)
  const flight = async (act: () => Promise<void>): Promise<void> => {
    if (busy.current) return
    busy.current = true
    try {
      await act()
    } finally {
      busy.current = false
    }
  }

  const placesFor = (row: BundleRow) => {
    const { tree } = useSession.getState()
    return row.kind === 'space'
      ? { kind: 'context' as const, targets: contextTargets(tree) }
      : { kind: 'container' as const, targets: containerTargets(tree) }
  }

  /** A row whose place is gone asks where to go first, unless the menu's submenu already chose. */
  const restoreOne = async (row: BundleRow, destination?: RestoreDestination): Promise<void> => {
    let to = destination
    if (!to && !row.homeResolves) {
      const places = placesFor(row)
      const id = await popMenu(destinationRows(places.targets, (t) => t.id))
      if (!id) return
      to = { kind: places.kind, id }
    }
    const done = await mutate({
      op: 'restore',
      bundlePath: row.bundlePath,
      ...(to ? { destination: to } : {}),
    })
    if (!done) return
    spendUndo(row.bundlePath)
    // A restore the store can undo always reports, since its notice carries the Undo; the Trash's reports a step aside alone. The notice replaces the slice's, so it carries the reply's lines and its Try Again.
    if (done.landedAs || rules.restoreUndo)
      notifyOutcome(
        `Restored ${done.landedAs ? steppedTo(row.title, done.landedAs) : `“${row.title}”`}`,
        undefined,
        [done.unrestored !== undefined && unrestoredLine(done.unrestored), done.cascade?.warning],
        rules.restoreUndo?.([row]),
        done.cascade?.owed ? finishOwed : undefined,
      )
  }

  /** Answers null when a Nexus switch stopped it, as the slice's `mutate` drops a held op: the paths left belong to the Nexus it left, so the batch reports nothing. */
  const many = async (
    targets: BundleRow[],
    op: BatchOp,
  ): Promise<{
    done: BundleRow[]
    refused: BundleRow[]
    unrestored: string[]
    warnings: string[]
    renamed: string[]
    bundled: string[]
    owed: boolean
  } | null> => {
    const done: BundleRow[] = []
    const refused: BundleRow[] = []
    const unrestored: string[] = []
    const warnings = new Set<string>()
    const renamed: string[] = []
    const bundled: string[] = []
    let owed = false
    const switched = (): boolean => useSession.getState().tree?.nexus.id !== nexusId
    for (const row of targets) {
      if (switched()) break
      const res = await mutate(
        op === 'delete'
          ? { op, path: row.bundlePath, kind: archivedKind(row) }
          : { op, bundlePath: row.bundlePath },
        { quiet: true },
      )
      ;(res ? done : refused).push(row)
      if (!res) continue
      spendUndo(row.bundlePath)
      unrestored.push(...(res.unrestored ?? []))
      if (res.cascade?.warning) warnings.add(res.cascade.warning)
      owed ||= !!res.cascade?.owed
      if (res.landedAs) renamed.push(steppedTo(row.title, res.landedAs))
      if (res.bundled) bundled.push(res.bundled.bundlePath)
    }
    storesChanged.emit()
    return switched()
      ? null
      : { done, refused, unrestored, warnings: [...warnings], renamed, bundled, owed }
  }

  const restoreBatch = async (targets: BundleRow[]): Promise<void> => {
    const addressable = targets.filter((r) => r.homeResolves)
    const homeless = targets.filter((r) => !r.homeResolves)
    const nowhere = `${countPhrase(homeless)} had nowhere to go — restore those one at a time to choose where.`
    if (addressable.length === 0) return notifyReport(nowhere, true)
    const ran = await many(addressable, 'restore')
    if (!ran) return
    const { done, refused, unrestored, warnings, renamed, owed } = ran
    notifyOutcome(
      `Restored ${countPhrase(done)}`,
      renamed.length > 1 ? `${renamed.length} Renamed` : renamed[0],
      [
        homeless.length > 0 && nowhere,
        refused.length > 0 && `${countPhrase(refused)} couldn’t be restored.`,
        unrestored.length > 0 && unrestoredLine(unrestored),
        ...warnings,
      ],
      done.length > 0 ? rules.restoreUndo?.(done) : undefined,
      owed ? finishOwed : undefined,
    )
  }

  const deleteBatch = async (targets: BundleRow[]): Promise<void> => {
    if (!(await rules.askBatch(targets))) return
    const ran = await many(targets, rules.deleteOp)
    if (!ran) return
    const { done, refused, warnings, bundled, owed } = ran
    // An empty mints no bundle, so only a batch the Archive moved into the Trash offers its Undo.
    offerUndo(
      bundled,
      (undo) =>
        notifyOutcome(
          `Deleted ${countPhrase(done)}`,
          undefined,
          [refused.length > 0 && `${countPhrase(refused)} couldn’t be deleted.`, ...warnings],
          undo,
          owed ? finishOwed : undefined,
        ),
      rules.deleteUndo,
    )
  }

  // A re-list can drop the checked rows a frame before the bar withdraws, so a press may name none.
  const restore = (targets: BundleRow[]): Promise<void> =>
    flight(async () => {
      if (targets.length > 1) return restoreBatch(targets)
      if (targets.length) return restoreOne(targets[0])
    })

  const remove = (targets: BundleRow[]): Promise<void> =>
    flight(async () => {
      if (targets.length > 1) return deleteBatch(targets)
      if (targets.length && (await rules.deleteOne(targets[0]))) spendUndo(targets[0].bundlePath)
    })

  const openMenu = async (row: BundleRow): Promise<void> => {
    const targets = actedOn(checked, visible, row, (r) => r.bundlePath)
    const batch = targets.length > 1
    const places = !batch && !row.homeResolves ? placesFor(row) : null
    const action = await popMenu(
      restoreMenuItems({ batch, ...(places ? { destinations: places.targets } : {}) }),
    )
    if (!action) return
    if (action.startsWith('restoreTo:') && places) {
      const id = action.slice('restoreTo:'.length)
      return flight(() => restoreOne(row, { kind: places.kind, id }))
    }
    switch (action) {
      case 'restore':
        return restore(targets)
      case 'delete':
        return remove(targets)
    }
  }

  return { listing, visible, checked, picked, toggle, openMenu, date, restore, remove }
}
