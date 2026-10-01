// The one place a change reaches the window. The app's own writes land here as events while they happen; a write's gate and the watcher's batch then settle: the stamps and the walk the events owed, and one push of what moved.

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
import type { NexusTree, ValueChange } from './tree'
import { liveIdIndex } from './valuesChanged'

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

export function sent(tree: NexusTree): NexusTree {
  pushed = tree
  return tree
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

async function settle(pusher: Pusher, root: string): Promise<{ rescope: boolean } | null> {
  if (sessionRoot() !== root) return null
  const due = owedFor(root)
  // A stamp's own write lands as an event, which may owe a walk in turn; the walk runs after the stamps, so it reads what they wrote.
  while (due.walk || due.stamp.length) {
    await stampMissing(root, due.stamp.splice(0))
    if (!due.walk) continue
    due.walk = false
    dropTileHeadingLinks()
    const assets = getHeldAssetMap(root)
    try {
      await refreshAfterWrite(root)
      // The map is patch-only, so the fallback walk is where the listing is taken again.
      if ((await refreshAssetMap(root)) !== assets) due.assets = true
    } catch {
      // The walk failed after the write landed, so the held tree predates it; dropped, reads walk.
      dropLiveTree()
    }
  }
  // An open in progress has no window on this Nexus yet, so what is owed waits for the settle that follows it.
  if (sessionRoot() !== root || adopting()) return null
  // An arm still awaiting its file writes to this record after the push, so it is emptied in place and never replaced.
  const { pages, values, tiles, assets, corpus, rescope } = due
  Object.assign(due, nothingOwed(root))
  const tree = heldTreeOf(root)
  if (tree && tree !== pushed) pusher.push('nexus:changed', sent(tree))
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

// One settle at a time, and one reseed at a time on a chain of its own: a reply waits for the settles ahead of its own, and for a reseed only when its own settle found the corpus or the scope moved.
export async function flush(pusher: Pusher, root: string): Promise<void> {
  const turn = settling.then(() => settle(pusher, root))
  settling = turn.catch((e) => console.error('settle failed:', errText(e)))
  const moved = await turn.catch(() => null)
  if (!moved) return
  reseeding = reseeding
    .then(() => reseed(pusher, root, moved.rescope))
    .catch((e) => console.error('reseed failed:', errText(e)))
  await reseeding
}
