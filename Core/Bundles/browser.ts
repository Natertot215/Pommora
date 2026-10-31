// The renderer's half of the bundle owner: what a store's browser does with the rows `rows.ts` builds host-side.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { actedOn, checkedIn, retained, toggled } from '@pommora/uix/Utilities/checkSet'
import { useStableApi } from '@pommora/uix/Utilities/stableApi'
import { entityIcon } from '../Assets/entityIconPolicy'
import { askEmptyTrash, askTrashing, runBundled } from '../Interface/Confirm/confirmations'
import { type ActionBar, useDeclareActions } from '../Interface/Notifications/notifications'
import { countPhrase, isContainerKind } from '../Nexus/entities'
import type { MutateRequest, RestoreDestination } from '../Nexus/mutateRequest'
import { matches, matchQuery } from '../Paths/caseFold'
import { isAtOrUnder, relDirname } from '../Paths/posix'
import { containerTargets, contextTargets } from '../Actions/destinationTree'
import { popMenu } from '../Actions/menuActions'
import { destinationRows, type MoveTarget } from '../Actions/pageMenu'
import { restoreMenuItems } from '../Actions/restoreMenu'
import { useSession } from '../Session/store'
import { storesChanged } from '../Session/nexusSlice'
import { dialer } from '../Platform/dialer'
import type { Personalization } from '../Settings/personalization'
import type { BundleStore } from '../Paths/bundleLayout'
import type { BundleCrumb, BundleRow } from './rows'

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

type BundleOp = 'restore' | 'emptyBundle' | 'delete'

/** What an op sends for a row: an Archive delete its path and kind, a restore or an empty its bundle. */
const requestOf = (
  row: BundleRow,
  op: BundleOp,
  destination?: RestoreDestination,
): MutateRequest =>
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

/** What the Trash and the Archive do differently under one browser: what a delete sends and how it asks. */
function rulesOf(kind: BundleStore['kind']): {
  deleteOp: 'emptyBundle' | 'delete'
  askDelete: (targets: BundleRow[]) => Promise<boolean>
} {
  switch (kind) {
    case 'trash':
      return { deleteOp: 'emptyBundle', askDelete: askEmptyTrash }
    case 'archive':
      return { deleteOp: 'delete', askDelete: askTrashing }
  }
}

type Listing = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; rows: BundleRow[] }

/** A store's browser, narrowed `within` a top-level Set when given: its rows, listed again on each change while shown and on each showing, as a tree whose open map holds each open container's inner rows, asked for on opening and again on each listing; the checked set, kept across a container's collapsing, and the outermost checked rows in view; `rowClick`, a row's one click intent, opening a page through `open` when given; and Restore and Delete, run by the right-click menu over a row or the checked rows in view and by the bar it declares over the checked rows. */
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
} {
  const rules = rulesOf(store.kind)
  const nexusId = useSession((s) => s.tree?.nexus.id)
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

  /** Opens a closed container at once, its rows filled in when the host answers while it's still pending, or closes an open one with every open row inside it. A failed ask leaves it pending for the next listing to ask again, and an address the host can't list opens empty while its row lists. */
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

  // A re-list can drop the checked rows a frame before the bar withdraws, so a press may name none.
  const restore = (targets: BundleRow[], destination?: RestoreDestination): Promise<void> =>
    flight(async () => {
      if (!targets.length) return
      // What has no home left asks once where it goes, one ask per kind of destination, unless a menu's submenu chose, and a dismissed ask restores nothing.
      const to = new Map<DestinationKind, RestoreDestination>()
      const homeless = destination ? [] : targets.filter((r) => !r.homeResolves)
      for (const kind of new Set(homeless.map(destinationKind))) {
        const asked = await askDestination(kind)
        if (!asked) return
        to.set(kind, asked)
      }
      const toOf = (row: BundleRow): RestoreDestination | undefined =>
        destination ?? (row.homeResolves ? undefined : to.get(destinationKind(row)))
      const rows = targets.map((row) => ({ ...row, req: requestOf(row, 'restore', toOf(row)) }))
      await runBundled('Restored', rows, nexusId)
    })

  const remove = (targets: BundleRow[]): Promise<void> =>
    flight(async () => {
      if (!targets.length || !(await rules.askDelete(targets))) return
      const rows = targets.map((row) => ({ ...row, req: requestOf(row, rules.deleteOp) }))
      await runBundled('Deleted', rows, nexusId)
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
      return restore([one], { kind, id })
    }
    switch (action) {
      case 'restore':
        return restore(targets)
      case 'delete':
        return remove(targets)
    }
  }

  const api = useStableApi({
    restore: () => void restore(picked),
    remove: () => void remove(picked),
  })
  const count = picked.length > 0 ? countPhrase(picked) : null
  const bar = useMemo<ActionBar | null>(
    () => (count === null ? null : { count, restore: api.restore, remove: api.remove }),
    [count, api],
  )
  useDeclareActions(bar, shown)

  return {
    listing,
    visible,
    found: top.length,
    checked,
    picked,
    toggle,
    rowClick,
    openMenu,
  }
}
