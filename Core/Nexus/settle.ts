// The one place a change reaches the window. The app's own writes land here as events while they happen; a write's gate and the watcher's batch then stamp what their events listed missing, and settle: the walk the events owed, and one push of what moved.

import { relDirname, relative } from '../Paths/posix'
import { escapes } from '../Paths/pathSafety'
import type { HostContext } from '../Contract/handlers'
import { errText } from '../Contract/result'
import { type FileEvent, setOwnTap } from '../Files/writeEcho'
import { getHeldAssetMap, refreshAssetMap } from '../Assets/assetMap'
import { seedContentIndex } from '../Index/indexSeed'
import { dropTileHeadingLinks } from '../Tiles/tilesFile'
import { stampMissing } from './adopt'
import { applyEvents, indexEvent, nothingOwed, owedFor } from './fileEvents'
import { diskMoved, dropLiveTree, heldTreeOf, refreshAfterWrite } from './liveTree'
import { adopting, sessionRoot } from './session'
import type { NexusTree, Unreadable, ValueChange } from './tree'
import { diff } from './treeDelta'
import { liveIdIndex } from './heldPages'

// ── The app's own events ──

async function applyOwn(ev: FileEvent): Promise<void> {
  const root = sessionRoot()
  if (root === null || escapes(relative(root, ev.absPath))) return
  if (heldTreeOf(root)) return applyEvents(root, [ev])
  // No tree to patch: a walk in flight reads the disk again. An open stamps before its stores are bound, and its own seed follows its walk.
  diskMoved()
  if (!adopting()) await indexEvent(root, ev)
}

setOwnTap(applyOwn)

// ── The settle ──

type Pusher = Pick<HostContext, 'push' | 'watch'>

let settling: Promise<unknown> = Promise.resolve()
let reseeding: Promise<void> = Promise.resolve()
let pushed: NexusTree | null = null
let version = 0
let batching = false

// A file whose stamp is still owed is about to land under its ID, so the window isn't sent it as unreadable meanwhile.
function shown(tree: NexusTree, stamp: readonly Unreadable[]): NexusTree {
  if (!stamp.length || !tree.unreadable) return tree
  const owed = new Set(stamp.map((u) => u.path))
  const unreadable = tree.unreadable.filter((u) => !owed.has(u.path))
  if (unreadable.length === tree.unreadable.length) return tree
  const next: NexusTree = { ...tree, unreadable }
  if (!unreadable.length) delete next.unreadable
  return next
}

export function sent(tree: NexusTree): { tree: NexusTree; version: number } {
  pushed = shown(tree, owedFor(tree.nexus.rootPath).stamp)
  return { tree: pushed, version }
}

function valueChangesOf(root: string, values: ReadonlyMap<string, boolean>): ValueChange[] {
  const byPath = liveIdIndex(root)
  const out = new Map<string, ValueChange>()
  for (const [file, held] of values) {
    const rel = relDirname(file)
    const change = out.get(rel) ?? { rel, pageIds: [] }
    out.set(rel, change)
    const id = byPath.get(file)
    if (!id) continue
    change.pageIds.push(id)
    if (!held) continue
    change.bodyOnly ??= []
    change.bodyOnly.push(id)
  }
  return [...out.values()]
}

export async function walkOwed(root: string): Promise<void> {
  if (sessionRoot() !== root) return
  const due = owedFor(root)
  while (due.walk) {
    due.walk = false
    dropTileHeadingLinks()
    const assets = getHeldAssetMap(root)
    try {
      await refreshAfterWrite(root)
      // The map is patch-only, so the fallback walk is where the listing is taken again.
      if (assets && (await refreshAssetMap(root)) !== assets) due.assets = true
    } catch {
      // The walk failed after the write landed, so the held tree predates it; dropped, reads walk.
      dropLiveTree()
    }
  }
}

async function settle(pusher: Pusher, root: string): Promise<{ rescope: boolean } | null> {
  await walkOwed(root)
  // An open in progress has no window on this Nexus yet, so what is owed waits for the settle that follows it.
  if (sessionRoot() !== root || adopting()) return null
  const due = owedFor(root)
  // An arm still awaiting its file writes to this record after the push, so it is emptied in place and never replaced.
  const { pages, values, tiles, assets, corpus, rescope, stamp } = due
  Object.assign(due, nothingOwed(root), { stamp })
  const held = heldTreeOf(root)
  const tree = held && shown(held, stamp)
  const delta = tree && diff(pushed?.nexus.rootPath === root ? pushed : undefined, tree)
  if (tree) pushed = tree
  if (delta) pusher.push('nexus:changed', { version: ++version, delta })
  if (pages.size) pusher.push('pages:changed', [...pages])
  const changes = valueChangesOf(root, values)
  if (changes.length) pusher.push('values:changed', changes)
  for (const host of tiles.values()) pusher.push('tiles:changed', host)
  const map = getHeldAssetMap(root)
  if (assets && map) pusher.push('assets:changed', map)
  return corpus || rescope ? { rescope } : null
}

async function reseed(pusher: Pusher, root: string, rescope: boolean): Promise<void> {
  if (sessionRoot() !== root) return
  await seedContentIndex(root)
  // The armed scope is spent state: chokidar's ignore filter would keep reading the stale capture.
  if (rescope && sessionRoot() === root) await pusher.watch(root)
}

// A stamp's own write lands as an event that may list more, so a turn stamps until nothing is listed. A gate leaves the list to a batch in its turn, which may still be reading the files it listed.
async function stampListed(root: string, gate: boolean): Promise<void> {
  if (sessionRoot() !== root) return
  const due = owedFor(root)
  while (due.stamp.length && !(gate && batching)) await stampMissing(root, due.stamp.splice(0))
}

// The watcher's turn: the batch applies, and what it listed is stamped before its settle, so a reply's settle never waits on those stamps.
export async function settleBatch(
  pusher: Pusher,
  root: string,
  events: FileEvent[],
): Promise<void> {
  batching = true
  try {
    await applyEvents(root, events)
    await stampListed(root, false)
  } finally {
    batching = false
  }
  await flush(pusher, root)
}

// One settle at a time, and one reseed at a time on a chain of its own: a reply waits for the settles ahead of its own, and for a reseed only when its own settle found the corpus or the scope moved.
export async function flush(pusher: Pusher, root: string): Promise<void> {
  await stampListed(root, true)
  const turn = settling.then(() => settle(pusher, root))
  settling = turn.catch((e) => console.error('settle failed:', errText(e)))
  const moved = await turn.catch(() => null)
  if (!moved) return
  reseeding = reseeding
    .then(() => reseed(pusher, root, moved.rescope))
    .catch((e) => console.error('reseed failed:', errText(e)))
  await reseeding
}
