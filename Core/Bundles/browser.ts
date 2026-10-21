// The renderer's half of the bundle owner: what a store's browser does with the rows `rows.ts` builds host-side.
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { capitalize } from '@pommora/uix/Utilities/capitalize'
import { actedOn, checkedIn, retained, toggled } from '@pommora/uix/Utilities/checkSet'
import { entityIcon } from '../Assets/entityIconPolicy'
import {
  askEmptyTrash,
  askTrashing,
  confirmDelete,
  offerUndo,
  spendUndo,
} from '../Interface/Confirm/confirmations'
import {
  notifyOutcome,
  notifyReport,
  unrestoredLine,
} from '../Interface/Notifications/notifications'
import { changesSettled, type MutateRequest, type RestoreDestination } from '../Nexus/mutateRequest'
import { pagesByIdOf } from '../Nexus/record'
import { findContainerById } from '../Nexus/treePatch'
import { matches, matchQuery } from '../Paths/caseFold'
import { basename } from '../Paths/posix'
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
import type { Personalization } from '../Settings/personalization'
import type { BundleStore } from './bundle'
import type { BundleCrumb, BundleRow } from './rows'

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

/** What a delete asks of the rows it acts on: one by its title, more by their count. */
export const deleteQuestion = (rows: BundleRow[]): string =>
  rows.length === 1 ? `Delete “${rows[0].title}”?` : `Delete these ${countPhrase(rows)}?`

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

const requestOf = (op: BatchOp, row: BundleRow): MutateRequest =>
  op === 'delete'
    ? { op, path: row.bundlePath, kind: archivedKind(row) }
    : { op, bundlePath: row.bundlePath }

/** A restore from the Archive undoes by archiving each item again, found by id so it follows a rename made since, under the bundle name it left, so it keeps its Archived date; one renamed or stepped aside since takes a fresh stamp, since that name no longer fits it. */
const rearchive = (rows: BundleRow[]) => async (): Promise<void> => {
  for (const row of rows) {
    const { tree, mutate } = useSession.getState()
    const id = row.stored?.id
    if (!id || !tree) continue
    const path =
      row.kind === 'set' ? findContainerById(tree, id)?.path : pagesByIdOf(tree).get(id)?.path
    if (path)
      await mutate({ op: 'archive', path, kind: archivedKind(row), leaf: basename(row.bundlePath) })
  }
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
        askBatch: (targets) => askEmptyTrash(deleteQuestion(targets)),
        deleteOne: async (row) =>
          (await askEmptyTrash(deleteQuestion([row]))) &&
          (await useSession
            .getState()
            .mutate({ op: 'emptyBundle', bundlePath: row.bundlePath })) !== null,
      }
    case 'archive':
      return {
        dateKey: 'archiveColumnStyle',
        deleteOp: 'delete',
        askBatch: (targets) => askTrashing(deleteQuestion(targets), targets.map(archivedKind)),
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
  const [listing, setListing] = useState<Listing>({ status: 'loading' })
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())

  // Keyed on the store's fields rather than the object, so a caller may pass a fresh literal.
  const refresh = useCallback(async (): Promise<void> => {
    const res = await dialer().ask('bundles:list', store, within)
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

  const one = async (
    req: Extract<MutateRequest, { bundlePath: string }>,
    row: BundleRow,
  ): Promise<void> => {
    const done = await mutate(req)
    if (!done) return
    spendUndo(req.bundlePath)
    // A restore the store can undo always reports, since its notice carries the Undo; the Trash's reports a step aside alone.
    if (done.landedAs || rules.restoreUndo)
      notifyOutcome(
        `Restored ${done.landedAs ? steppedTo(row.title, done.landedAs) : `“${row.title}”`}`,
        undefined,
        [done.unrestored !== undefined && unrestoredLine(done.unrestored), done.cascade?.warning],
        rules.restoreUndo?.([row]),
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
  } | null> => {
    const done: BundleRow[] = []
    const refused: BundleRow[] = []
    const unrestored: string[] = []
    const warnings = new Set<string>()
    const renamed: string[] = []
    const bundled: string[] = []
    let stopped = false
    if (changesSettled(op)) await flushAllSaves()
    for (const row of targets) {
      stopped = useSession.getState().tree?.nexus.id !== nexusId
      if (stopped) break
      const res = await dialer().ask('mutate', requestOf(op, row))
      ;(res.ok ? done : refused).push(row)
      if (!res.ok) continue
      spendUndo(row.bundlePath)
      unrestored.push(...(res.value.unrestored ?? []))
      if (res.value.cascade?.warning) warnings.add(res.value.cascade.warning)
      if (res.value.landedAs) renamed.push(steppedTo(row.title, res.value.landedAs))
      if (res.value.bundled) bundled.push(res.value.bundled.bundlePath)
    }
    storesChanged.emit()
    return stopped ? null : { done, refused, unrestored, warnings: [...warnings], renamed, bundled }
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
      done.length > 0 ? rules.restoreUndo?.(done) : undefined,
    )
  }

  const deleteBatch = async (targets: BundleRow[]): Promise<void> => {
    if (!(await rules.askBatch(targets))) return
    const ran = await many(targets, rules.deleteOp)
    if (!ran) return
    const { done, refused, warnings, bundled } = ran
    // An empty mints no bundle, so only a batch the Archive moved into the Trash offers its Undo.
    offerUndo(
      bundled,
      (undo) =>
        notifyOutcome(
          `Deleted ${countPhrase(done)}`,
          undefined,
          [refused.length > 0 && `${countPhrase(refused)} couldn’t be deleted.`, ...warnings],
          undo,
        ),
      rules.deleteUndo,
    )
  }

  const restore = (targets: BundleRow[]): Promise<void> =>
    targets.length === 1
      ? one({ op: 'restore', bundlePath: targets[0].bundlePath }, targets[0])
      : restoreBatch(targets)

  const remove = async (targets: BundleRow[]): Promise<void> => {
    if (targets.length > 1) return deleteBatch(targets)
    if (await rules.deleteOne(targets[0])) spendUndo(targets[0].bundlePath)
  }

  const openMenu = async (row: BundleRow): Promise<void> => {
    const targets = actedOn(checked, visible, row, (r) => r.bundlePath)
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
        return restore(targets)
      case 'delete':
        return remove(targets)
    }
  }

  return { listing, visible, checked, picked, toggle, openMenu, date, restore, remove }
}
