// The one place a change to the tree, pages, values, tiles, or assets reaches the window. The app's own writes land here as events while they happen; a write's gate and the watcher's batch then stamp what their events listed missing, and settle: the heading renames outside edits owed cascaded, the walk the events owed, whose own listing of what is missing its ID is stamped as `stampable` allows and settled in turn, the outside moves and arrivals the index saw re-spelled, the options the owed files hold registered, and one push of what moved.

import { join, relDirname, relative, stripMarkdownExt, titleFromPath } from '../Paths/posix'
import { escapes } from '../Paths/pathSafety'
import type { HostContext } from '../Contract/handlers'
import { errText } from '../Contract/result'
import { inTurns } from '../Platform/inTurns'
import { type FileEvent, setOwnTap } from '../Files/writeEcho'
import { getHeldAssetMap, refreshAssetMap } from '../Assets/assetMap'
import { NOTHING_SEEN, seedContentIndex } from '../Index/indexSeed'
import { readIndexedStat } from '../Index/contentIndex'
import { registerHeldOptions } from '../Properties/optionOps'
import { dropTileLinks } from '../Tiles/tilesFile'
import { stampMissing } from './adopt'
import {
  applyEvents,
  indexEvents,
  nothingOwed,
  oweAgain,
  oweCascade,
  oweNamedKeys,
  oweRescope,
  oweSeen,
  oweWalk,
  owedFor,
  stampable,
} from './fileEvents'
import { scopeOf } from '../Settings/codec'
import { diskMoved, dropLiveTree, heldTreeOf, refreshTree } from './liveTree'
import { adopting, sessionRoot } from './session'
import type { NexusTree, Unreadable, ValueChange } from './tree'
import { deltaOf } from './treeDelta'
import { liveIdIndex, livePathOf } from './heldPages'
import { pageIndexOf, pagesOf } from './record'
import { type CascadeReport, linksNotUpdated, renameCascade, respell } from './cascade'
import { respellings } from '../Connections/rewrite'
import { buildPageIndex, type ConnPage, type PageIndex } from '../Connections/pageIndex'
import { refileMoved } from '../Archive/refile'
import { contextsDir } from '../Paths/paths'
import { machine } from '../Platform/machine'

// ── The app's own events ──

async function applyOwn(evs: FileEvent[]): Promise<void> {
  const root = sessionRoot()
  if (root === null) return
  const mine = evs.filter((ev) => !escapes(relative(root, ev.absPath)))
  // Each landing marks the disk moved once, after its renames and before its record, since one that leaves the tree as it already stood (a rename's later writes) would otherwise let a walk in flight install what it read before it; the editor's body save is the exception, since it leaves the frontmatter a walk reads as it was.
  if (mine.some((ev) => ev.event === 'move' || !ev.bodyOnly)) diskMoved()
  if (heldTreeOf(root)) {
    // Under a folder awaiting its stamp, that folder's read holds the page if it carries its ID, and otherwise leaves it for its own event or a walk.
    await applyEvents(root, mine)
    return
  }
  // No tree to patch: an open stamps before it holds a tree, and the tree it seeds is read after its stamps.
  if (!adopting()) await indexEvents(root, mine)
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
    dropTileLinks()
    const assets = getHeldAssetMap(root)
    try {
      // The epoch bump comes first because `refreshTree` joins any in-flight walk, and one that started before the change would otherwise install pre-change disk as canon with nothing scheduled to correct it.
      diskMoved()
      const was = heldTreeOf(root)?.config
      const walked = await refreshTree(root)
      if (was) {
        oweRescope(owed, scopeOf(was), scopeOf(walked.config))
        oweNamedKeys(owed, was.registry, walked)
      }
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
  // An open in progress has no window on this Nexus yet, so what is owed waits for the settle that follows it.
  const away = (): boolean => sessionRoot() !== root || adopting()
  // A heading rename an outside edit shows (Obsidian or sync, landed live or found by the index seed) takes the same cascade the editor's settle takes; the editor's own save owes none, its settle having spoken. Ahead of the walk, which a cascade's own writes may owe, and one at a time, so what an open begun meanwhile finds unpaid stays owed.
  while (!away()) {
    const seen = owedFor(root).renames.shift()
    if (!seen) break
    paid(
      root,
      await renameCascade(root, { path: seen.path, heading: seen.old, to: seen.next }),
      'heading rename',
    )
  }
  await walkWhileOwed(root)
  // Not mid-batch: a reply's settle while the watcher's batch is still applying would read a half-landed folder.
  if (!batching) {
    await payOutsideMoves(root)
    await walkWhileOwed(root)
  }
  if (away()) return null
  const owed = owedFor(root)
  // An arm still awaiting its file writes to this record after the push, so it is emptied in place and never replaced; the walk, the stamps, and the outside changes still owed outlive it, and the paths newly in reach outlive it while a stamp is owed or a pass is stamping.
  const drained = { ...owed }
  const { pages, values, options, tiles, assets, corpus, rescope, stamp, walk, whole } = drained
  const { renames, vanished, landed, paired } = drained
  Object.assign(owed, nothingOwed(root), { stamp, walk, whole, renames, vanished, landed, paired })
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
  const handed = pushed?.nexus.rootPath === root ? pushed : undefined
  const delta = tree && deltaOf(handed, tree)
  if (tree) pushed = tree
  if (delta) pusher.push('nexus:changed', { version: ++version, delta })
  if (pages.size) pusher.push('pages:changed', [...pages])
  const changes = valueChangesOf(root, values)
  if (changes.length) pusher.push('values:changed', changes)
  for (const { host, ids } of tiles.values()) pusher.push('tiles:changed', { host, ids: [...ids] })
  const map = getHeldAssetMap(root)
  if (assets && map) pusher.push('assets:changed', map)
  // A Set the window saw move carries what was archived from within it; its writes raise only events the tree ignores, and one that throws costs the settle nothing it pushed or owes. A first tree has no baseline, which the open pass covers.
  if (handed && tree && delta) await refileMoved(root, handed, tree, delta)
  return corpus || rescope ? { rescope } : null
}

// The armed scope is spent state: chokidar's ignore filter would keep reading the stale capture. A rescope leaves the seed to the restarted watcher's catch-up, since a seed while the old watcher still holds an event its stop drops would take in that page and leave the catch-up nothing to find. What it saw goes unowed, since an own write whose indexing failed would read as a rename, a vanish, or an arrival.
async function reseed(pusher: Pusher, root: string, rescope: boolean): Promise<void> {
  if (sessionRoot() !== root) return
  if (rescope) await pusher.watch(root)
  else await seedContentIndex(root)
}

// What changed while no watcher listened: the walk reads the tree, each page the seed finds moved applies as the event it never raised, already indexed, and what it saw is owed.
async function missedEvents(root: string): Promise<FileEvent[]> {
  oweWalk(root)
  const reread = await seedContentIndex(root)
  oweSeen(root, reread)
  return reread.rels.map((rel) => ({
    event: 'change',
    absPath: join(root, rel),
    origin: 'watched',
  }))
}

// A stamp's own write lands as an event that may list more, so a turn stamps until nothing is listed. A gate leaves the list to a batch in its turn, which may still be reading the files it listed.
async function stampListed(root: string, gate: boolean): Promise<void> {
  if (sessionRoot() !== root) return
  const owed = owedFor(root)
  stamping++
  try {
    while (owed.stamp.length && !(gate && batching))
      oweSeen(root, { ...NOTHING_SEEN, landed: await stampMissing(root, owed.stamp.splice(0)) })
  } finally {
    stamping--
  }
}

// The watcher's turn: the batch applies, then, once a started watcher listens, what it missed, and what they listed is stamped before its settle, so a reply's settle never waits on those stamps; an event that waited on a folder's stamp applies once more after it, and is dropped if it waits again.
export async function settleBatch(
  pusher: Pusher,
  root: string,
  events: FileEvent[],
  missed = false,
): Promise<void> {
  batching = true
  try {
    const later = await applyEvents(root, events)
    if (missed) later.push(...(await applyEvents(root, await missedEvents(root), true)))
    await stampListed(root, false)
    await applyEvents(root, later, true)
    await stampListed(root, false)
  } finally {
    batching = false
  }
  await settleNow(pusher, root)
}

const payOwedWalk = (root: string): Promise<void> => inTurn(() => walkWhileOwed(root))

// A write run here changes which Contexts and Spaces exist or what they're titled, or resolves a Space by title or path to write a tag or the Space's sidecar, so it holds the Contexts folder's one lock until the walk it owed is paid and resolves against a world no rename or delete is moving: a tag or Space value written mid-rename lands under the new key, and one naming a Space by a path the rename moved answers the refusal. A page's value write runs outside it, since it takes the page's own lock, which every sweep takes too, and never blanks a value or drops a list member it can't resolve (`reconcileGovernedRoot` in `governedRoot.ts`), so it lands right whether it comes before or after a sweep reaches the page.
export const underContexts = <T>(root: string, fn: () => Promise<T>): Promise<T> =>
  machine().lock(contextsDir(root), async () => {
    try {
      return await fn()
    } finally {
      await payOwedWalk(root)
    }
  })

/** Runs an operation in the settle's own turn on a settled tree, so no settle interleaves with it; nothing inside may await another turn (`payOwedWalk`, `settleNow`), since a turn queued behind this one starts only when it ends. */
export const inSettleTurn = <T>(root: string, op: () => Promise<T>): Promise<T> =>
  inTurn(async () => {
    await walkWhileOwed(root)
    return op()
  })

/** `op` in the settle's turn under the Contexts lock, the turn nested inside the lock rather than around it, since the lock's `finally` takes a turn of its own. */
export const inContextsTurn = <T>(root: string, op: () => Promise<T>): Promise<T> =>
  underContexts(root, () => inSettleTurn(root, op))

/** The index once the walk the latest writes may have owed is paid; null when the tree isn't this root's. */
export async function settledIndex(root: string): Promise<PageIndex | null> {
  await walkWhileOwed(root)
  const tree = heldTreeOf(root)
  return tree && pageIndexOf(tree)
}

/** A move's re-spell, run inside the settle's turn: the map `respellings` builds from `before` to `after`, swept under `label`; undefined when nothing needs re-spelling. A restore's arrival re-spells through `returningCascade`. */
export async function relink(
  root: string,
  before: PageIndex,
  after: PageIndex,
  label: string,
  moved: readonly string[],
  arriving: readonly string[],
): Promise<CascadeReport | undefined> {
  const names = respellings(before, after, moved, arriving)
  if (!names.size) return undefined
  const paths = new Map(
    moved.flatMap((id) => {
      const [from, to] = [before.byId.get(id)?.path, after.byId.get(id)?.path]
      return from && to ? [[from, to] as const] : []
    }),
  )
  return respell(root, [...moved, ...arriving], names, label, (f) => paths.get(f) ?? f)
}

/** An archive's re-spell when it files the item under another path than it stood under, its restore's in reverse: each key naming it where it stood re-spells to where `back` puts its pages, wherever the live world it left names nothing there, and to a page's whole path where a live page holds the shorter name. */
export async function departingCascade(
  root: string,
  tree: NexusTree,
  back: readonly ConnPage[],
  title: string,
): Promise<CascadeReport | undefined> {
  const after = await settledIndex(root)
  if (!after) return linksNotUpdated(title)
  const ids = back.map((p) => p.id)
  const departing = buildPageIndex(back)
  const names = respellings(pageIndexOf(tree), departing, ids, [])
  for (const [key, name] of names) {
    if (after.resolve(name).status === 'phantom') continue
    const path = departing.resolve(name).page?.path
    const whole = path && stripMarkdownExt(path)
    if (whole && after.resolve(whole).status === 'phantom') names.set(key, whole)
    else names.delete(key)
  }
  return names.size ? respell(root, ids, names, title) : undefined
}

// What an outside payment leaves: a warning logged, since no one is there to read a notice, and the files it wrote owed to the push.
function paid(root: string, c: CascadeReport | undefined, what: string): void {
  if (!c) return
  if (c.warning) console.error(`${what}:`, c.warning)
  oweCascade(root, c.pages, c.hosts)
}

// An outside move: a page whose rows left one path and whose id the tree now holds at another, paired whichever order its two events came in and however many settles apart; a vanish nothing holds yet waits for its id. Every other landed id the tree holds arrived outright, so only its collisions re-spell; a paired move's own row, landing a batch after its folder, is remembered as the move's and is no arrival. The world before is the tree's pages with each paired page back where it left and each arrival absent.
async function payOutsideMoves(root: string): Promise<void> {
  const owed = owedFor(root)
  const tree = heldTreeOf(root)
  if (!tree || (!owed.vanished.size && !owed.landed.size)) return
  const left = new Map<string, ConnPage>()
  let label = ''
  for (const [id, from] of owed.vanished) {
    const to = livePathOf(root, id)
    if (to === null) continue
    owed.vanished.delete(id)
    if (!owed.landed.delete(id) && readIndexedStat(to)?.id !== id) owed.paired.add(id)
    if (to === from.path) continue
    left.set(id, from)
    label ||= titleFromPath(to)
  }
  const arriving = [...owed.landed].filter((id) => {
    if (owed.paired.delete(id)) return false
    const to = livePathOf(root, id)
    if (to === null) return false
    label ||= titleFromPath(to)
    return true
  })
  owed.landed.clear()
  if (!left.size && !arriving.length) return
  const absent = new Set(arriving)
  const before = buildPageIndex(
    pagesOf(tree).flatMap((p) => (absent.has(p.id) ? [] : [left.get(p.id) ?? p])),
  )
  const moved = [...left.keys()]
  paid(
    root,
    await relink(root, before, pageIndexOf(tree), label, moved, [...moved, ...arriving]),
    'outside move',
  )
}

// One settle at a time, and one reseed at a time on a chain of its own: a reply waits for the settles ahead of its own, and for a reseed only when its own settle found the corpus moved; a moved scope waits for the watcher's restart, whose catch-up seeds after the reply.
export async function settleNow(pusher: Pusher, root: string): Promise<void> {
  await stampListed(root, true)
  const moved = await inTurn(() => settle(pusher, root)).catch(() => null)
  // The settle's walk may list more to stamp, which takes a settle of its own; while a batch applies, its turn takes them instead.
  if (owedFor(root).stamp.length && !batching) await settleNow(pusher, root)
  if (!moved) return
  await reseeding(() => reseed(pusher, root, moved.rescope)).catch(() => {})
}
