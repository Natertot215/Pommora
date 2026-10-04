// The one place a change to the tree, pages, values, tiles, or assets reaches the window. The app's own writes land here as events while they happen; a write's gate and the watcher's batch then stamp what their events listed missing, and settle: the walk the events owed, whose own listing of what is missing its ID is stamped as `stampable` allows and settled in turn, the options the changed files hold registered, and one push of what moved.

import { relDirname, relative } from '../Paths/posix'
import { escapes } from '../Paths/pathSafety'
import type { HostContext } from '../Contract/handlers'
import { errText } from '../Contract/result'
import { inTurns } from '../Platform/inTurns'
import { type FileEvent, setOwnTap } from '../Files/writeEcho'
import { getHeldAssetMap, refreshAssetMap } from '../Assets/assetMap'
import { seedContentIndex } from '../Index/indexSeed'
import { registerHeldOptions } from '../Properties/optionOps'
import { dropTileHeadingLinks } from '../Tiles/tilesFile'
import { stampMissing } from './adopt'
import {
  applyEvents,
  indexEvent,
  nothingOwed,
  oweAgain,
  oweRescope,
  owedFor,
  stampable,
} from './fileEvents'
import { scopeOf } from '../Settings/codec'
import { diskMoved, dropLiveTree, heldTreeOf, refreshTree } from './liveTree'
import { adopting, sessionRoot } from './session'
import type { NexusTree, Unreadable, ValueChange } from './tree'
import { deltaOf } from './treeDelta'
import { liveIdIndex } from './heldPages'

// ── The app's own events ──

async function applyOwn(ev: FileEvent): Promise<void> {
  const root = sessionRoot()
  if (root === null || escapes(relative(root, ev.absPath))) return
  // Every own write marks the disk moved, since one that leaves the tree as it already stood (a rename's later writes) would otherwise let a walk in flight install what it read before it; the editor's body save is the exception, since it leaves the frontmatter a walk reads as it was.
  if (ev.event === 'move' || !ev.bodyOnly) diskMoved()
  if (heldTreeOf(root)) {
    // Under a folder awaiting its stamp, that folder's read holds the page if it carries its ID, and otherwise leaves it for its own event or a walk.
    await applyEvents(root, [ev])
    return
  }
  // No tree to patch: an open stamps before it holds a tree, and the tree it seeds is read after its stamps.
  if (!adopting()) await indexEvent(root, ev)
}

// The writers reach the settle through a tap rather than an import because the settle's own imports (`adopt`, `fileEvents`, `liveTree`) import `Core/Files`, so a writer importing the settle would close a cycle; it is installed on import, not by a host's call, since it is the same function for the life of the process, where the Sync taps are a session's to set and clear and the commands tap is the host's.
setOwnTap(applyOwn)

// ── The settle ──

type Pusher = Pick<HostContext, 'push' | 'watch'>

const inTurn = inTurns((e) => console.error('settle failed:', errText(e)))
const reseeding = inTurns((e) => console.error('reseed failed:', errText(e)))
let pushed: NexusTree | null = null
let version = 0
let batching = false
let stamping = 0

// A file whose stamp is still owed is about to land under its ID, so the window isn't sent it as unreadable meanwhile.
function shown(tree: NexusTree, stamp: readonly Unreadable[]): NexusTree {
  if (!stamp.length || !tree.unreadable) return tree
  const pending = new Set(stamp.map((u) => u.path))
  const unreadable = tree.unreadable.filter((u) => !pending.has(u.path))
  if (unreadable.length === tree.unreadable.length) return tree
  const next: NexusTree = { ...tree, unreadable }
  if (!unreadable.length) delete next.unreadable
  return next
}

// Records the tree the window was handed, the baseline the next difference is taken against.
export function recordHanded(tree: NexusTree): { tree: NexusTree; version: number } {
  pushed = shown(tree, owedFor(tree.nexus.rootPath).stamp)
  return { tree: pushed, version }
}

function valueChangesOf(root: string, values: ReadonlyMap<string, boolean>): ValueChange[] {
  const byPath = liveIdIndex(root)
  const out = new Map<string, ValueChange>()
  for (const [file, bodyOnly] of values) {
    const rel = relDirname(file)
    const change = out.get(rel) ?? { rel, pageIds: [] }
    out.set(rel, change)
    const id = byPath.get(file)
    if (!id) continue
    change.pageIds.push(id)
    if (!bodyOnly) continue
    change.bodyOnly ??= []
    change.bodyOnly.push(id)
  }
  return [...out.values()]
}

async function walkWhileOwed(root: string): Promise<void> {
  if (sessionRoot() !== root) return
  const owed = owedFor(root)
  while (owed.walk) {
    owed.walk = false
    dropTileHeadingLinks()
    const assets = getHeldAssetMap(root)
    try {
      // The epoch bump comes first because `refreshTree` joins any in-flight walk, and one that started before the change would otherwise install pre-change disk as canon with nothing scheduled to correct it.
      diskMoved()
      const was = heldTreeOf(root)?.config
      const walked = await refreshTree(root)
      if (was) oweRescope(owed, scopeOf(was), scopeOf(walked.config))
      owed.stamp.push(...stampable(owed, walked.unreadable ?? []))
      // The map is patch-only, so the fallback walk is where the listing is taken again.
      if (assets && (await refreshAssetMap(root)) !== assets) owed.assets = true
    } catch {
      // The walk failed after the write landed, so the held tree predates it; dropped, reads walk.
      dropLiveTree()
    }
  }
}

async function settle(pusher: Pusher, root: string): Promise<{ rescope: boolean } | null> {
  await walkWhileOwed(root)
  // An open in progress has no window on this Nexus yet, so what is owed waits for the settle that follows it.
  const away = (): boolean => sessionRoot() !== root || adopting()
  if (away()) return null
  const owed = owedFor(root)
  // An arm still awaiting its file writes to this record after the push, so it is emptied in place and never replaced; the walk and the stamps still owed outlive it, and the paths newly in reach outlive it while a stamp is owed or a pass is stamping.
  const drained = { ...owed }
  const { pages, values, options, tiles, assets, corpus, rescope, stamp, walk, whole } = drained
  Object.assign(owed, nothingOwed(root), { stamp, walk, whole })
  const released = !stamp.length && !stamping
  if (released) owed.whole = []
  const changed = [...values].flatMap(([rel, bodyOnly]) => (bodyOnly ? [] : rel))
  const holders = [...options, ...changed, ...(released ? whole : [])]
  if (holders.length) {
    await registerHeldOptions(root, holders)
    if (away()) {
      oweAgain(owed, drained)
      return null
    }
  }
  const held = heldTreeOf(root)
  const tree = held && shown(held, stamp)
  const delta = tree && deltaOf(pushed?.nexus.rootPath === root ? pushed : undefined, tree)
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
  const owed = owedFor(root)
  stamping++
  try {
    while (owed.stamp.length && !(gate && batching)) await stampMissing(root, owed.stamp.splice(0))
  } finally {
    stamping--
  }
}

// The watcher's turn: the batch applies, and what it listed is stamped before its settle, so a reply's settle never waits on those stamps; an event that waited on a folder's stamp applies once more after it, and is dropped if it waits again.
export async function settleBatch(
  pusher: Pusher,
  root: string,
  events: FileEvent[],
): Promise<void> {
  batching = true
  try {
    const later = await applyEvents(root, events)
    await stampListed(root, false)
    await applyEvents(root, later, true)
    await stampListed(root, false)
  } finally {
    batching = false
  }
  await settleNow(pusher, root)
}

export const payOwedWalk = (root: string): Promise<void> => inTurn(() => walkWhileOwed(root))

// One settle at a time, and one reseed at a time on a chain of its own: a reply waits for the settles ahead of its own, and for a reseed only when its own settle found the corpus or the scope moved.
export async function settleNow(pusher: Pusher, root: string): Promise<void> {
  await stampListed(root, true)
  const moved = await inTurn(() => settle(pusher, root)).catch(() => null)
  // The settle's walk may list more to stamp, which takes a settle of its own; while a batch applies, its turn takes them instead.
  if (owedFor(root).stamp.length && !batching) await settleNow(pusher, root)
  if (!moved) return
  await reseeding(() => reseed(pusher, root, moved.rescope)).catch(() => {})
}
