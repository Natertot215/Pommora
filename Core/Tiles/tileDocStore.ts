import { capSet } from '@pommora/uix/Utilities/capMap'
import type { Result } from '@pommora/core/Contract/result'
import {
  type EntryPatch,
  knownTile,
  type Landed,
  patchEntries,
  type TileDoc,
  type TileDocPatch,
  type TileHostRef,
} from '@pommora/core/Tiles/tiles'
import { isPlainObject } from '../Contract/validators'
import { stableStringify } from '../Files/stableJson'
import { navKey } from '../Navigation/navRef'
import { decodeLayout } from './Layout/codec'
import { emptyLayout, type TileLayout, tileIds } from './Layout/model'
import { dialer } from '../Platform/dialer'
import { reportRefusal } from '../Interface/Notifications/notifications'
import { createBodyWriter, sessionWriter } from '../Session/saveScheduler'

const BODY_CAP = 50

export interface TileDocState {
  layout: TileLayout
  tiles: unknown[]
  ready: boolean
  lock: boolean
}

type LayoutUpdate = (cur: TileLayout) => TileLayout

interface HostDoc {
  host: TileHostRef
  state: TileDocState
  listeners: Set<() => void>
  off: () => void
  lastSave: Promise<unknown>
  writing: number
  overlapped: boolean
  holds: number
  queued: LayoutUpdate[]
  heldPush: boolean
}

// One frozen snapshot for every document that has not loaded and for every reader with no host: `useSyncExternalStore` compares snapshots by reference.
export const EMPTY: TileDocState = { layout: emptyLayout(), tiles: [], ready: false, lock: false }

const bodies = new Map<string, string>()
// The text each tile's file last held as far as this window knows, with its hash: a read or an acknowledged save sets it, a save carries the hash, and a refused save merges against the text.
const bases = new Map<string, TileBase>()
const bodyListeners = new Map<string, Set<() => void>>()

export const tileBodyWriter = createBodyWriter('the tile')

export const writeTileBody = (tileId: string, text: string): void => {
  capSet(bodies, tileId, text, BODY_CAP)
}

export const readTileBody = (tileId: string): string | null => bodies.get(tileId) ?? null

export interface TileBase {
  text: string
  hash: string
}

export const readTileBase = (tileId: string): TileBase | undefined => bases.get(tileId)

export const setTileBase = (tileId: string, base: TileBase): void => void bases.set(tileId, base)

// A sibling mount re-seeds once per debounced save, never per keystroke.
export const settleTileBody = (tileId: string): void => {
  for (const fn of bodyListeners.get(tileId) ?? []) fn()
}

/** The file moved without this window's typing: every mount that isn't editing reads it again. */
export const dropTileBodies = (ids: Iterable<string>): void => {
  for (const id of ids) {
    bodies.delete(id)
    settleTileBody(id)
  }
}

export const subscribeTileBody = (tileId: string, fn: () => void): (() => void) => {
  const set = bodyListeners.get(tileId) ?? new Set()
  bodyListeners.set(tileId, set)
  set.add(fn)
  return () => {
    set.delete(fn)
    if (set.size === 0) bodyListeners.delete(tileId)
  }
}

const removing = new Set<string>()

export const markTileRemoving = (tileId: string): void => void removing.add(tileId)

export const unmarkTileRemoving = (tileId: string): void => void removing.delete(tileId)

export const isTileRemoving = (tileId: string): boolean => removing.has(tileId)

const docs = new Map<string, HostDoc>()

const at = (host: TileHostRef): HostDoc | undefined => docs.get(navKey(host))

// Every write joins the ones in flight, so a flush awaits all of them and a reload sees any of them land.
const joined = <T>(doc: HostDoc, sent: Promise<T>): Promise<T> => {
  doc.lastSave = Promise.all([doc.lastSave, sent])
  return sent
}

// A refused save says why and reads the disk again, whichever key it carried, so the board never keeps a change the file refused.
const save = (doc: HostDoc, patch: TileDocPatch): Promise<Result<Landed>> =>
  joined(
    doc,
    dialer()
      .ask('tiles:save', doc.host, patch)
      .then((r) => {
        if (!reportRefusal(r)) void reload(doc)
        return r
      }),
  )

// An entry or lock write answers with the document it left, and a lone write's answer is what the disk holds. Writes that overlap can land in any order, so the board keeps its own paint until the last one answers and then reads the disk.
const land = <T>(doc: HostDoc, sent: Promise<Result<Landed<T>>>): Promise<Result<Landed<T>>> => {
  doc.writing += 1
  doc.overlapped ||= doc.writing > 1
  return sent.then((r) => {
    doc.writing -= 1
    if (doc.writing > 0 || at(doc.host) !== doc) return r
    if (doc.overlapped) {
      doc.overlapped = false
      void reload(doc)
    } else if (r.ok)
      put(doc, { tiles: kept(doc, r.value.landed.tiles), lock: r.value.landed.locked })
    return r
  })
}

const layoutKey = (doc: HostDoc): string => `layout:${navKey(doc.host)}`

const flush = (doc: HostDoc): Promise<void> => sessionWriter.flush(layoutKey(doc))

const notify = (doc: HostDoc): void => {
  for (const fn of doc.listeners) fn()
}

const put = (doc: HostDoc, next: Partial<TileDocState>): void => {
  doc.state = { ...doc.state, ...next }
  notify(doc)
}

// An entry the disk holds as this window already does keeps its object, so a write re-parses and redraws only what it changed.
const kept = (doc: HostDoc, tiles: unknown[]): unknown[] => {
  const held = new Map(doc.state.tiles.map((b) => [stableStringify(b), b]))
  return tiles.map((b) => held.get(stableStringify(b)) ?? b)
}

const adopt = (doc: HostDoc, raw: TileDoc): void => {
  if (at(doc.host) !== doc) return
  const layout = decodeLayout(raw.layout) ?? emptyLayout()
  revive(layout)
  put(doc, {
    layout,
    tiles: kept(doc, raw.tiles),
    ready: true,
    lock: raw.locked,
  })
}

// A tile a layout holds again is alive, whatever a removal marked before: the disk brought it back, or an Undo did.
const revive = (layout: TileLayout): void => {
  if (removing.size) for (const id of tileIds(layout)) removing.delete(id)
}

const writeLayout = (doc: HostDoc, layout: TileLayout): void => {
  revive(layout)
  put(doc, { layout })
  sessionWriter.schedule(layoutKey(doc), () => save(doc, { layout }))
}

// A disk change is read only after the local write it may race has landed, and a layout the user changed during the read sends before the read is weighed, so the user's own last action never silently reverts; a write that lands during the read sends the read again.
const reload = async (doc: HostDoc): Promise<void> => {
  await flush(doc)
  const saved = doc.lastSave
  await saved
  const r = await dialer().ask('tiles:get', doc.host)
  await flush(doc)
  if (!r.ok || at(doc.host) !== doc) return
  if (doc.lastSave !== saved) return reload(doc)
  if (doc.holds > 0) {
    doc.heldPush = true
    return
  }
  adopt(doc, r.value)
}

function create(host: TileHostRef): HostDoc {
  const key = navKey(host)
  const doc: HostDoc = {
    host,
    state: EMPTY,
    listeners: new Set(),
    off: () => {},
    lastSave: Promise.resolve(),
    writing: 0,
    overlapped: false,
    holds: 0,
    queued: [],
    heldPush: false,
  }
  docs.set(key, doc)
  doc.off = dialer().on('tiles:changed', (changed) => {
    if (navKey(changed) !== key) return
    dropTileBodies(tileIds(doc.state.layout))
    if (doc.holds > 0) doc.heldPush = true
    else void reload(doc)
  })
  void dialer()
    .ask('tiles:get', host)
    .then((r) => {
      if (r.ok) adopt(doc, r.value)
      // A board the host fails to read stays closed and says so; a Space gone or a Nexus mid-switch leaves it closed quietly.
      else if (r.error.code === 'operation-failed') reportRefusal(r)
    })
  return doc
}

async function retire(doc: HostDoc): Promise<void> {
  await flush(doc)
  await doc.lastSave
  // A remount inside the same commit — a host swapped in place, React's double-invoked effects — re-subscribes before this resolves, and keeps the document rather than re-reading the file.
  if (doc.listeners.size > 0) return
  if (at(doc.host) === doc) {
    docs.delete(navKey(doc.host))
    for (const id of tileIds(doc.state.layout)) {
      bodies.delete(id)
      bases.delete(id)
      removing.delete(id)
    }
  }
  doc.off()
  doc.off = () => {}
}

export function subscribeTileDoc(host: TileHostRef, fn: () => void): () => void {
  const doc = at(host) ?? create(host)
  doc.listeners.add(fn)
  return () => {
    doc.listeners.delete(fn)
    if (doc.listeners.size === 0) void retire(doc)
  }
}

export const readTileDoc = (host: TileHostRef): TileDocState => at(host)?.state ?? EMPTY

export function setTileLayout(host: TileHostRef, layout: TileLayout): void {
  const doc = at(host)
  if (doc) writeLayout(doc, layout)
}

// The layout writes before its entry op, so a crash leaves an invisible orphan rather than a dead box; a held gesture defers the commit, so the updater builds on the tree live at release.
export function commitTileLayout(host: TileHostRef, update: LayoutUpdate): void {
  const doc = at(host)
  if (!doc) return
  if (doc.holds > 0) {
    doc.queued.push(update)
    return
  }
  writeLayout(doc, update(doc.state.layout))
  void flush(doc)
}

// A gesture commits the tree it computed from its press-time snapshot, so while ANY mount holds one, a disk reload and a sibling's structural commit both wait.
export function holdTileDoc(host: TileHostRef, held: boolean): void {
  const doc = at(host)
  if (!doc) return
  doc.holds += held ? 1 : -1
  if (doc.holds > 0) return
  const queued = doc.queued
  doc.queued = []
  for (const update of queued) writeLayout(doc, update(doc.state.layout))
  if (queued.length) void flush(doc)
  if (doc.heldPush) {
    doc.heldPush = false
    void reload(doc)
  }
}

export function landTileWrite<T>(
  host: TileHostRef,
  sent: Promise<Result<Landed<T>>>,
): Promise<Result<Landed<T>>> {
  const doc = at(host)
  return doc ? land(doc, joined(doc, sent)) : sent
}

// The patch paints at once and merges into the one entry on disk, so no copy of the list is ever sent back over it.
export function patchTileEntry(
  host: TileHostRef,
  id: string,
  patchOf: (raw: Record<string, unknown>) => EntryPatch | null,
): void {
  const doc = at(host)
  if (!doc) return
  const raw = doc.state.tiles.find((b) => knownTile(b)?.id === id)
  const patch = isPlainObject(raw) ? patchOf(raw) : null
  if (!patch) return
  put(doc, { tiles: patchEntries(doc.state.tiles, id, patch) })
  void land(doc, save(doc, { entry: { id, patch } }))
}

export function setTileDocLock(host: TileHostRef, locked: boolean): void {
  const doc = at(host)
  if (!doc?.state.ready || doc.state.lock === locked) return
  put(doc, { lock: locked })
  void land(doc, save(doc, { locked }))
}

// The Nexus-adopt path awaits this while the OLD root is still bound — a write after the flip would bind the new Nexus and overwrite a same-relative-path file. Layouts land through the session writer's own flush.
export function flushAllTileDocs(): Promise<void> {
  return Promise.all([
    ...[...docs.values()].map((doc) => doc.lastSave),
    tileBodyWriter.flushAll(),
  ]).then(() => undefined)
}

// Drops without writing: the root has flipped, so anything still owed would land in the new Nexus, and a lingering mount's `retire` flushes what it finds — the session writer's pending layouts were cancelled before this, and queued updates are discarded here.
export function dropAllTileDocs(): void {
  const live = [...docs.values()]
  docs.clear()
  bodies.clear()
  bases.clear()
  removing.clear()
  tileBodyWriter.cancelAll()
  for (const doc of live) {
    doc.queued = []
    doc.off()
    doc.off = () => {}
    notify(doc)
  }
}
