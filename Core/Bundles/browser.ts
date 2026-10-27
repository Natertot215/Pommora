// The renderer's half of the bundle owner: what a store's browser does with the rows `rows.ts` builds host-side.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { actedOn, checkedIn, retained, toggled } from '@pommora/uix/Utilities/checkSet'
import { entityIcon } from '../Assets/entityIconPolicy'
import {
  askEmptyTrash,
  askTrashing,
  offerDeleted,
  offerUndo,
  spendUndo,
} from '../Interface/Confirm/confirmations'
import { countPhrase, isContainerKind } from '../Nexus/entities'
import { notifyOutcome, unrestoredLine } from '../Interface/Notifications/notifications'
import type { MutateRequest, RestoreDestination } from '../Nexus/mutateRequest'
import { nodesByIdOf } from '../Nexus/treeIndex'
import { matches, matchQuery } from '../Paths/caseFold'
import { isAtOrUnder, relDirname } from '../Paths/posix'
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
import { destinationRows, type MoveTarget } from '../Actions/pageMenu'
import { restoreMenuItems } from '../Actions/restoreMenu'
import { useNexusForms } from '../Views/Host/useColumnStyles'
import { useSession } from '../Session/store'
import { personalizationOf } from '../Session/configSlice'
import { storesChanged } from '../Session/nexusSlice'
import { dialer } from '../Platform/dialer'
import type { Personalization } from '../Settings/personalization'
import type { BundleStore } from './layout'
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
const archivedKind = (row: BundleRow): 'page' | 'set' => (row.kind === 'set' ? 'set' : 'page')

/** A row as a browser shows it: how deep it sits, and whether it's open, null for a row with nothing to disclose. */
export interface TreeRow {
  row: BundleRow
  depth: number
  open: boolean | null
}

/** Each open container's inner rows, null while its reply is pending. */
type OpenRows = ReadonlyMap<string, readonly BundleRow[] | null>

/** The rows in view: each top row, and beneath each open one the inner rows it lists, in order. */
export function treeRows(rows: readonly BundleRow[], open: OpenRows): TreeRow[] {
  const out: TreeRow[] = []
  const walk = (row: BundleRow, depth: number): void => {
    const opens = isContainerKind(row.kind)
    const inner = opens ? open.get(row.bundlePath) : undefined
    out.push({ row, depth, open: opens ? inner !== undefined : null })
    for (const child of inner ?? []) walk(child, depth + 1)
  }
  for (const row of rows) walk(row, 0)
  return out
}

/** A batch acts on each item once: a row inside another the batch holds goes with it. */
export const outermostOf = (rows: readonly BundleRow[]): BundleRow[] =>
  rows.filter((r) => !rows.some((o) => o !== r && isAtOrUnder(r.bundlePath, o.bundlePath)))

/** The open rows a tree over `rows` still reaches; one inside a closed or gone row goes with it. */
const reachedOver = (rows: readonly BundleRow[], open: OpenRows): OpenRows => {
  const reached = new Set(treeRows(rows, open).map((t) => t.row.bundlePath))
  return new Map([...open].filter(([address]) => reached.has(address)))
}

/** The checks a listing keeps: a listed row's, and one inside a closed or pending container, whose contents aren't loaded to say otherwise. */
function keepsCheck(rows: readonly BundleRow[], open: OpenRows): (address: string) => boolean {
  const listed = new Set(
    [...rows, ...[...open.values()].flatMap((v) => v ?? [])].map((r) => r.bundlePath),
  )
  return (address) => {
    if (listed.has(address)) return true
    for (let at = relDirname(address); at; at = relDirname(at))
      if (listed.has(at)) return !open.get(at)
    return false
  }
}

const ARCHIVE_UNDO: RestoreDestination = { kind: 'archive' }

type BatchOp = 'restore' | 'emptyBundle' | 'delete'

/** What an op sends for a row: an Archive delete its path and kind, a restore or an empty its bundle. */
const requestOf = (row: BundleRow, op: BatchOp, destination?: RestoreDestination): MutateRequest =>
  op === 'delete'
    ? { op, path: row.bundlePath, kind: archivedKind(row) }
    : { op, bundlePath: row.bundlePath, ...(destination ? { destination } : {}) }

/** Where a homeless row can be sent: a Space to a Context, anything else into a container. */
type DestinationKind = Extract<RestoreDestination, { id: string }>['kind']

const destinationKind = (row: BundleRow): DestinationKind =>
  row.kind === 'space' ? 'context' : 'container'

const destinationTargets = (kind: DestinationKind): MoveTarget[] => {
  const { tree } = useSession.getState()
  switch (kind) {
    case 'context':
      return contextTargets(tree)
    case 'container':
      return containerTargets(tree)
  }
}

/** The one ask of where a kind's rows go, answering null when dismissed. */
async function askDestination(kind: DestinationKind): Promise<RestoreDestination | null> {
  const id = await popMenu(destinationRows(destinationTargets(kind), (t) => t.id))
  return id ? { kind, id } : null
}

/** A restore from the Archive undoes by archiving each item again, found by id so it follows a rename made since, back at the address it left. */
const rearchive = (rows: BundleRow[]) => async (): Promise<void> => {
  for (const row of rows) {
    const { tree, mutate } = useSession.getState()
    const id = row.stored?.id
    if (!id || !tree) continue
    const path = nodesByIdOf(tree).get(id)?.path
    if (path) await mutate({ op: 'archive', path, kind: archivedKind(row), at: row.bundlePath })
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

/** What the Trash and the Archive do differently under one browser: the date column's setting, what a delete sends and how it asks, and what a restore's and a delete's Undo do. */
function rulesOf(kind: BundleStore['kind']): {
  dateKey: DateKey
  deleteOp: 'emptyBundle' | 'delete'
  askDelete: (targets: BundleRow[]) => Promise<boolean>
  restoreUndo?: (rows: BundleRow[]) => () => Promise<void>
  deleteUndo?: RestoreDestination
} {
  switch (kind) {
    case 'trash':
      return {
        dateKey: 'trashColumnStyle',
        deleteOp: 'emptyBundle',
        askDelete: askEmptyTrash,
      }
    case 'archive':
      return {
        dateKey: 'archiveColumnStyle',
        deleteOp: 'delete',
        askDelete: askTrashing,
        restoreUndo: rearchive,
        deleteUndo: ARCHIVE_UNDO,
      }
  }
}

type Listing = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; rows: BundleRow[] }

/** A store's browser, narrowed `within` a top-level Set when given: its rows, listed again on each change while shown and on each showing, as a tree whose open map holds each open container's inner rows, asked for on opening and again on each listing; the checked set, kept across a container's collapsing, and the outermost checked rows in view; `rowClick`, a row's one click intent, opening a page through `open` when given; Restore and Delete, run by the right-click menu over a row or the checked rows in view and by the bar over the checked rows; and its date column. */
export function useBundleBrowser(
  store: BundleStore,
  {
    query,
    shown,
    within,
    open: openPage,
  }: { query: string; shown: boolean; within?: string; open?: (row: BundleRow) => void },
): {
  listing: Listing
  visible: TreeRow[]
  found: number
  checked: ReadonlySet<string>
  picked: BundleRow[]
  toggle: (bundlePath: string) => void
  rowClick: (row: BundleRow, detail: number) => void
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
  const [open, setOpen] = useState<OpenRows>(new Map())

  /** The open map a reply lands on, read as it lands rather than as it was asked, so a late reply builds on what stands by then. */
  const held = useRef<OpenRows>(new Map())
  const openTo = (next: OpenRows): void => {
    held.current = next
    setOpen(next)
  }

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
    const rows = res.value
    const addresses = [...held.current.keys()]
    const inner = addresses.length > 0 ? await dialer().ask('bundles:children', addresses) : null
    if (ask !== asks.current) return
    const replied = new Map<string, readonly BundleRow[]>(
      inner?.ok ? addresses.map((address, i) => [address, inner.value[i]]) : [],
    )
    const next = reachedOver(
      rows,
      new Map([...held.current].map(([address, v]) => [address, replied.get(address) ?? v])),
    )
    setListing({ status: 'ready', rows })
    openTo(next)
    setChecked((prev) => retained(prev, keepsCheck(rows, next)))
  }, [store.kind, store.kind === 'archive' ? store.id : null, within])

  // A parked browser stays mounted, so it lists again on its next showing rather than on every change behind another tab.
  useEffect(() => {
    if (!shown) return
    void refresh()
    return storesChanged.subscribe(() => void refresh())
  }, [refresh, shown])

  const top = useMemo(
    () => (listing.status === 'ready' ? filterRows(listing.rows, query) : []),
    [listing, query],
  )
  const visible = useMemo(() => treeRows(top, open), [top, open])
  const rowsInView = useMemo(() => visible.map((t) => t.row), [visible])
  const picked = useMemo(
    () => outermostOf(checkedIn(checked, rowsInView, (r) => r.bundlePath)),
    [checked, rowsInView],
  )
  const toggle = (bundlePath: string): void => setChecked((prev) => toggled(prev, bundlePath))

  /** Opens a closed container at once, its rows filled in when the host answers while it's still pending, or closes an open one with every open row inside it. A failed ask leaves it pending for the next listing to ask again, and an address the host can't list opens empty until the next listing drops it. */
  const disclose = async (address: string): Promise<void> => {
    const was = held.current
    if (was.has(address))
      return openTo(new Map([...was].filter(([at]) => !isAtOrUnder(at, address))))
    openTo(new Map(was).set(address, null))
    const res = await dialer().ask('bundles:children', [address])
    if (res.ok && held.current.get(address) === null)
      openTo(new Map(held.current).set(address, res.value[0]))
  }

  /** A container's click discloses it; a page's checks it, and its double-click, or a click with no count where pages open, leaves it checked and opens it. */
  const rowClick = (row: BundleRow, detail: number): void => {
    const address = row.bundlePath
    if (isContainerKind(row.kind)) {
      if (detail < 2) void disclose(address)
      return
    }
    if (detail === 2 || (detail === 0 && openPage)) {
      setChecked((prev) => (prev.has(address) ? prev : toggled(prev, address)))
      openPage?.(row)
    } else if (detail < 2) toggle(address)
  }

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

  /** A row whose place is gone asks where to go first, unless the menu's submenu already chose. */
  const restoreOne = async (row: BundleRow, destination?: RestoreDestination): Promise<void> => {
    const to =
      destination ?? (row.homeResolves ? undefined : await askDestination(destinationKind(row)))
    if (to === null) return
    const done = await mutate(requestOf(row, 'restore', to))
    if (!done) return
    spendUndo(row.bundlePath)
    // The notice replaces the slice's, so it carries the reply's lines and its Try Again.
    notifyOutcome(
      `Restored ${done.landedAs ? steppedTo(row.title, done.landedAs) : `“${row.title}”`}`,
      undefined,
      [done.unrestored !== undefined && unrestoredLine(done.unrestored), done.cascade?.warning],
      rules.restoreUndo?.([row]),
      done.cascade?.owed ? finishOwed : undefined,
    )
  }

  const deleteOne = async (row: BundleRow): Promise<void> => {
    if (!(await rules.askDelete([row]))) return
    const done = await mutate(requestOf(row, rules.deleteOp))
    if (!done) return
    spendUndo(row.bundlePath)
    offerDeleted(row.title, done, rules.deleteUndo)
  }

  /** Answers null when a Nexus switch stopped it, as the slice's `mutate` drops a held op: the paths left belong to the Nexus it left, so the batch reports nothing. */
  const many = async (
    targets: BundleRow[],
    op: BatchOp,
    destinationOf?: (row: BundleRow) => RestoreDestination | undefined,
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
      const to = destinationOf?.(row)
      const res = await mutate(requestOf(row, op, to), { quiet: true })
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
    // What has no home left asks once where it goes, one ask per kind of destination, and a dismissed ask restores nothing.
    const to = new Map<DestinationKind, RestoreDestination>()
    for (const kind of new Set(targets.filter((r) => !r.homeResolves).map(destinationKind))) {
      const destination = await askDestination(kind)
      if (!destination) return
      to.set(kind, destination)
    }
    const ran = await many(targets, 'restore', (row) =>
      row.homeResolves ? undefined : to.get(destinationKind(row)),
    )
    if (!ran) return
    const { done, refused, unrestored, warnings, renamed, owed } = ran
    notifyOutcome(
      `Restored ${countPhrase(done)}`,
      renamed.length > 1 ? `${renamed.length} Renamed` : renamed[0],
      [
        refused.length > 0 && `${countPhrase(refused)} couldn’t be restored.`,
        unrestored.length > 0 && unrestoredLine(unrestored),
        ...warnings,
      ],
      done.length > 0 ? rules.restoreUndo?.(done) : undefined,
      owed ? finishOwed : undefined,
    )
  }

  const deleteBatch = async (targets: BundleRow[]): Promise<void> => {
    if (!(await rules.askDelete(targets))) return
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
      if (targets.length) return deleteOne(targets[0])
    })

  const openMenu = async (row: BundleRow): Promise<void> => {
    const targets = outermostOf(actedOn(checked, rowsInView, row, (r) => r.bundlePath))
    const batch = targets.length > 1
    const [one] = targets
    const kind = !batch && !one.homeResolves ? destinationKind(one) : null
    const action = await popMenu(
      restoreMenuItems({ batch, ...(kind ? { destinations: destinationTargets(kind) } : {}) }),
    )
    if (!action) return
    if (action.startsWith('restoreTo:') && kind) {
      const id = action.slice('restoreTo:'.length)
      return flight(() => restoreOne(one, { kind, id }))
    }
    switch (action) {
      case 'restore':
        return restore(targets)
      case 'delete':
        return remove(targets)
    }
  }

  return {
    listing,
    visible,
    found: top.length,
    checked,
    picked,
    toggle,
    rowClick,
    openMenu,
    date,
    restore,
    remove,
  }
}
