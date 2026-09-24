import { capSet } from '@pommora/uix/Utilities/capMap'
import { type TileHostRef, tileHostKey } from '@pommora/core/Tiles/tiles'
import { decodeLayout, encodeLayout } from './Layout/codec'
import { emptyLayout, type TileLayout, tileIds } from './Layout/model'
import { host as dialer } from '../Platform/dialer'
import { createBodyWriter } from '../Session/saveScheduler'

const SAVE_DEBOUNCE_MS = 300
const BODY_CAP = 50

export interface TileDocState {
  layout: TileLayout
  tiles: unknown[]
  ready: boolean
  lock: boolean | null
}

type LayoutUpdate = (cur: TileLayout) => TileLayout

interface TileDoc {
  host: TileHostRef
  state: TileDocState
  listeners: Set<() => void>
  off: () => void
  timer: ReturnType<typeof setTimeout> | null
  pending: TileLayout | null
  lastSave: Promise<unknown>
  holds: number
  queued: LayoutUpdate[]
  heldPush: boolean
}

// One frozen snapshot for every document that has not loaded and for every reader with no host: `useSyncExternalStore` compares snapshots by reference.
export const EMPTY: TileDocState = { layout: emptyLayout(), tiles: [], ready: false, lock: null }

const bodies = new Map<string, string>()
const bodyListeners = new Map<string, Set<() => void>>()

export const tileBodyWriter = createBodyWriter('the tile')

export const writeTileBody = (tileId: string, text: string): void => {
  capSet(bodies, tileId, text, BODY_CAP)
}

export const readTileBody = (tileId: string): string | null => bodies.get(tileId) ?? null

// A sibling mount re-seeds once per debounced save, never per keystroke.
export const settleTileBody = (tileId: string): void => {
  for (const fn of bodyListeners.get(tileId) ?? []) fn()
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

export const isTileRemoving = (tileId: string): boolean => removing.has(tileId)

const docs = new Map<string, TileDoc>()

const at = (host: TileHostRef): TileDoc | undefined => docs.get(tileHostKey(host))

// Every write joins the ones in flight, so a flush awaits all of them and a reload sees any of them land.
const save = (
  doc: TileDoc,
  patch: { layout?: unknown; tiles?: unknown[]; locked?: boolean },
): void => {
  doc.lastSave = Promise.all([doc.lastSave, dialer().ask('tiles:save', doc.host, patch)])
}

const notify = (doc: TileDoc): void => {
  for (const fn of doc.listeners) fn()
}

const put = (doc: TileDoc, next: Partial<TileDocState>): void => {
  doc.state = { ...doc.state, ...next }
  notify(doc)
}

const adopt = (doc: TileDoc, raw: { layout: unknown; tiles: unknown[]; locked: boolean }): void => {
  if (at(doc.host) !== doc) return
  const layout = decodeLayout(raw.layout) ?? emptyLayout()
  // A tile the disk holds again is alive, whatever a removal marked before.
  for (const id of tileIds(layout)) removing.delete(id)
  put(doc, {
    layout,
    tiles: raw.tiles,
    ready: true,
    lock: raw.locked,
  })
}

const flush = (doc: TileDoc): void => {
  if (doc.timer) clearTimeout(doc.timer)
  if (doc.pending) save(doc, { layout: encodeLayout(doc.pending) })
  doc.timer = null
  doc.pending = null
}

const writeLayout = (doc: TileDoc, layout: TileLayout): void => {
  put(doc, { layout })
  if (doc.timer) clearTimeout(doc.timer)
  doc.pending = layout
  doc.timer = setTimeout(() => flush(doc), SAVE_DEBOUNCE_MS)
}

// A disk change is read only after the local write it may race has landed, so the user's own last action never silently reverts.
const reload = async (doc: TileDoc): Promise<void> => {
  flush(doc)
  const saved = doc.lastSave
  await saved
  const r = await dialer().ask('tiles:get', doc.host)
  if (!r.ok || at(doc.host) !== doc || doc.lastSave !== saved || doc.pending !== null) return
  if (doc.holds > 0) {
    doc.heldPush = true
    return
  }
  adopt(doc, r.value)
}

function create(host: TileHostRef): TileDoc {
  const key = tileHostKey(host)
  const doc: TileDoc = {
    host,
    state: EMPTY,
    listeners: new Set(),
    off: () => {},
    timer: null,
    pending: null,
    lastSave: Promise.resolve(),
    holds: 0,
    queued: [],
    heldPush: false,
  }
  docs.set(key, doc)
  doc.off = dialer().on('tiles:changed', (changed) => {
    if (tileHostKey(changed) !== key) return
    if (doc.holds > 0) doc.heldPush = true
    else void reload(doc)
  })
  void dialer()
    .ask('tiles:get', host)
    .then((r) => {
      if (r.ok) adopt(doc, r.value)
    })
  return doc
}

async function retire(doc: TileDoc): Promise<void> {
  flush(doc)
  await doc.lastSave
  // A remount inside the same commit — a host swapped in place, React's double-invoked effects — re-subscribes before this resolves, and keeps the document rather than re-reading the file.
  if (doc.listeners.size > 0) return
  if (at(doc.host) === doc) {
    docs.delete(tileHostKey(doc.host))
    for (const id of tileIds(doc.state.layout)) {
      bodies.delete(id)
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
  flush(doc)
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
  if (queued.length) flush(doc)
  if (doc.heldPush) {
    doc.heldPush = false
    void reload(doc)
  }
}

export function refreshTileEntries(host: TileHostRef): void {
  void dialer()
    .ask('tiles:get', host)
    .then((r) => {
      const doc = at(host)
      if (r.ok && doc) put(doc, { tiles: r.value.tiles })
    })
}

export function saveTileEntries(host: TileHostRef, update: (cur: unknown[]) => unknown[]): void {
  const doc = at(host)
  if (!doc) return
  const next = update(doc.state.tiles)
  put(doc, { tiles: next })
  save(doc, { tiles: next })
}

export function syncTileDocLock(host: TileHostRef, locked: boolean | undefined): void {
  const doc = at(host)
  if (!doc || locked === undefined || doc.state.lock === null || doc.state.lock === locked) return
  put(doc, { lock: locked })
  save(doc, { locked })
}

// The Nexus-adopt path awaits this while the OLD root is still bound — a write after the flip would bind the new Nexus and overwrite a same-relative-path file.
export function flushAllTileDocs(): Promise<void> {
  const live = [...docs.values()]
  for (const doc of live) flush(doc)
  return Promise.all([...live.map((doc) => doc.lastSave), tileBodyWriter.flushAll()]).then(
    () => undefined,
  )
}

// Drops without writing: the root has flipped, so anything still owed would land in the new Nexus, and a lingering mount's `retire` flushes what it finds — pending and queued are discarded here.
export function dropAllTileDocs(): void {
  const live = [...docs.values()]
  docs.clear()
  bodies.clear()
  removing.clear()
  tileBodyWriter.cancelAll()
  for (const doc of live) {
    if (doc.timer) clearTimeout(doc.timer)
    doc.timer = null
    doc.pending = null
    doc.queued = []
    doc.off()
    doc.off = () => {}
    notify(doc)
  }
}
