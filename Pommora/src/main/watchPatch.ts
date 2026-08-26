// The watcher's path, spent: classify each event, then apply the matching targeted patch
// against the live tree. The classifier never admits what the walk wouldn't — page reads ride
// `readPageRecord` and sidecar reads the same coercions the walk uses — and everything it
// can't place lands on the total default, the full refresh. Genuine leaf fields patch;
// structural walk INPUTS (the registries, state orderings, folder-kind sidecars appearing or
// vanishing, directories) don't, because they shape the tree rather than sit in it.

import { join } from 'node:path'
import type { CollectionNode, NexusTree, PageNode, SetNode, SpaceNode } from '@shared/types'
import { asString, asStringArray } from './coerce'
import { patchHeldAssetMap } from './assetMap'
import { assetMatcher, excludedMatcher, hiddenName, sameScope, type WatchScope } from './exclusion'
import { adoptedId, isAdoptedId } from './ids'
import { pathExists, readJsonObject } from './io/atomicWrite'
import { isMarkdownFile } from './io/walk'
import { removePathIndex } from './db/contentIndex'
import { indexWrittenPage } from './indexSeed'
import { getLiveTree, patchLiveTree } from './liveTree'
import { resolveOrder } from './order'
import { NEXUS_CONFIG_FILES, SIDECAR_FILENAME, SPACE_SIDECAR, nexusConfig, relPosix } from './paths'
import {
  parseViews,
  readCropLeaves,
  readHomepageLeaves,
  readPageRecord,
  readSettingsLeaves,
  readSpaceOrders,
  resolveAssignedSchema,
  resolveEntityContexts,
  scopeOf,
  type SettingsLeaves,
} from './readNexus'
import { coerceOpenIn, coerceViewButton } from '@shared/schemas'
import {
  makeCollectionNode,
  makeSetNode,
  makeSpaceNode,
  parentOf,
  removeNodeInTree,
  type TreeEntity,
  updateNodeInTree,
} from '@shared/treePatch'
import { CONTEXTS_DIRNAME, NEXUS_DIR } from '@shared/nexusPaths'

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
  | { kind: 'asset'; rel: string; event: WatchEventName }
  | { kind: 'index-only'; rel: string }
  | { kind: 'ignored' }
  | { kind: 'full-refresh' }

/** The same nexus-relative POSIX spelling, refusing a path that is not under the root at all —
 *  a watch event can name one, and everything downstream keys on the relative path. */
const toPosixRel = (root: string, absPath: string): string | null => {
  const rel = relPosix(root, absPath)
  return !rel || rel.startsWith('..') ? null : rel
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

/** Mirrors `isContentFile` for a bare name — the walk's page admission, minus the Dirent. */
const isContentName = (name: string): boolean => !name.startsWith('_') && isMarkdownFile(name)

/** Whether the walk reads this nexus's container sidecars at all — a raw nexus derives every
 *  container fact from position, so its sidecars are files the walk never opens. */
const sidecarMode = (tree: NexusTree): boolean => !isAdoptedId(tree.nexus.id)
const orderFallback = (tree: NexusTree): 'id' | 'title' => (sidecarMode(tree) ? 'id' : 'title')

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
  // Nothing under an excluded folder is read, patched, or indexed — the same one predicate
  // the walk, the corpus, and every cascade honor.
  if (excludedMatcher(scope.excluded)(segs)) return { kind: 'ignored' }
  // A path on the unreadable list carries walk-owned bookkeeping (the entry must drop or
  // transition) — only the walk may adjudicate it. Container and Space sidecars record their
  // OWNER directory there, so the parent is checked too.
  const dirRel = parentOf(rel)
  if (tree.unreadable?.some((u) => u.path === rel || u.path === dirRel))
    return { kind: 'full-refresh' }
  if (segs[0] === NEXUS_DIR) {
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
  // A folder appearing under a name the walk hides cannot enter the tree, so nothing needs
  // deriving; its notes still reach the index through their own events. A DISAPPEARING one is
  // not the same question — the index owes a prune for whatever it held.
  if (ev.event === 'addDir')
    return hiddenName(name) ? { kind: 'ignored' } : { kind: 'full-refresh' }
  if (ev.event === 'unlinkDir') return { kind: 'full-refresh' }
  if (isContentName(name)) {
    if (dirRel !== '' && findContainer(tree, dirRel)) {
      return ev.event === 'unlink' ? { kind: 'page-remove', rel } : { kind: 'page-upsert', rel }
    }
    // In the cascade corpus but outside the live tree — an un-adopted folder's note.
    return { kind: 'index-only', rel }
  }
  if (
    (name === SIDECAR_FILENAME.collection || name === SIDECAR_FILENAME.set) &&
    (ev.event === 'add' || ev.event === 'change') &&
    // A raw nexus classifies by position alone, so an edit to a sidecar the walk never opens
    // must not patch what the walk would ignore.
    sidecarMode(tree)
  ) {
    const container = dirRel !== '' ? findContainer(tree, dirRel) : null
    // Only the kind-matching sidecar feeds the walk; a stray wrong-kind file is not this
    // container's meta and takes the default arm.
    if (container && name === SIDECAR_FILENAME[container.kind]) {
      return { kind: 'container-meta', dirRel }
    }
  }
  return { kind: 'full-refresh' }
}

/** Whether a batch could have moved the corpus the content index mirrors — a directory event or
 *  a Markdown file, outside `.nexus` and outside the user's exclusions. A walk forced by anything
 *  else (a registry edit, a path on the unreadable list) leaves the corpus exactly as the index
 *  already has it, and owes no stat sweep on top of the walk. */
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

/** Batch-apply a settle window's events. `refresh` means the caller walks; `patched` means the
 *  live tree already reflects every event (push if its identity moved). */
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

/** Swap the node at `rel` for one already built. A vanished target leaves the tree untouched:
 *  the caller resolved it against the same live tree a moment ago. */
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
      // The map is main's, patched in place; the push is settle's, after the batch.
      patchHeldAssetMap(root, c.rel, c.event)
      return 'ok'
    case 'index-only':
      // Rows update; nothing else moves — an un-adopted folder's note stays queryable.
      await indexWrittenPage(root, join(root, c.rel))
      return 'ok'
    case 'page-remove':
      removePathIndex(c.rel)
      return removePage(root, c.rel)
    case 'page-upsert':
      await indexWrittenPage(root, join(root, c.rel))
      return patchPageFromDisk(root, c.rel)
    case 'container-meta':
      return patchContainerFromDisk(root, c.dirRel)
    case 'space-meta':
      return patchSpaceFromDisk(root, c.dirRel)
    case 'settings-leaf':
      return applySettingsLeaf(root, watched)
    case 'homepage-leaf':
      return patchHomepageFromDisk(root)
    case 'crops-leaf':
      return patchCropsFromDisk(root)
    case 'full-refresh':
      return 'refresh'
  }
}

/** Re-read one page file and patch its node in — the shared confirmer for an external page
 *  event AND an in-app write that touched the page's frontmatter. Exact by construction: the
 *  node is rebuilt by the walk's own reader. */
export async function patchPageFromDisk(root: string, rel: string): Promise<'ok' | 'refresh'> {
  const abs = join(root, rel)
  let record: Awaited<ReturnType<typeof readPageRecord>>
  try {
    record = await readPageRecord(abs, rel)
  } catch {
    // Deleted between event and read → a remove; still present → mid-write transient, and
    // the walk path models that the same way.
    return (await pathExists(abs)) ? 'refresh' : removePage(root, rel)
  }
  const tree = getLiveTree()
  if (!tree) return 'refresh'
  // Unknown admission joins the walk's unreadable list — bookkeeping only the walk owns.
  if (record === null) return 'refresh'
  const node = record.node
  const links = resolveEntityContexts(record.fm, tree.contexts)
  if (links) node.contextValues = links
  else delete node.contextValues
  // In-place swap only while the id held — order derives from the id (the fallback sort and
  // `page_order` membership both key on it), so an id that moved re-derives its position.
  const existing = findPage(tree, rel)
  if (existing && existing.id === node.id) return replaceNode(root, rel, node)
  const dirRel = parentOf(rel)
  const container = findContainer(tree, dirRel)
  if (!container) return 'refresh'
  const meta = sidecarMode(tree)
    ? ((await readJsonObject(join(root, dirRel, SIDECAR_FILENAME[container.kind]))) ?? {})
    : {}
  const fb = orderFallback(tree)
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
                fb,
              ),
            }
          : n,
      ) ?? t,
  )
}

/** Re-read a container's kind-matching sidecar and rebuild its node (children kept, fields
 *  and orders re-derived) — the shared confirmer for sidecar edits, view saves, and container
 *  configuration. */
export async function patchContainerFromDisk(
  root: string,
  dirRel: string,
): Promise<'ok' | 'refresh'> {
  // This read only picks WHICH sidecar to open; the post-await read below is the authoritative one.
  const held = getLiveTree()
  // A raw nexus's walk never opens container sidecars — patching one in would show state ⌘R
  // erases. The gate lives HERE so every consumer (watcher arm, field confirms, create pins)
  // answers identically; in raw mode the tree already holds everything the walk would derive.
  if (held && !sidecarMode(held)) return 'ok'
  const kind = held && findContainer(held, dirRel)?.kind
  if (!kind) return 'refresh'
  const meta = await readJsonObject(join(root, dirRel, SIDECAR_FILENAME[kind]))
  // Absent or unparseable: the walk's unreadable-list bookkeeping owns that state.
  if (meta === null) return 'refresh'
  const tree = getLiveTree()
  if (!tree) return 'refresh'
  const node = findContainer(tree, dirRel)
  if (!node) return 'refresh'
  const id = asString(meta.id) ?? adoptedId(dirRel)
  if (id !== node.id) return 'refresh' // an identity move is the record's business
  const fb = orderFallback(tree)
  const shared = {
    id,
    title: node.title,
    icon: asString(meta.icon),
    path: dirRel,
    banner: asString(meta.banner),
    headingIconHidden: meta.heading_icon_hidden === true,
    sets: resolveOrder(node.sets ?? [], asStringArray(meta.set_order), fb),
    pages: resolveOrder(node.pages, asStringArray(meta.page_order), fb),
    views: parseViews(meta.views),
    viewButton: coerceViewButton(meta.view_button),
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

/** Re-read a Space's sidecar and rebuild its node — the shared confirmer for its edits. */
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
  // A scope change moves what the walk and watcher can even see — structural, not a leaf.
  return sameScope(scopeOf(leaves), watched) ? applySettingsLeaves(root, leaves) : 'refresh'
}

/** Re-read `settings.json` and patch every leaf it feeds — the shared confirmer for the
 *  personalization and profile writes as well as external settings edits. */
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

/** Re-read `state.json` and re-derive the top-level Collection order — the confirmer for a
 *  top-level create, whose transform appended what the order file now places. */
export async function patchTopOrderFromDisk(root: string): Promise<'ok' | 'refresh'> {
  const state = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.state))) ?? {}
  return applyPatch(root, (t) => ({
    ...t,
    collections: resolveOrder(
      t.collections,
      asStringArray(state.collection_order),
      orderFallback(t),
    ),
  }))
}

/** Re-read `state.json`'s `space_orders` for one Context and re-derive its Space order. */
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
            spaces: resolveOrder(g.spaces, asStringArray(orders[contextId]), orderFallback(t)),
          }
        : g,
    ),
  }))
}

/** Re-read `homepage.json` and patch its two leaves — shared by the watcher and the
 *  homepage banner/heading writes. */
export async function patchHomepageFromDisk(root: string): Promise<'ok' | 'refresh'> {
  const config = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.homepage))) ?? {}
  return applyPatch(root, (t) => ({ ...t, homepage: readHomepageLeaves(config) }))
}

export async function patchCropsFromDisk(root: string): Promise<'ok' | 'refresh'> {
  const config = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.crops))) ?? {}
  return applyPatch(root, (t) => ({ ...t, crops: readCropLeaves(config) }))
}
