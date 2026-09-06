import { join } from '../Locations/posix'
import { escapes } from '../Locations/pathSafety'
import type { CollectionNode, NexusTree, PageNode, SetNode, SpaceNode } from './tree'
import { asString, asStringArray } from '../Locations/coerce'
import { patchHeldAssetMap } from '../Assets/assetMap'
import {
  assetMatcher,
  excludedMatcher,
  hiddenName,
  sameScope,
  type WatchScope,
} from '../Locations/exclusion'
import { adoptedId } from '../Locations/ids'
import { pathExists, readJsonObject } from '../IO/atomicWrite'
import { isMarkdownFile } from '../IO/walk'
import { removePathIndex } from '../Index/contentIndex'
import { indexWrittenPage } from '../Index/indexSeed'
import { noteExternalEdit } from '../Pages/fileHistory'
import { getLiveTree, patchLiveTree } from './liveTree'
import { resolveOrder } from '../Locations/order'
import {
  HOMEPAGE_HOST_DIRNAME,
  NEXUS_CONFIG_FILES,
  SIDECAR_FILENAME,
  SPACE_SIDECAR,
  TILE_DOC_FILENAME,
  nexusConfig,
  relPosix,
} from '../Locations/paths'
import type { TileHostRef } from '../Tiles/tiles'
import {
  parseViews,
  readCropLeaves,
  readHomepageLeaves,
  readPageRecord,
  readSpaceOrders,
  resolveAssignedSchema,
  resolveEntityContexts,
} from './readNexus'
import { readSettingsLeaves, scopeOf, type SettingsLeaves } from '../Settings/codec'
import { coerceOpenIn, coerceViewButton } from './schemas'
import {
  makeCollectionNode,
  makeSetNode,
  makeSpaceNode,
  parentOf,
  removeNodeInTree,
  type TreeEntity,
  updateNodeInTree,
} from './treePatch'
import { CONTEXTS_DIRNAME, NEXUS_DIR } from '../Locations/nexusPaths'

export type WatchEventName = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'

export interface WatchEvent {
  event: WatchEventName
  absPath: string
}

type WatchClass =
  | { kind: 'page-upsert'; rel: string }
  | { kind: 'page-remove'; rel: string }
  | { kind: 'container-meta'; dirRel: string }
  | { kind: 'space-meta'; dirRel: string }
  | { kind: 'settings-leaf' }
  | { kind: 'homepage-leaf' }
  | { kind: 'crops-leaf' }
  | { kind: 'tiles-leaf'; host: TileHostRef }
  | { kind: 'asset'; rel: string; event: WatchEventName }
  | { kind: 'index-only'; rel: string }
  | { kind: 'ignored' }
  | { kind: 'full-refresh' }

const toPosixRel = (root: string, absPath: string): string | null => {
  const rel = relPosix(root, absPath)
  return !rel || escapes(rel) ? null : rel
}

function findContainer(tree: NexusTree, dirRel: string): CollectionNode | SetNode | null {
  const inSets = (sets: SetNode[] | undefined): SetNode | null => {
    for (const s of sets ?? []) {
      if (s.path === dirRel) return s
      const hit = inSets(s.sets)
      if (hit) return hit
    }
    return null
  }
  for (const c of tree.collections) {
    if (c.path === dirRel) return c
    const hit = inSets(c.sets)
    if (hit) return hit
  }
  return null
}

function findPage(tree: NexusTree, rel: string): PageNode | null {
  const container = findContainer(tree, parentOf(rel))
  return container?.pages.find((p) => p.path === rel) ?? null
}

function findSpace(tree: NexusTree, dirRel: string): SpaceNode | null {
  for (const g of tree.contexts) {
    const hit = g.spaces.find((s) => s.path === dirRel)
    if (hit) return hit
  }
  return null
}

const isContentName = (name: string): boolean => !name.startsWith('_') && isMarkdownFile(name)

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
  // First of every arm, so `excluded_folders` means the content corpus and nothing more: a
  // shared attachments folder is usually named there already, and every other arm below —
  // the exclusion match, the unreadable list, the `.nexus` branch — would otherwise claim it.
  if (assetMatcher(scope.assetDir)(segs)) return { kind: 'asset', rel, event: ev.event }
  if (excludedMatcher(scope.excluded)(segs)) return { kind: 'ignored' }
  // A path on the unreadable list carries walk-owned bookkeeping (the entry must drop or
  // transition) — only the walk may adjudicate it. Container and Space sidecars record their
  // OWNER directory there, so the parent is checked too.
  const dirRel = parentOf(rel)
  if (tree.unreadable?.some((u) => u.path === rel || u.path === dirRel))
    return { kind: 'full-refresh' }
  if (segs[0] === NEXUS_DIR) {
    if (name.startsWith(`${TILE_DOC_FILENAME}.bad`)) return { kind: 'ignored' }
    if (segs.length === 2 && segs[1] === HOMEPAGE_HOST_DIRNAME) return { kind: 'ignored' }
    if (name === TILE_DOC_FILENAME) {
      if (segs.length === 3 && segs[1] === HOMEPAGE_HOST_DIRNAME)
        return { kind: 'tiles-leaf', host: { kind: 'homepage' } }
      const space =
        segs[1] === CONTEXTS_DIRNAME && segs.length === 5 ? findSpace(tree, dirRel) : null
      return space
        ? { kind: 'tiles-leaf', host: { kind: 'space', id: space.id } }
        : { kind: 'ignored' }
    }
    if (rel === `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.settings}`) return { kind: 'settings-leaf' }
    if (rel === `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.homepage}`) return { kind: 'homepage-leaf' }
    if (rel === `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.crops}`) return { kind: 'crops-leaf' }
    if (
      segs[1] === CONTEXTS_DIRNAME &&
      segs.length === 5 &&
      name === SPACE_SIDECAR &&
      (ev.event === 'add' || ev.event === 'change') &&
      findSpace(tree, dirRel)
    ) {
      return { kind: 'space-meta', dirRel }
    }
    return { kind: 'full-refresh' }
  }
  if (ev.event === 'addDir')
    return hiddenName(name) ? { kind: 'ignored' } : { kind: 'full-refresh' }
  if (ev.event === 'unlinkDir') return { kind: 'full-refresh' }
  if (isContentName(name)) {
    if (dirRel !== '' && findContainer(tree, dirRel)) {
      return ev.event === 'unlink' ? { kind: 'page-remove', rel } : { kind: 'page-upsert', rel }
    }
    return { kind: 'index-only', rel }
  }
  if (
    (name === SIDECAR_FILENAME.collection || name === SIDECAR_FILENAME.set) &&
    (ev.event === 'add' || ev.event === 'change')
  ) {
    const container = dirRel !== '' ? findContainer(tree, dirRel) : null
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

/** Null from the transform means the patch could not land — degrade to the walk, never drift.
 *  The root pin closes a confirm that outlived its session: a switch mid-apply installs the
 *  NEW nexus's tree, and an old-root write must never patch into it. */
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
      await indexWrittenPage(root, join(root, c.rel))
      return 'ok'
    case 'page-remove':
      removePathIndex(c.rel)
      return removePage(root, c.rel)
    case 'page-upsert': {
      await indexWrittenPage(root, join(root, c.rel))
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
  const dirRel = parentOf(rel)
  const container = findContainer(tree, dirRel)
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
  const kind = held && findContainer(held, dirRel)?.kind
  if (!kind) return 'refresh'
  const meta = await readJsonObject(join(root, dirRel, SIDECAR_FILENAME[kind]))
  if (meta === null) return 'refresh'
  const tree = getLiveTree()
  if (!tree) return 'refresh'
  const node = findContainer(tree, dirRel)
  if (!node) return 'refresh'
  const id = asString(meta.id) ?? adoptedId(dirRel)
  if (id !== node.id) return 'refresh' // an identity move is the record's business
  const shared = {
    id,
    title: node.title,
    icon: asString(meta.icon),
    path: dirRel,
    banner: asString(meta.banner),
    headingIconHidden: meta.heading_icon_hidden === true,
    sets: resolveOrder(node.sets ?? [], asStringArray(meta.set_order)),
    pages: resolveOrder(node.pages, asStringArray(meta.page_order)),
    views: parseViews(meta.views),
    viewButton: coerceViewButton(meta.view_button),
    disclosureLocked: meta.disclosure_locked === true,
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
    icon: asString(sc.icon),
    path: dirRel,
    banner: asString(sc.banner),
    headingIconHidden: sc.heading_icon_hidden === true,
    color: asString(sc.color),
    contextId: node.contextId,
  })
  const links = resolveEntityContexts(sc, tree.contexts)
  if (links) next.contextValues = links
  return replaceNode(root, dirRel, next)
}

const readSettings = async (root: string): Promise<SettingsLeaves> =>
  readSettingsLeaves((await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))) ?? {})

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

export async function patchTopOrderFromDisk(root: string): Promise<'ok' | 'refresh'> {
  const state = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.state))) ?? {}
  return applyPatch(root, (t) => ({
    ...t,
    collections: resolveOrder(t.collections, asStringArray(state.collection_order)),
  }))
}

export async function patchSpaceOrderFromDisk(
  root: string,
  contextId: string,
): Promise<'ok' | 'refresh'> {
  const state = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.state))) ?? {}
  const orders = readSpaceOrders(state)
  return applyPatch(root, (t) => ({
    ...t,
    contexts: t.contexts.map((g) =>
      g.def.id === contextId
        ? {
            ...g,
            spaces: resolveOrder(g.spaces, asStringArray(orders[contextId])),
          }
        : g,
    ),
  }))
}

export async function patchHomepageFromDisk(root: string): Promise<'ok' | 'refresh'> {
  const config = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.homepage))) ?? {}
  return applyPatch(root, (t) => ({ ...t, homepage: readHomepageLeaves(config) }))
}

export async function patchCropsFromDisk(root: string): Promise<'ok' | 'refresh'> {
  const config = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.crops))) ?? {}
  return applyPatch(root, (t) => ({ ...t, crops: readCropLeaves(config) }))
}
