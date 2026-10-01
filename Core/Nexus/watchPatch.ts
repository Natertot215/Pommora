import { basename, join, relDirname, relative, isMarkdownFile } from '../Paths/posix'
import { escapes } from '../Paths/pathSafety'
import type { NexusConfig, NexusTree } from './tree'
import { stabilize } from './treeStabilize'
import { asStringArray } from './coerce'
import { patchHeldAssetMap } from '../Assets/assetMap'
import {
  assetMatcher,
  excludedMatcher,
  hiddenFolder,
  outsideContent,
  sameScope,
  type WatchScope,
} from '../Paths/exclusion'
import { shardOf } from './ids'
import { pathExists, readAppFile, readJsonObject } from '../Files/atomicWrite'
import { isContentName } from '../Files/walk'
import { queryHeadingMentions, removePathIndex } from '../Index/contentIndex'
import { normalizeTitle } from '../Connections/connections'
import { indexWrittenPage } from '../Index/indexSeed'
import { type CascadeReport, renameCascade, spacesLinkHeading } from './cascade'
import { noteExternalEdit } from '../Pages/fileHistory'
import { getLiveTree, heldTreeOf, patchLiveTree } from './liveTree'
import { resolveOrder } from './order'
import { nexusConfig } from '../Paths/paths'
import { HOMEPAGE_HOST, type TileHostRef } from '../Tiles/tiles'
import { dropTileHeadingLinks, tilesLinkHeading } from '../Tiles/tilesFile'
import {
  readCropLeaves,
  readHomepageLeaves,
  readOrder,
  readPageRecord,
  contextLinker,
} from './readNexus'
import { readSettings, scopeOf } from '../Settings/codec'
import { errText } from '../Contract/result'
import { containerNodeFrom } from './containerFields'
import { spaceNodeFrom } from '../Contexts/spaceSidecar'
import { stampPage } from './adopt'
import {
  containerAt,
  pageAt,
  removeNodeInTree,
  spaceAt,
  type TreeEntity,
  updateNodeInTree,
} from './treePatch'
import {
  CONTEXTS_DIRNAME,
  CROPS_REL,
  isMetadataShardRel,
  NEXUS_DIR,
  HOMEPAGE_HOST_DIRNAME,
  NEXUS_CONFIG_FILES,
  SIDECAR_FILENAME,
  SPACE_SIDECAR,
  TILE_DOC_FILENAME,
} from '../Paths/nexusPaths'
import { readShard, withShards } from './pageMetadata'

export type WatchEventName = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'

export interface WatchEvent {
  event: WatchEventName
  absPath: string
  /** The hash of the app's own write this event may echo. */
  written?: string
}

export type WatchClass =
  | { kind: 'page-upsert'; rel: string }
  | { kind: 'page-remove'; rel: string }
  | { kind: 'container-meta'; dirRel: string }
  | { kind: 'space-meta'; dirRel: string }
  | { kind: 'settings-leaf' }
  | { kind: 'homepage-leaf' }
  | { kind: 'crops-leaf' }
  | { kind: 'metadata-leaf'; shard: string }
  | { kind: 'order-leaf' }
  | { kind: 'tiles-leaf'; host: TileHostRef; rel: string }
  | { kind: 'asset'; rel: string; event: WatchEventName }
  | { kind: 'index-only'; rel: string }
  | { kind: 'ignored' }
  | { kind: 'full-refresh' }

const toPosixRel = (root: string, absPath: string): string | null => {
  const rel = relative(root, absPath)
  return !rel || escapes(rel) ? null : rel
}

// A tile body is no part of the tree; a change to one names its host, like the host's own document.
export function tileBodyUnder(segs: string[], rel: string): boolean {
  return (
    (segs[0] === NEXUS_DIR &&
      segs[1] === HOMEPAGE_HOST_DIRNAME &&
      segs.length >= 3 &&
      segs[2] !== TILE_DOC_FILENAME &&
      rel !== `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.homepage}`) ||
    (segs[0] === NEXUS_DIR &&
      segs[1] === CONTEXTS_DIRNAME &&
      segs.length >= 5 &&
      isMarkdownFile(segs[segs.length - 1]))
  )
}

export function tileHostAt(tree: NexusTree, rel: string): TileHostRef | null {
  const segs = rel.split('/')
  if (segs[0] !== NEXUS_DIR) return null
  if (segs.length === 3 && segs[1] === HOMEPAGE_HOST_DIRNAME) return HOMEPAGE_HOST
  const space =
    segs[1] === CONTEXTS_DIRNAME && segs.length === 5 ? spaceAt(tree, relDirname(rel)) : null
  return space ? { kind: 'space', id: space.id } : null
}

// Contexts and Spaces ARE the tree, and identity and the property registry are read onto it, so only these three can restructure it from under `.nexus`.
const NEXUS_STRUCTURE: ReadonlySet<string> = new Set([
  `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.identity}`,
  `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.properties}`,
])

// Every other `.nexus` path is configuration that its own arm patches, or that the tree never reads — an unrecognized one is inert rather than a re-walk of the whole Nexus.
const bearsStructure = (segs: string[], rel: string): boolean =>
  segs[1] === CONTEXTS_DIRNAME || NEXUS_STRUCTURE.has(rel)

export function classifyEvent(
  tree: NexusTree,
  root: string,
  ev: WatchEvent,
  scope: WatchScope,
): WatchClass {
  const rel = toPosixRel(root, ev.absPath)
  if (rel === null) return { kind: 'full-refresh' }
  const segs = rel.split('/')
  const name = segs[segs.length - 1]
  if (rel === CROPS_REL) return { kind: 'crops-leaf' }
  // First of every arm, so `excluded_folders` means the content corpus and nothing more: a shared attachments folder is usually named there already, and every other arm below would otherwise claim it.
  if (assetMatcher(scope.assetDir)(segs)) return { kind: 'asset', rel, event: ev.event }
  if (excludedMatcher(scope.excluded)(segs)) return { kind: 'ignored' }
  // A path on the unreadable list carries walk-owned bookkeeping (the entry must drop or transition) — only the walk may adjudicate it. Container and Space sidecars record their OWNER directory there, so the parent is checked too.
  const dirRel = relDirname(rel)
  if (tree.unreadable?.some((u) => u.path === rel || u.path === dirRel))
    return { kind: 'full-refresh' }
  if (segs[0] === NEXUS_DIR) {
    if (name.startsWith(`${TILE_DOC_FILENAME}.bad`)) return { kind: 'ignored' }
    if (name === TILE_DOC_FILENAME || tileBodyUnder(segs, rel)) {
      const host = tileHostAt(tree, rel)
      return host ? { kind: 'tiles-leaf', host, rel } : { kind: 'ignored' }
    }
    if (rel === `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.settings}`) return { kind: 'settings-leaf' }
    if (rel === `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.homepage}`) return { kind: 'homepage-leaf' }
    if (rel === `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.state}`) return { kind: 'order-leaf' }
    if (isMetadataShardRel(rel)) return { kind: 'metadata-leaf', shard: basename(name, '.json') }
    if (
      segs[1] === CONTEXTS_DIRNAME &&
      segs.length === 5 &&
      name === SPACE_SIDECAR &&
      (ev.event === 'add' || ev.event === 'change') &&
      spaceAt(tree, dirRel)
    ) {
      return { kind: 'space-meta', dirRel }
    }
    return bearsStructure(segs, rel) ? { kind: 'full-refresh' } : { kind: 'ignored' }
  }
  if (ev.event === 'addDir' || ev.event === 'unlinkDir')
    return hiddenFolder(name) ? { kind: 'ignored' } : { kind: 'full-refresh' }
  if (isContentName(name)) {
    if (dirRel !== '' && containerAt(tree, dirRel)) {
      return ev.event === 'unlink' ? { kind: 'page-remove', rel } : { kind: 'page-upsert', rel }
    }
    return { kind: 'index-only', rel }
  }
  if (
    (name === SIDECAR_FILENAME.collection || name === SIDECAR_FILENAME.set) &&
    (ev.event === 'add' || ev.event === 'change')
  ) {
    const container = dirRel !== '' ? containerAt(tree, dirRel) : null
    if (container && name === SIDECAR_FILENAME[container.kind]) {
      return { kind: 'container-meta', dirRel }
    }
  }
  return { kind: 'full-refresh' }
}

export function touchesCorpus(root: string, events: WatchEvent[], scope: WatchScope): boolean {
  return events.some((ev) => {
    const rel = toPosixRel(root, ev.absPath)
    if (rel === null) return true
    if (outsideContent(rel, scope)) return false
    return ev.event === 'addDir' || ev.event === 'unlinkDir' || isMarkdownFile(rel)
  })
}

// The patch reads every upserted page to land it, so the ids it saw travel out with it — the only other way to name them is a walk of the whole tree. `cascaded` names what a heading rename the batch showed rewrote: the app's own writes, which no watch event reports. A walk can place what the patch couldn't, so only a patch carries its classes out.
export type WatchPatch = {
  touched: ReadonlyMap<string, string>
  cascaded: Pick<CascadeReport, 'pages' | 'hosts'>
} & ({ outcome: 'patched'; classes: WatchClass[] } | { outcome: 'refresh' })

export async function applyWatchEvents(
  root: string,
  events: WatchEvent[],
  scope: WatchScope,
): Promise<WatchPatch> {
  const cascaded: WatchPatch['cascaded'] = { pages: [], hosts: [] }
  // An abandoned patch names an arbitrary prefix of the batch, so the walk starts from no ids rather than a subset.
  const walked = (): WatchPatch => ({ outcome: 'refresh', touched: new Map(), cascaded })
  const tree = getLiveTree()
  if (!tree) return walked()
  const classes = events.map((ev) => classifyEvent(tree, root, ev, scope))
  if (classes.some((c) => c.kind === 'tiles-leaf' || c.kind === 'full-refresh'))
    dropTileHeadingLinks()
  if (classes.some((c) => c.kind === 'full-refresh')) return walked()
  const touched = new Map<string, string>()
  try {
    for (const c of classes) {
      if ((await applyOne(root, c, scope, touched, cascaded)) === 'refresh') return walked()
    }
  } catch (e) {
    console.error('watch: patch failed, walking:', errText(e))
    return walked()
  }
  return { outcome: 'patched', classes, touched, cascaded }
}

/** Null from the transform means the patch could not land — degrade to the walk, never drift. The root pin closes a confirm that outlived its session: a switch mid-apply installs the NEW nexus's tree, and an old-root write must never patch into it. */
export const applyPatch = (
  root: string,
  fn: (t: NexusTree) => NexusTree | null,
): 'ok' | 'refresh' => {
  if (!heldTreeOf(root)) return 'refresh'
  return patchLiveTree(fn) === null ? 'refresh' : 'ok'
}

const replaceNode = (root: string, rel: string, next: TreeEntity): 'ok' | 'refresh' =>
  applyPatch(root, (t) => updateNodeInTree(t, rel, () => next) ?? t)

const removePage = (root: string, rel: string): 'ok' | 'refresh' =>
  applyPatch(root, (t) => (pageAt(t, rel) ? removeNodeInTree(t, rel) : t))

// A rename a landed file shows (an Obsidian or sync edit) takes the same cascade the editor's settle takes; the editor's own save reports none, its settle having spoken.
const cascadeSeen = async (
  root: string,
  rel: string,
  cascaded: WatchPatch['cascaded'],
): Promise<void> => {
  const seen = await indexWrittenPage(root, join(root, rel))
  if (!seen) return
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
  cascaded.pages.push(...c.pages)
  cascaded.hosts.push(...c.hosts)
}

async function applyOne(
  root: string,
  c: WatchClass,
  watched: WatchScope,
  touched: Map<string, string>,
  cascaded: WatchPatch['cascaded'],
): Promise<'ok' | 'refresh'> {
  switch (c.kind) {
    case 'ignored':
      return 'ok'
    case 'asset':
      patchHeldAssetMap(root, c.rel, c.event)
      return 'ok'
    case 'index-only':
      await cascadeSeen(root, c.rel, cascaded)
      return 'ok'
    case 'page-remove':
      removePathIndex(c.rel)
      touched.delete(c.rel)
      return removePage(root, c.rel)
    case 'page-upsert': {
      await cascadeSeen(root, c.rel, cascaded)
      const landed = await patchPageFromDisk(root, c.rel)
      noteExternalEdit(root, join(root, c.rel))
      if (landed === 'refresh') return 'refresh'
      if (landed.id !== null) touched.set(c.rel, landed.id)
      return 'ok'
    }
    case 'container-meta':
      return patchContainerFromDisk(root, c.dirRel)
    case 'space-meta':
      return patchSpaceFromDisk(root, c.dirRel)
    case 'settings-leaf':
      return applySettingsLeaf(root, watched)
    case 'tiles-leaf':
      // A host off screen isn't re-read by the window, so its document's last read would otherwise stay where it was.
      if (basename(c.rel) === TILE_DOC_FILENAME) await readAppFile(join(root, c.rel))
      return 'ok'
    case 'homepage-leaf':
      return patchHomepageFromDisk(root)
    case 'crops-leaf':
      return patchCropsFromDisk(root)
    case 'metadata-leaf':
      return patchMetadataFromDisk(root, c.shard)
    case 'order-leaf':
      return patchOrderFromDisk(root)
    case 'full-refresh':
      return 'refresh'
  }
}

// A null id means the patch landed with no page to name — the file vanished before it could be read.
type PagePatch = 'refresh' | { id: string | null }

export async function patchPageFromDisk(root: string, rel: string): Promise<PagePatch> {
  const abs = join(root, rel)
  let read: Awaited<ReturnType<typeof readPageRecord>>
  try {
    read = await readPageRecord(abs, rel)
    if ('unread' in read && read.unread === 'missing' && (await stampPage(abs, 'page')) !== null)
      read = await readPageRecord(abs, rel)
  } catch {
    if (await pathExists(abs)) return 'refresh'
    return removePage(root, rel) === 'refresh' ? 'refresh' : { id: null }
  }
  const tree = getLiveTree()
  if (!tree || 'unread' in read) return 'refresh'
  const node = contextLinker(tree.contexts)(read.node, read.fm)
  const existing = pageAt(tree, rel)
  if (existing && existing.id === node.id)
    return replaceNode(root, rel, node) === 'refresh' ? 'refresh' : { id: node.id }
  const dirRel = relDirname(rel)
  const container = containerAt(tree, dirRel)
  if (!container) return 'refresh'
  const meta = (await readJsonObject(join(root, dirRel, SIDECAR_FILENAME[container.kind]))) ?? {}
  const landed = applyPatch(
    root,
    (t) =>
      updateNodeInTree(t, dirRel, (n) =>
        n.kind === 'collection' || n.kind === 'set'
          ? {
              ...n,
              pages: resolveOrder(
                [...n.pages.filter((p) => p.path !== rel), node],
                asStringArray(meta.page_order),
              ),
            }
          : n,
      ) ?? t,
  )
  return landed === 'refresh' ? 'refresh' : { id: node.id }
}

export async function patchContainerFromDisk(
  root: string,
  dirRel: string,
): Promise<'ok' | 'refresh'> {
  // This read only picks WHICH sidecar to open; the post-await read below is the authoritative one.
  const held = getLiveTree()
  const kind = held && containerAt(held, dirRel)?.kind
  if (!kind) return 'refresh'
  const meta = await readJsonObject(join(root, dirRel, SIDECAR_FILENAME[kind]))
  if (meta === null) return 'refresh'
  const tree = getLiveTree()
  if (!tree) return 'refresh'
  const node = containerAt(tree, dirRel)
  if (!node) return 'refresh'
  const next = containerNodeFrom(
    node.kind,
    { title: node.title, path: dirRel },
    meta,
    node.sets ?? [],
    node.pages,
    Object.fromEntries(tree.config.registry.map((d) => [d.id, d])),
  )
  return next?.id === node.id ? replaceNode(root, dirRel, next) : 'refresh'
}

export async function patchSpaceFromDisk(root: string, dirRel: string): Promise<'ok' | 'refresh'> {
  const sc = await readJsonObject(join(root, dirRel, SPACE_SIDECAR))
  if (sc === null) return 'refresh'
  const tree = getLiveTree()
  if (!tree) return 'refresh'
  const node = spaceAt(tree, dirRel)
  if (!node) return 'refresh'
  const next = spaceNodeFrom(sc, { title: node.title, path: dirRel, contextId: node.contextId })
  if (!next || next.id !== node.id) return 'refresh'
  return replaceNode(root, dirRel, contextLinker(tree.contexts)(next, sc))
}

async function applySettingsLeaf(root: string, watched: WatchScope): Promise<'ok' | 'refresh'> {
  const leaves = await readSettings(root)
  return sameScope(scopeOf(leaves), watched) ? patchConfig(root, leaves) : 'refresh'
}

export async function patchSettingsFromDisk(root: string): Promise<'ok' | 'refresh'> {
  return patchConfig(root, await readSettings(root))
}

function patchConfig(root: string, patch: Partial<NexusConfig>): 'ok' | 'refresh' {
  return applyPatch(root, (t) => {
    const kept = stabilize(patch, t.config) as Partial<NexusConfig>
    const moved = (Object.keys(kept) as (keyof NexusConfig)[]).some((k) => kept[k] !== t.config[k])
    return moved ? { ...t, config: { ...t.config, ...kept } } : t
  })
}

export async function patchOrderFromDisk(root: string): Promise<'ok' | 'refresh'> {
  const order = readOrder((await readAppFile(nexusConfig(root, NEXUS_CONFIG_FILES.state))) ?? {})
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

export async function patchHomepageFromDisk(root: string): Promise<'ok' | 'refresh'> {
  const config = (await readAppFile(nexusConfig(root, NEXUS_CONFIG_FILES.homepage))) ?? {}
  return patchConfig(root, { homepage: readHomepageLeaves(config) })
}

export async function patchCropsFromDisk(root: string): Promise<'ok' | 'refresh'> {
  const config = (await readAppFile(nexusConfig(root, NEXUS_CONFIG_FILES.crops))) ?? {}
  return patchConfig(root, { crops: readCropLeaves(config) })
}

export async function patchMetadataFromDisk(
  root: string,
  shard: string,
): Promise<'ok' | 'refresh'> {
  const read = await readShard(root, shard)
  if (read.kind === 'unreadable') return 'ok'
  const held = getLiveTree()?.config.pageMetadata
  const pageMetadata = withShards(held ?? {}, { [shard]: read.kind === 'ok' ? read.pages : {} })
  return pageMetadata === held ? 'ok' : patchConfig(root, { pageMetadata })
}

export async function patchPageMetaFromDisk(root: string, rel: string): Promise<'ok' | 'refresh'> {
  const held = getLiveTree()
  const id = held && pageAt(held, rel)?.id
  const shard = id ? shardOf(id) : null
  return shard === null ? 'refresh' : patchMetadataFromDisk(root, shard)
}
