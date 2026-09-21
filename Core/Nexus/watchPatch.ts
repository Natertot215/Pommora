import { join, relDirname } from '../Paths/posix'
import { escapes } from '../Paths/pathSafety'
import type { CollectionNode, NexusTree, PageNode, SetNode, SpaceNode } from './tree'
import { asString, asStringArray } from './coerce'
import { patchHeldAssetMap } from '../Assets/assetMap'
import {
  assetMatcher,
  excludedMatcher,
  hiddenName,
  sameScope,
  type WatchScope,
} from '../Paths/exclusion'
import { adoptedId } from './ids'
import { pathExists, readJsonObject } from '../Files/atomicWrite'
import { isMarkdownFile } from '../Files/walk'
import { removePathIndex } from '../Index/contentIndex'
import { indexWrittenPage } from '../Index/indexSeed'
import { renameHeadingCascade } from './cascade'
import { noteExternalEdit } from '../Pages/fileHistory'
import { getLiveTree, patchLiveTree } from './liveTree'
import { resolveOrder } from './order'
import {
  HOMEPAGE_HOST_DIRNAME,
  NEXUS_CONFIG_FILES,
  SIDECAR_FILENAME,
  SPACE_SIDECAR,
  TILE_DOC_FILENAME,
  nexusConfig,
  relPosix,
} from '../Paths/paths'
import type { TileHostRef } from '../Tiles/tiles'
import {
  readCropLeaves,
  readHomepageLeaves,
  readOrder,
  readPageRecord,
  resolveAssignedSchema,
  resolveEntityContexts,
} from './readNexus'
import { readSettings, type SettingsLeaves, scopeOf } from '../Settings/codec'
import { coerceOpenIn } from './schemas'
import { containerFieldsFrom } from './containerFields'
import { spaceFieldsFrom } from '../Contexts/spaceSidecar'
import {
  findContainerWhere,
  makeCollectionNode,
  makeSetNode,
  makeSpaceNode,
  removeNodeInTree,
  type TreeEntity,
  updateNodeInTree,
} from './treePatch'
import { CONTEXTS_DIRNAME, CROPS_REL, NEXUS_DIR } from '../Paths/nexusPaths'

export type WatchEventName = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'

export interface WatchEvent {
  event: WatchEventName
  absPath: string
}

export type WatchClass =
  | { kind: 'page-upsert'; rel: string }
  | { kind: 'page-remove'; rel: string }
  | { kind: 'container-meta'; dirRel: string }
  | { kind: 'space-meta'; dirRel: string }
  | { kind: 'settings-leaf' }
  | { kind: 'homepage-leaf' }
  | { kind: 'crops-leaf' }
  | { kind: 'order-leaf' }
  | { kind: 'tiles-leaf'; host: TileHostRef }
  | { kind: 'asset'; rel: string; event: WatchEventName }
  | { kind: 'index-only'; rel: string }
  | { kind: 'ignored' }
  | { kind: 'full-refresh' }

const toPosixRel = (root: string, absPath: string): string | null => {
  const rel = relPosix(root, absPath)
  return !rel || escapes(rel) ? null : rel
}

const containerAt = (tree: NexusTree, dirRel: string): CollectionNode | SetNode | null =>
  findContainerWhere(tree, (n) => n.path === dirRel)

function findPage(tree: NexusTree, rel: string): PageNode | null {
  const container = containerAt(tree, relDirname(rel))
  return container?.pages.find((p) => p.path === rel) ?? null
}

function findSpace(tree: NexusTree, dirRel: string): SpaceNode | null {
  for (const g of tree.contexts) {
    const hit = g.spaces.find((s) => s.path === dirRel)
    if (hit) return hit
  }
  return null
}

export function tileHostAt(tree: NexusTree, rel: string): TileHostRef | null {
  const segs = rel.split('/')
  if (segs[0] !== NEXUS_DIR) return null
  if (segs.length === 3 && segs[1] === HOMEPAGE_HOST_DIRNAME) return { kind: 'homepage' }
  const space =
    segs[1] === CONTEXTS_DIRNAME && segs.length === 5 ? findSpace(tree, relDirname(rel)) : null
  return space ? { kind: 'space', id: space.id } : null
}

const isContentName = (name: string): boolean => !name.startsWith('_') && isMarkdownFile(name)

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
    if (name === TILE_DOC_FILENAME) {
      const host = tileHostAt(tree, rel)
      return host ? { kind: 'tiles-leaf', host } : { kind: 'ignored' }
    }
    if (rel === `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.settings}`) return { kind: 'settings-leaf' }
    if (rel === `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.homepage}`) return { kind: 'homepage-leaf' }
    if (rel === `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.state}`) return { kind: 'order-leaf' }
    if (
      segs[1] === CONTEXTS_DIRNAME &&
      segs.length === 5 &&
      name === SPACE_SIDECAR &&
      (ev.event === 'add' || ev.event === 'change') &&
      findSpace(tree, dirRel)
    ) {
      return { kind: 'space-meta', dirRel }
    }
    return bearsStructure(segs, rel) ? { kind: 'full-refresh' } : { kind: 'ignored' }
  }
  if (ev.event === 'addDir')
    return hiddenName(name) ? { kind: 'ignored' } : { kind: 'full-refresh' }
  if (ev.event === 'unlinkDir') return { kind: 'full-refresh' }
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
  const isExcluded = excludedMatcher(scope.excluded)
  const isAsset = assetMatcher(scope.assetDir)
  return events.some((ev) => {
    const rel = toPosixRel(root, ev.absPath)
    if (rel === null) return true
    const segs = rel.split('/')
    if (segs[0] === NEXUS_DIR || isAsset(segs) || isExcluded(segs)) return false
    return ev.event === 'addDir' || ev.event === 'unlinkDir' || isMarkdownFile(rel)
  })
}

export async function applyWatchEvents(
  root: string,
  events: WatchEvent[],
  scope: WatchScope,
): Promise<'patched' | 'refresh'> {
  const tree = getLiveTree()
  if (!tree) return 'refresh'
  const classes = events.map((ev) => classifyEvent(tree, root, ev, scope))
  if (classes.some((c) => c.kind === 'full-refresh')) return 'refresh'
  for (const c of classes) {
    if ((await applyOne(root, c, scope)) === 'refresh') return 'refresh'
  }
  return 'patched'
}

/** Null from the transform means the patch could not land — degrade to the walk, never drift. The root pin closes a confirm that outlived its session: a switch mid-apply installs the NEW nexus's tree, and an old-root write must never patch into it. */
export const applyPatch = (
  root: string,
  fn: (t: NexusTree) => NexusTree | null,
): 'ok' | 'refresh' => {
  if (getLiveTree()?.nexus.rootPath !== root) return 'refresh'
  return patchLiveTree(fn) === null ? 'refresh' : 'ok'
}

const replaceNode = (root: string, rel: string, next: TreeEntity): 'ok' | 'refresh' =>
  applyPatch(root, (t) => updateNodeInTree(t, rel, () => next) ?? t)

const removePage = (root: string, rel: string): 'ok' | 'refresh' =>
  applyPatch(root, (t) => (findPage(t, rel) ? removeNodeInTree(t, rel) : t))

// A rename a landed file shows (an Obsidian or sync edit) takes the same cascade the editor's settle takes; the editor's own save reports none, its settle having spoken.
const cascadeSeen = async (
  root: string,
  seen: Awaited<ReturnType<typeof indexWrittenPage>>,
): Promise<void> => {
  if (seen) await renameHeadingCascade(root, seen.title, seen.old, seen.next, null)
}

async function applyOne(
  root: string,
  c: WatchClass,
  watched: WatchScope,
): Promise<'ok' | 'refresh'> {
  switch (c.kind) {
    case 'ignored':
      return 'ok'
    case 'asset':
      patchHeldAssetMap(root, c.rel, c.event)
      return 'ok'
    case 'index-only':
      await cascadeSeen(root, await indexWrittenPage(root, join(root, c.rel)))
      return 'ok'
    case 'page-remove':
      removePathIndex(c.rel)
      return removePage(root, c.rel)
    case 'page-upsert': {
      await cascadeSeen(root, await indexWrittenPage(root, join(root, c.rel)))
      const outcome = await patchPageFromDisk(root, c.rel)
      noteExternalEdit(root, join(root, c.rel))
      return outcome
    }
    case 'container-meta':
      return patchContainerFromDisk(root, c.dirRel)
    case 'space-meta':
      return patchSpaceFromDisk(root, c.dirRel)
    case 'settings-leaf':
      return applySettingsLeaf(root, watched)
    case 'tiles-leaf':
      return 'ok'
    case 'homepage-leaf':
      return patchHomepageFromDisk(root)
    case 'crops-leaf':
      return patchCropsFromDisk(root)
    case 'order-leaf':
      return patchOrderFromDisk(root)
    case 'full-refresh':
      return 'refresh'
  }
}

export async function patchPageFromDisk(root: string, rel: string): Promise<'ok' | 'refresh'> {
  const abs = join(root, rel)
  let record: Awaited<ReturnType<typeof readPageRecord>>
  try {
    record = await readPageRecord(abs, rel)
  } catch {
    return (await pathExists(abs)) ? 'refresh' : removePage(root, rel)
  }
  const tree = getLiveTree()
  if (!tree) return 'refresh'
  if (record === null) return 'refresh'
  const node = record.node
  const links = resolveEntityContexts(record.fm, tree.contexts)
  if (links) node.contextValues = links
  else delete node.contextValues
  const existing = findPage(tree, rel)
  if (existing && existing.id === node.id) return replaceNode(root, rel, node)
  const dirRel = relDirname(rel)
  const container = containerAt(tree, dirRel)
  if (!container) return 'refresh'
  const meta = (await readJsonObject(join(root, dirRel, SIDECAR_FILENAME[container.kind]))) ?? {}
  return applyPatch(
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
  const id = asString(meta.id) ?? adoptedId(dirRel)
  if (id !== node.id) return 'refresh'
  const shared = {
    id,
    title: node.title,
    path: dirRel,
    ...containerFieldsFrom(meta, node.sets ?? [], node.pages),
  }
  const next =
    node.kind === 'collection'
      ? makeCollectionNode({
          ...shared,
          properties: resolveAssignedSchema(
            meta.properties,
            Object.fromEntries(tree.registry.map((d) => [d.id, d])),
          ),
          openIn: coerceOpenIn(meta.open_in),
        })
      : makeSetNode(shared)
  return replaceNode(root, dirRel, next)
}

export async function patchSpaceFromDisk(root: string, dirRel: string): Promise<'ok' | 'refresh'> {
  const sc = await readJsonObject(join(root, dirRel, SPACE_SIDECAR))
  if (sc === null) return 'refresh'
  const tree = getLiveTree()
  if (!tree) return 'refresh'
  const node = findSpace(tree, dirRel)
  if (!node) return 'refresh'
  const id = asString(sc.id) ?? adoptedId(dirRel)
  if (id !== node.id) return 'refresh'
  const next = makeSpaceNode({
    id,
    title: node.title,
    path: dirRel,
    contextId: node.contextId,
    ...spaceFieldsFrom(sc),
  })
  const links = resolveEntityContexts(sc, tree.contexts)
  if (links) next.contextValues = links
  return replaceNode(root, dirRel, next)
}

async function applySettingsLeaf(root: string, watched: WatchScope): Promise<'ok' | 'refresh'> {
  const leaves = await readSettings(root)
  return sameScope(scopeOf(leaves), watched) ? applySettingsLeaves(root, leaves) : 'refresh'
}

export async function patchSettingsFromDisk(root: string): Promise<'ok' | 'refresh'> {
  return applySettingsLeaves(root, await readSettings(root))
}

function applySettingsLeaves(root: string, leaves: SettingsLeaves): 'ok' | 'refresh' {
  return applyPatch(root, (t) => ({
    ...t,
    accent: leaves.accent,
    personalization: leaves.personalization,
    commands: leaves.commands,
    excluded: leaves.excluded,
    assetDirectory: leaves.assetDirectory,
    nexus: {
      ...t.nexus,
      profileImage: leaves.profileImage,
      profileIcon: leaves.profileIcon,
      profileSubtitle: leaves.profileSubtitle,
    },
  }))
}

export async function patchOrderFromDisk(root: string): Promise<'ok' | 'refresh'> {
  const order = readOrder((await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.state))) ?? {})
  return applyPatch(root, (t) => {
    const collections = resolveOrder(t.collections, order.collections)
    const contexts = t.contexts.map((g) => {
      const spaces = resolveOrder(g.spaces, asStringArray(order.spaces[g.def.id]))
      return spaces.some((s, i) => s !== g.spaces[i]) ? { ...g, spaces } : g
    })
    const contextOrder = order.contexts
    const reordered = JSON.stringify(contextOrder) !== JSON.stringify(t.contextOrder)
    const moved = collections.some((c, i) => c !== t.collections[i])
    return moved || reordered || contexts.some((g, i) => g !== t.contexts[i])
      ? { ...t, collections, contexts, contextOrder }
      : t
  })
}

export async function patchHomepageFromDisk(root: string): Promise<'ok' | 'refresh'> {
  const config = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.homepage))) ?? {}
  return applyPatch(root, (t) => ({ ...t, homepage: readHomepageLeaves(config) }))
}

export async function patchCropsFromDisk(root: string): Promise<'ok' | 'refresh'> {
  const config = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.crops))) ?? {}
  return applyPatch(root, (t) => ({ ...t, crops: readCropLeaves(config) }))
}
