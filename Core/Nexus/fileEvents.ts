// Every change to a Nexus file is one event through here, whoever made it: the watcher's batch for an outside edit, the app's own write as it lands. An event maintains the index, then patches the held tree from the one file that changed; one no arm can place owes a walk, and the rest of its batch still applies.

import { basename, isMarkdownFile, join, relDirname, relative } from '../Paths/posix'
import { escapes } from '../Paths/pathSafety'
import type {
  CollectionNode,
  ContextGroup,
  NexusConfig,
  NexusTree,
  SetNode,
  Unreadable,
} from './tree'
import { asString, asStringArray } from './coerce'
import { patchHeldAssetMap } from '../Assets/assetMap'
import {
  assetMatcher,
  entryWithin,
  excludedMatcher,
  hiddenFolder,
  outsideContent,
  sameScope,
  type WatchScope,
} from '../Paths/exclusion'
import {
  parseJsonObject,
  pathExists,
  readAppFile,
  readJsonObject,
  readKept,
} from '../Files/atomicWrite'
import type { Changed, FileEvent, Moved } from '../Files/writeEcho'
import type { ContainerKind } from './entities'
import type { Json } from '../Files/stableJson'
import { isContentName } from '../Files/walk'
import { queryHeadingMentions } from '../Index/contentIndex'
import { normalizeTitle } from '../Connections/connections'
import {
  deindexPath,
  type HeadingRenameSeen,
  indexWrittenPage,
  moveIndexPaths,
} from '../Index/indexSeed'
import { renameCascade, spacesLinkHeading } from './cascade'
import { noteExternalEdit } from '../Pages/fileHistory'
import { heldTreeOf, patchLiveTree } from './liveTree'
import { resolveOrder } from './order'
import { navKey } from '../Navigation/navRef'
import { HOMEPAGE_HOST, type TileHostRef } from '../Tiles/tiles'
import { dropTileHeadingLinks, tilesLinkHeading } from '../Tiles/tilesFile'
import {
  contextLinker,
  pageRecordOf,
  type PageRecord,
  readCropLeaves,
  readFolder,
  readHomepageLeaves,
  readOrder,
  readPageRecord,
} from './readNexus'
import { readSettingsLeaves, scopeOf } from '../Settings/codec'
import { errText } from '../Contract/result'
import { containerNodeFrom } from './containerFields'
import { contextsRegistry as contextsRegistrySchema, type ContextDef } from '../Contexts/contexts'
import { spaceNodeFrom } from '../Contexts/spaceSidecar'
import { orderedDefs, registryFrom, registryOf } from '../Properties/propertiesRegistry'
import { stabilize } from './treeStabilize'
import {
  containerAt,
  contextAt,
  moveNodeInTree,
  pageAt,
  placeNode,
  removeNodeInTree,
  repointRegistryInTree,
  listUnreadable,
  spaceAt,
  updateNodeInTree,
} from './treePatch'
import {
  CONTEXTS_DIRNAME,
  CONTEXTS_DIR_REL,
  CONTEXTS_REGISTRY_REL,
  CROPS_REL,
  isMetadataShardRel,
  NEXUS_DIR,
  HOMEPAGE_HOST_DIRNAME,
  NEXUS_CONFIG_FILES,
  SIDECAR_FILENAME,
  SIDECARS,
  SPACE_SIDECAR,
  TILE_DOC_FILENAME,
} from '../Paths/nexusPaths'
import { shardPages, withShards } from './pageMetadata'

// Declared here, where events owe it; the settle in `settle.ts` pays it and empties it.
interface Owed {
  root: string
  walk: boolean
  corpus: boolean
  rescope: boolean
  assets: boolean
  stamp: Unreadable[]
  // Paths newly in reach, under which a listing stamps every page missing its ID.
  whole: string[]
  pages: Set<string>
  // True while every write of the page was the editor's own body save.
  values: Map<string, boolean>
  tiles: Map<string, TileHostRef>
}

export const nothingOwed = (root: string): Owed => ({
  root,
  walk: false,
  corpus: false,
  rescope: false,
  assets: false,
  stamp: [],
  whole: [],
  pages: new Set(),
  values: new Map(),
  tiles: new Map(),
})

let owed: Owed | null = null

// One root at a time: an event under another root is a session that moved, and the old root's unpushed changes have no window left to reach.
export function owedFor(root: string): Owed {
  if (owed?.root !== root) owed = nothingOwed(root)
  return owed
}

export function oweWalk(root: string): void {
  owedFor(root).walk = true
}

// Try Again reaches what no event reports, so the path it names is newly in reach.
export function oweRetry(root: string, entry: Unreadable): void {
  const owed = owedFor(root)
  owed.stamp.push(entry)
  owed.whole.push(entry.path)
}

// A page missing its ID is stamped by its own event, since the watcher reports a file once it stops changing and a stamp's rename would cut off bytes still arriving; a listing stamps one only under a path newly in reach, whose files no event reports.
export function stampable(owed: Owed, listed: readonly Unreadable[]): Unreadable[] {
  return listed.filter(
    (u) =>
      u.reason === 'missing' &&
      (u.kind !== 'page' || owed.whole.some((dir) => entryWithin(u.path, dir) !== null)),
  )
}

export function oweCascade(
  root: string,
  pages: readonly string[],
  hosts: readonly TileHostRef[],
): void {
  const owed = owedFor(root)
  for (const rel of pages) owed.pages.add(rel)
  for (const host of hosts) owed.tiles.set(navKey(host), host)
}

// `later` is a page whose folder the tree doesn't hold yet, under a folder whose stamp is owed: a watcher's batch applies it once more after that stamp lands.
type Applied = 'ok' | 'walk' | 'later'

type EventClass =
  | { kind: 'page'; rel: string }
  | { kind: 'folder'; rel: string; sidecar?: true }
  | { kind: 'gone'; rel: string; sidecar?: true }
  | { kind: 'container-meta'; dirRel: string; of: ContainerKind }
  | { kind: 'space'; dirRel: string }
  | { kind: 'contexts-leaf' }
  | { kind: 'registry-leaf' }
  | { kind: 'settings-leaf' }
  | { kind: 'homepage-leaf' }
  | { kind: 'crops-leaf' }
  | { kind: 'metadata-leaf'; shard: string }
  | { kind: 'order-leaf' }
  | { kind: 'tiles-leaf'; host: TileHostRef; rel: string }
  | { kind: 'asset'; rel: string }
  | { kind: 'ignored' }
  | { kind: 'walk' }

const configRel = (file: keyof typeof NEXUS_CONFIG_FILES): string =>
  `${NEXUS_DIR}/${NEXUS_CONFIG_FILES[file]}`

// ── Classification ──

// A tile body is no part of the tree; a change to one names its host, like the host's own document.
function tileBodyUnder(segs: string[], rel: string): boolean {
  return (
    (segs[0] === NEXUS_DIR &&
      segs[1] === HOMEPAGE_HOST_DIRNAME &&
      segs.length >= 3 &&
      segs[2] !== TILE_DOC_FILENAME &&
      rel !== configRel('homepage')) ||
    (segs[0] === NEXUS_DIR &&
      segs[1] === CONTEXTS_DIRNAME &&
      segs.length >= 5 &&
      isMarkdownFile(segs[segs.length - 1]))
  )
}

function tileHostAt(tree: NexusTree, rel: string): TileHostRef | null {
  const segs = rel.split('/')
  if (segs[0] !== NEXUS_DIR) return null
  if (segs.length === 3 && segs[1] === HOMEPAGE_HOST_DIRNAME) return HOMEPAGE_HOST
  const space =
    segs[1] === CONTEXTS_DIRNAME && segs.length === 5 ? spaceAt(tree, relDirname(rel)) : null
  return space ? { kind: 'space', id: space.id } : null
}

// Exported for tests alone.
export function classifyEvent(tree: NexusTree, root: string, ev: Changed): EventClass {
  const rel = relative(root, ev.absPath)
  if (!rel || escapes(rel)) return { kind: 'walk' }
  const scope = scopeOf(tree.config)
  const segs = rel.split('/')
  const name = segs[segs.length - 1]
  const gone = ev.event === 'unlink' || ev.event === 'unlinkDir'
  if (rel === CROPS_REL) return { kind: 'crops-leaf' }
  // First of every arm, so `excluded_folders` means the content corpus and nothing more: a shared attachments folder is usually named there already, and every other arm below would otherwise claim it.
  if (assetMatcher(scope.assetDir)(segs)) return { kind: 'asset', rel }
  if (excludedMatcher(scope.excluded)(segs)) return { kind: 'ignored' }
  if (segs[0] === NEXUS_DIR) {
    if (name.startsWith(`${TILE_DOC_FILENAME}.bad`)) return { kind: 'ignored' }
    if (name === TILE_DOC_FILENAME || tileBodyUnder(segs, rel)) {
      const host = tileHostAt(tree, rel)
      return host ? { kind: 'tiles-leaf', host, rel } : { kind: 'ignored' }
    }
    if (rel === configRel('settings')) return { kind: 'settings-leaf' }
    if (rel === configRel('homepage')) return { kind: 'homepage-leaf' }
    if (rel === configRel('state')) return { kind: 'order-leaf' }
    if (rel === configRel('properties')) return { kind: 'registry-leaf' }
    // Identity carries the Nexus's own id and the Agenda registration, which decide what the root's folders are.
    if (rel === configRel('identity')) return { kind: 'walk' }
    if (isMetadataShardRel(rel)) return { kind: 'metadata-leaf', shard: basename(name, '.json') }
    if (segs[1] !== CONTEXTS_DIRNAME) return { kind: 'ignored' }
    if (rel === CONTEXTS_REGISTRY_REL) return { kind: 'contexts-leaf' }
    // A Space or Context that left changes how the members its sweep skipped resolve, which only the walk re-derives.
    if (gone)
      return name === SPACE_SIDECAR || spaceAt(tree, rel) || contextAt(tree, rel)
        ? { kind: 'walk' }
        : { kind: 'ignored' }
    return segs.length === 5 && name === SPACE_SIDECAR
      ? { kind: 'space', dirRel: relDirname(rel) }
      : { kind: 'ignored' }
  }
  if (segs.slice(0, -1).some(hiddenFolder)) return { kind: 'ignored' }
  const dirRel = relDirname(rel)
  if (SIDECARS.has(name)) {
    if (name !== SIDECAR_FILENAME.collection && name !== SIDECAR_FILENAME.set)
      return { kind: 'walk' }
    if (gone) return { kind: 'gone', rel: dirRel, sidecar: true }
    const container = containerAt(tree, dirRel)
    if (!container) return { kind: 'folder', rel: dirRel, sidecar: true }
    return name === SIDECAR_FILENAME[container.kind]
      ? { kind: 'container-meta', dirRel, of: container.kind }
      : { kind: 'walk' }
  }
  if (hiddenFolder(name)) return { kind: 'ignored' }
  if (gone) return { kind: 'gone', rel }
  if (ev.event === 'addDir') return { kind: 'folder', rel }
  // A page at the Nexus root sits in no container, so the tree never holds it.
  return isContentName(name) && dirRel !== '' ? { kind: 'page', rel } : { kind: 'ignored' }
}

// ── The index's half ──

export async function indexEvent(root: string, ev: FileEvent): Promise<HeadingRenameSeen | null> {
  try {
    switch (ev.event) {
      case 'move':
        await moveIndexPaths(root, ev.from, ev.absPath)
        return null
      case 'unlink':
      case 'unlinkDir':
        await deindexPath(root, ev.absPath)
        return null
      case 'addDir':
        return null
      case 'add':
      case 'change':
        return await indexWrittenPage(root, ev.absPath, ev.text)
    }
  } catch (e) {
    console.error('events: the index missed an event and reseeds:', errText(e))
    owedFor(root).corpus = true
    return null
  }
}

// A rename a landed file shows (an Obsidian or sync edit) takes the same cascade the editor's settle takes; the editor's own save reports none, its settle having spoken.
async function cascadeSeen(root: string, seen: HeadingRenameSeen): Promise<void> {
  const title = normalizeTitle(seen.title)
  const linked = queryHeadingMentions(title, seen.old)?.length
  if (
    !linked &&
    !spacesLinkHeading(root, title, seen.old) &&
    !(await tilesLinkHeading(root, title, seen.old))
  )
    return
  const c = await renameCascade(root, seen.title, { heading: seen.old, to: seen.next })
  if (c.warning) console.error('heading rename:', c.warning)
  oweCascade(root, c.pages, c.hosts)
}

// ── The tree's half ──

// The root pin closes an event that outlived its session: a switch installs the new Nexus's tree, and an old root's event must never patch into it.
const applyPatch = (root: string, fn: (t: NexusTree) => NexusTree | null): Applied => {
  if (!heldTreeOf(root)) return 'walk'
  return patchLiveTree(fn) === null ? 'walk' : 'ok'
}

function patchConfig(root: string, patch: Partial<NexusConfig>): Applied {
  return applyPatch(root, (t) => {
    const kept = stabilize(patch, t.config) as Partial<NexusConfig>
    const moved = (Object.keys(kept) as (keyof NexusConfig)[]).some((k) => kept[k] !== t.config[k])
    return moved ? { ...t, config: { ...t.config, ...kept } } : t
  })
}

const jsonOf = (
  ev: Changed,
  read: (absPath: string) => Promise<Json | null> = readJsonObject,
): Promise<Json | null> => {
  return ev.text === undefined ? read(ev.absPath) : Promise.resolve(parseJsonObject(ev.text))
}

const pagePathsIn = (node: CollectionNode | SetNode | null): string[] =>
  node ? [...node.pages.map((p) => p.path), ...(node.sets ?? []).flatMap(pagePathsIn)] : []

async function applyFolder(
  root: string,
  tree: NexusTree,
  rel: string,
  owed: Owed,
  sidecar?: true,
): Promise<Applied> {
  const parent = relDirname(rel)
  if (rel === '' || containerAt(tree, rel)) return 'ok'
  // A folder whose parent the tree doesn't hold lands with the parent's read.
  if (parent !== '' && !containerAt(tree, parent)) return applyFolder(root, tree, parent, owed)
  // A sidecar's event reads the folder; any other event under a folder whose stamp is owed waits for that read or is covered by it.
  if (!sidecar && owed.stamp.some((u) => u.path === rel)) return 'ok'
  if (!(await pathExists(join(root, rel)))) return applyPatch(root, (t) => removeNodeInTree(t, rel))
  const read = await readFolder(root, rel, tree)
  const stamps = new Set(stampable(owed, read.unreadable))
  owed.stamp.push(...stamps)
  // A page missing its ID that isn't stamped stays out of the tree, since the window posts a Try Again notice when a push lists a new entry and the page's own event may still be coming; a walk lists it, and so does the read of a folder the tree listed unreadable, since a note added while it couldn't be read has spent its event.
  const unread = tree.unreadable?.some((u) => u.path === rel && u.reason !== 'missing')
  const listed = read.unreadable.filter((u) => unread || u.reason !== 'missing' || stamps.has(u))
  for (const path of pagePathsIn(read.node)) owed.values.set(path, false)
  return applyPatch(root, (t) => {
    const cleared = removeNodeInTree(t, rel)
    const landed = read.node ? placeNode(cleared, read.node) : cleared
    return landed && listUnreadable(landed, listed)
  })
}

async function applyPage(
  root: string,
  tree: NexusTree,
  rel: string,
  ev: Changed,
  owed: Owed,
): Promise<Applied> {
  const dirRel = relDirname(rel)
  if (!containerAt(tree, dirRel)) {
    const applied = await applyFolder(root, tree, dirRel, owed)
    const now = heldTreeOf(root)
    // The folder's read leaves a page missing its ID out, so the page's own event places it or owes its stamp, once a folder above it whose stamp is owed has been stamped and read.
    if (!now || !containerAt(now, dirRel))
      return applied === 'ok' && owed.stamp.some((u) => rel.startsWith(`${u.path}/`))
        ? 'later'
        : applied
  }
  const abs = join(root, rel)
  let read: PageRecord
  try {
    read = ev.text === undefined ? await readPageRecord(abs, rel) : pageRecordOf(ev.text, rel, null)
  } catch {
    if (await pathExists(abs)) return 'walk'
    return applyPatch(root, (t) => removeNodeInTree(t, rel))
  }
  owed.values.set(rel, !!ev.bodyOnly && (owed.values.get(rel) ?? true))
  if (ev.origin === 'watched') owed.pages.add(rel)
  if (read.kind === 'unread' && read.reason === 'missing')
    owed.stamp.push({ path: rel, kind: 'page', reason: 'missing' })
  const landed = applyPatch(root, (t) => {
    if (read.kind === 'unread')
      return listUnreadable(removeNodeInTree(t, rel), [
        { path: rel, kind: 'page', reason: read.reason },
      ])
    const node = contextLinker(t.contexts)(read.node, read.fm)
    const held = pageAt(t, rel)
    if (held?.id !== node.id) return placeNode(removeNodeInTree(t, rel), node)
    const kept = stabilize(node, held)
    return kept === held ? t : updateNodeInTree(t, rel, () => kept)
  })
  if (ev.origin === 'watched') noteExternalEdit(root, abs)
  return landed
}

async function applyContainer(
  root: string,
  dirRel: string,
  of: ContainerKind,
  ev: Changed,
): Promise<Applied> {
  const meta = await jsonOf(ev)
  if (meta === null)
    return (await pathExists(ev.absPath))
      ? applyPatch(root, (t) =>
          listUnreadable(removeNodeInTree(t, dirRel), [
            { path: dirRel, kind: of, reason: 'unparsed' },
          ]),
        )
      : 'walk'
  return applyPatch(root, (t) => {
    const node = containerAt(t, dirRel)
    if (!node) return null
    const next = containerNodeFrom(
      node.kind,
      { title: node.title, path: dirRel },
      meta,
      node.sets ?? [],
      node.pages,
      registryOf(t.config.registry),
    )
    return next?.id === node.id ? updateNodeInTree(t, dirRel, () => next) : null
  })
}

async function applySpace(root: string, dirRel: string, ev: Changed, owed: Owed): Promise<Applied> {
  const sc = await jsonOf(ev)
  const tree = heldTreeOf(root)
  if (sc === null || !tree) return 'walk'
  if (!contextAt(tree, relDirname(dirRel))) return 'ok'
  if (!asString(sc.id)) {
    owed.stamp.push({ path: dirRel, kind: 'space', reason: 'missing' })
    return 'walk'
  }
  return applyPatch(root, (t) => {
    const group = contextAt(t, relDirname(dirRel))
    const built =
      group && spaceNodeFrom(sc, { title: basename(dirRel), path: dirRel, contextId: group.def.id })
    const held = spaceAt(t, dirRel)
    // A Space the tree doesn't hold lands from the app's own create alone, which relinks nothing, as the app's create never has; an outside one, or the stamp of one the tree listed unreadable, walks, so a tag it now resolves gains its link.
    if (t.unreadable?.some((u) => u.path === dirRel)) return null
    if (!built || (held ? held.id !== built.id : ev.origin === 'watched')) return null
    const node = contextLinker(t.contexts)(built, sc)
    return held
      ? updateNodeInTree(t, dirRel, () => node)
      : placeNode(removeNodeInTree(t, dirRel), node)
  })
}

// Null when an entry left or arrived, or a held group's title moved: each changes which Spaces exist, and only a walk reads the Spaces a folder already holds under an arriving entry.
function regroup(held: ContextGroup[], defs: ContextDef[]): ContextGroup[] | null {
  if (held.some((g) => !defs.some((d) => d.id === g.def.id))) return null
  const next: ContextGroup[] = []
  for (const def of defs) {
    const group = held.find((g) => g.def.id === def.id)
    if (!group || group.def.title !== def.title) return null
    next.push({ ...group, def })
  }
  return next
}

async function applyContexts(root: string, ev: Changed): Promise<Applied> {
  const raw = await jsonOf(ev)
  const parsed = raw && contextsRegistrySchema.safeParse(raw)
  if (!parsed?.success) return 'walk'
  return applyPatch(root, (t) => {
    const groups = regroup(t.contexts, parsed.data.contexts)
    if (!groups) return null
    const contexts = stabilize(groups, t.contexts)
    return contexts === t.contexts ? t : { ...t, contexts }
  })
}

async function applyRegistry(root: string, ev: Changed): Promise<Applied> {
  const registry = registryFrom((await jsonOf(ev, readKept)) ?? {})
  return applyPatch(root, (t) => {
    // A definition arriving from outside may be one a sidecar already assigns, which only a read of the sidecars finds.
    const arrived = Object.keys(registry.defs).some(
      (id) => !t.config.registry.some((d) => d.id === id),
    )
    return arrived && ev.origin === 'watched'
      ? null
      : repointRegistryInTree(t, orderedDefs(registry))
  })
}

async function applySettings(root: string, ev: Changed, owed: Owed): Promise<Applied> {
  const leaves = readSettingsLeaves((await jsonOf(ev, readKept)) ?? {})
  const tree = heldTreeOf(root)
  const was = tree && scopeOf(tree.config)
  const scope = scopeOf(leaves)
  // The scope lands at once, so what runs before the walk (the asset migration) reads the scope just written.
  const patched = patchConfig(root, leaves)
  return was && oweRescope(owed, was, scope) ? 'walk' : patched
}

// A scope change, seen by the settings event or by a walk that read the file first, re-arms the watcher and stamps what came into reach: what it no longer excludes and the asset root it left.
export function oweRescope(owed: Owed, was: WatchScope, scope: WatchScope): boolean {
  if (sameScope(scope, was)) return false
  owed.whole.push(...[...was.excluded, was.assetDir].filter((rel) => !outsideContent(rel, scope)))
  owed.rescope = true
  return true
}

async function applyShard(root: string, shard: string, ev: Changed): Promise<Applied> {
  const raw = await jsonOf(ev)
  // A month that can't be read keeps what the tree holds; the event says whether it left.
  if (raw === null && ev.event !== 'unlink') return 'ok'
  const held = heldTreeOf(root)?.config.pageMetadata
  const pageMetadata = withShards(held ?? {}, { [shard]: raw ? shardPages(raw) : {} })
  return pageMetadata === held ? 'ok' : patchConfig(root, { pageMetadata })
}

async function applyOrder(root: string, ev: Changed): Promise<Applied> {
  const order = readOrder((await jsonOf(ev, readAppFile)) ?? {})
  return applyPatch(root, (t) => {
    const collections = resolveOrder(t.collections, order.collections)
    const contexts = t.contexts.map((g) => {
      const spaces = resolveOrder(g.spaces, asStringArray(order.spaces[g.def.id]))
      return spaces.some((s, i) => s !== g.spaces[i]) ? { ...g, spaces } : g
    })
    const held = stabilize(order, t.config.order)
    const moved = collections.some((c, i) => c !== t.collections[i])
    const regrouped = contexts.some((g, i) => g !== t.contexts[i])
    if (!moved && !regrouped && held === t.config.order) return t
    return {
      ...t,
      collections: moved ? collections : t.collections,
      contexts: regrouped ? contexts : t.contexts,
      config: { ...t.config, order: held },
    }
  })
}

async function applyMove(root: string, ev: Moved, owed: Owed): Promise<Applied> {
  const from = relative(root, ev.from)
  const to = relative(root, ev.absPath)
  const tree = heldTreeOf(root)
  // A folder landing where an excluded entry already names a path at or beneath it moves the corpus with no settings write to report it, so it walks and reseeds; the entries themselves are unchanged, so the watch stands.
  if (tree && scopeOf(tree.config).excluded.some((entry) => entryWithin(entry, to) !== null)) {
    owed.corpus = true
    return 'walk'
  }
  if (applyPatch(root, (t) => moveNodeInTree(t, from, to)) === 'ok') {
    if (to.split('/', 1)[0] !== NEXUS_DIR) owed.values.set(to, false)
    return 'ok'
  }
  // A Space or Context that left or came back changes how members resolve, which only the walk re-derives.
  if ([from, to].some((rel) => rel.startsWith(`${CONTEXTS_DIR_REL}/`))) return 'walk'
  // Not a move the tree makes in place (one end is the Trash, or outside what it holds): what left and what arrived are two events.
  const left = await applyOne(root, { event: 'unlink', absPath: ev.from, origin: 'own' }, owed)
  const arrived = isMarkdownFile(to) ? 'add' : 'addDir'
  const landed = await applyOne(root, { event: arrived, absPath: ev.absPath, origin: 'own' }, owed)
  return left === 'ok' ? landed : 'walk'
}

async function applyOne(root: string, ev: FileEvent, owed: Owed): Promise<Applied> {
  if (ev.event === 'move') return applyMove(root, ev, owed)
  const tree = heldTreeOf(root)
  if (!tree) return 'walk'
  const c = classifyEvent(tree, root, ev)
  switch (c.kind) {
    case 'ignored':
      return 'ok'
    case 'walk':
      return 'walk'
    case 'asset':
      if (patchHeldAssetMap(root, c.rel, ev.event)) owed.assets = true
      return 'ok'
    case 'page':
      return applyPage(root, tree, c.rel, ev, owed)
    case 'gone': {
      const cleared = applyPatch(root, (t) => removeNodeInTree(t, c.rel))
      // A sidecar that left a folder still on disk changes what the folder is, which the walk decides.
      return c.sidecar && (await pathExists(join(root, c.rel))) ? 'walk' : cleared
    }
    case 'folder':
      return applyFolder(root, tree, c.rel, owed, c.sidecar)
    case 'container-meta':
      return applyContainer(root, c.dirRel, c.of, ev)
    case 'space':
      return applySpace(root, c.dirRel, ev, owed)
    case 'contexts-leaf':
      return applyContexts(root, ev)
    case 'registry-leaf':
      return applyRegistry(root, ev)
    case 'settings-leaf':
      return applySettings(root, ev, owed)
    case 'tiles-leaf':
      dropTileHeadingLinks()
      if (ev.origin === 'own') return 'ok'
      owed.tiles.set(navKey(c.host), c.host)
      // A host off screen isn't re-read by the window, so its document's last read would otherwise stay where it was.
      if (basename(c.rel) === TILE_DOC_FILENAME) await readAppFile(join(root, c.rel))
      return 'ok'
    case 'homepage-leaf':
      return patchConfig(root, {
        homepage: readHomepageLeaves((await jsonOf(ev, readAppFile)) ?? {}),
      })
    case 'crops-leaf':
      return patchConfig(root, { crops: readCropLeaves((await jsonOf(ev, readAppFile)) ?? {}) })
    case 'metadata-leaf':
      return applyShard(root, c.shard, ev)
    case 'order-leaf':
      return applyOrder(root, ev)
  }
}

// Answers the events that wait on a folder's stamp, one per path. A replay places events already indexed, so it neither indexes nor cascades them again.
export async function applyEvents(
  root: string,
  events: FileEvent[],
  replay = false,
): Promise<FileEvent[]> {
  const owed = owedFor(root)
  const later = new Map<string, FileEvent>()
  for (const ev of events) {
    const seen = replay ? null : await indexEvent(root, ev)
    try {
      if (seen && ev.event !== 'move' && ev.origin === 'watched') await cascadeSeen(root, seen)
      const applied = await applyOne(root, ev, owed)
      if (applied === 'later') later.set(ev.absPath, ev)
      if (applied !== 'walk') continue
    } catch (e) {
      console.error('events: an event could not be placed, walking:', errText(e))
    }
    owed.walk = true
  }
  return [...later.values()]
}
