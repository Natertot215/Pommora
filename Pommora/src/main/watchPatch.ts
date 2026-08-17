// The watcher's path, spent: classify each event, then apply the matching targeted patch
// against the live tree. The classifier never admits what the walk wouldn't — page reads ride
// `readPageRecord` and sidecar reads the same coercions the walk uses — and everything it
// can't place lands on the total default, the full refresh. Genuine leaf fields patch;
// structural walk INPUTS (the registries, state orderings, folder-kind sidecars appearing or
// vanishing, directories) don't, because they shape the tree rather than sit in it.

import { join, relative, sep } from 'node:path'
import type { CollectionNode, NexusTree, PageNode, SetNode, SpaceNode } from '@shared/types'
import { asString, asStringArray } from './coerce'
import { excludedMatcher } from './exclusion'
import { adoptedId, isAdoptedId } from './ids'
import { pathExists, readJsonObject } from './io/atomicWrite'
import { isMarkdownFile } from './io/walk'
import { getLiveTree, patchLiveTree } from './liveTree'
import { resolveOrder } from './order'
import { NEXUS_CONFIG_FILES, SIDECAR_FILENAME, SPACE_SIDECAR, nexusConfig } from './paths'
import {
  parseViews,
  readHomepageLeaves,
  readPageRecord,
  readSettingsLeaves,
  resolveAssignedSchema,
  resolveEntityContexts,
} from './readNexus'
import { coerceOpenIn, coerceViewButton, coerceViewStyle } from '@shared/schemas'
import { makeCollectionNode, makeSetNode, makeSpaceNode } from '@shared/treePatch'
import { removeNodeInTree, type TreeEntity, updateNodeInTree } from '@shared/treePatch'

export type WatchEventName = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'

export interface WatchEvent {
  event: WatchEventName
  absPath: string
}

export type WatchClass =
  | { kind: 'page-upsert'; rel: string; abs: string }
  | { kind: 'page-remove'; rel: string }
  | { kind: 'container-meta'; dirRel: string; abs: string }
  | { kind: 'space-meta'; dirRel: string; abs: string }
  | { kind: 'settings-leaf' }
  | { kind: 'homepage-leaf' }
  | { kind: 'index-only'; rel: string }
  | { kind: 'ignored' }
  | { kind: 'full-refresh' }

const parentOf = (rel: string): string => {
  const i = rel.lastIndexOf('/')
  return i === -1 ? '' : rel.slice(0, i)
}

const toPosixRel = (root: string, absPath: string): string | null => {
  const rel = relative(root, absPath)
  if (!rel || rel.startsWith('..')) return null
  return rel.split(sep).join('/')
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

export function classifyEvent(
  tree: NexusTree,
  root: string,
  ev: WatchEvent,
  excluded: string[],
): WatchClass {
  const rel = toPosixRel(root, ev.absPath)
  if (rel === null) return { kind: 'full-refresh' }
  const segs = rel.split('/')
  const name = segs[segs.length - 1]
  // Nothing under an excluded folder is read, patched, or indexed — the same one predicate
  // the walk, the corpus, and every cascade honor.
  if (excludedMatcher(excluded)(segs)) return { kind: 'ignored' }
  // A path on the unreadable list carries walk-owned bookkeeping (the entry must drop or
  // transition) — only the walk may adjudicate it. Container and Space sidecars record their
  // OWNER directory there, so the parent is checked too.
  const dirOfRel = parentOf(rel)
  if (tree.unreadable?.some((u) => u.path === rel || u.path === dirOfRel))
    return { kind: 'full-refresh' }
  if (segs[0] === '.nexus') {
    if (rel === `.nexus/${NEXUS_CONFIG_FILES.settings}`) return { kind: 'settings-leaf' }
    if (rel === `.nexus/${NEXUS_CONFIG_FILES.homepage}`) return { kind: 'homepage-leaf' }
    if (
      segs[1] === 'contexts' &&
      segs.length === 5 &&
      name === SPACE_SIDECAR &&
      (ev.event === 'add' || ev.event === 'change')
    ) {
      const dirRel = segs.slice(0, 4).join('/')
      if (findSpace(tree, dirRel)) return { kind: 'space-meta', dirRel, abs: ev.absPath }
    }
    return { kind: 'full-refresh' }
  }
  if (ev.event === 'addDir' || ev.event === 'unlinkDir') return { kind: 'full-refresh' }
  if (isContentName(name)) {
    const dirRel = parentOf(rel)
    if (dirRel !== '' && findContainer(tree, dirRel)) {
      return ev.event === 'unlink'
        ? { kind: 'page-remove', rel }
        : { kind: 'page-upsert', rel, abs: ev.absPath }
    }
    // In the cascade corpus but outside the live tree — an un-adopted folder's note.
    return { kind: 'index-only', rel }
  }
  if (
    (name === SIDECAR_FILENAME.collection || name === SIDECAR_FILENAME.set) &&
    (ev.event === 'add' || ev.event === 'change') &&
    // A raw nexus classifies by position alone — the walk never opens container sidecars
    // there, so an edit to one must not patch what the walk would ignore.
    !isAdoptedId(tree.nexus.id)
  ) {
    const dirRel = parentOf(rel)
    const container = dirRel !== '' ? findContainer(tree, dirRel) : null
    // Only the kind-matching sidecar feeds the walk; a stray wrong-kind file is not this
    // container's meta and takes the default arm.
    if (container && name === SIDECAR_FILENAME[container.kind]) {
      return { kind: 'container-meta', dirRel, abs: ev.absPath }
    }
  }
  return { kind: 'full-refresh' }
}

/** Batch-apply a settle window's events. `refresh` means the caller walks; `patched` means the
 *  live tree already reflects every event (push if its identity moved). */
export async function applyWatchEvents(
  root: string,
  events: WatchEvent[],
  excluded: string[],
): Promise<'patched' | 'refresh'> {
  const tree = getLiveTree()
  if (!tree) return 'refresh'
  const classes = events.map((ev) => classifyEvent(tree, root, ev, excluded))
  if (classes.some((c) => c.kind === 'full-refresh')) return 'refresh'
  for (const c of classes) {
    if ((await applyOne(root, c, excluded)) === 'refresh') return 'refresh'
  }
  return 'patched'
}

/** Null from the transform means the patch could not land — degrade to the walk, never drift.
 *  The root pin closes a settle that outlived its session: a switch mid-apply installs the NEW
 *  nexus's tree, and an old-root event must never patch into it. */
const applyPatch = (root: string, fn: (t: NexusTree) => NexusTree | null): 'ok' | 'refresh' => {
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
  watchedExcluded: string[],
): Promise<'ok' | 'refresh'> {
  switch (c.kind) {
    case 'ignored':
    case 'index-only':
      return 'ok'
    case 'page-remove':
      return removePage(root, c.rel)
    case 'page-upsert':
      return applyPageUpsert(root, c.rel, c.abs)
    case 'container-meta':
      return applyContainerMeta(root, c.dirRel, c.abs)
    case 'space-meta':
      return applySpaceMeta(root, c.dirRel, c.abs)
    case 'settings-leaf':
      return applySettingsLeaf(root, watchedExcluded)
    case 'homepage-leaf':
      return applyHomepageLeaf(root)
    case 'full-refresh':
      return 'refresh'
  }
}

const sidecarMode = (tree: NexusTree): boolean => !isAdoptedId(tree.nexus.id)
const orderFallback = (tree: NexusTree): 'id' | 'title' => (sidecarMode(tree) ? 'id' : 'title')

async function applyPageUpsert(root: string, rel: string, abs: string): Promise<'ok' | 'refresh'> {
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

async function applyContainerMeta(
  root: string,
  dirRel: string,
  abs: string,
): Promise<'ok' | 'refresh'> {
  const meta = await readJsonObject(abs)
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
    viewStyle: coerceViewStyle(meta.view_style),
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

async function applySpaceMeta(
  root: string,
  dirRel: string,
  abs: string,
): Promise<'ok' | 'refresh'> {
  const sc = await readJsonObject(abs)
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

async function applySettingsLeaf(
  root: string,
  watchedExcluded: string[],
): Promise<'ok' | 'refresh'> {
  const settings = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))) ?? {}
  const leaves = readSettingsLeaves(settings)
  // An exclusion change moves what the walk and watcher can even see — structural, not a leaf.
  const same =
    leaves.excluded.length === watchedExcluded.length &&
    leaves.excluded.every((v, i) => v === watchedExcluded[i])
  if (!same) return 'refresh'
  return applyPatch(root, (t) => ({
    ...t,
    labels: leaves.labels,
    accent: leaves.accent,
    timeFormat: leaves.timeFormat,
    personalization: leaves.personalization,
    commands: leaves.commands,
    nexus: {
      ...t.nexus,
      profileImage: leaves.profileImage,
      profileIcon: leaves.profileIcon,
      profileSubtitle: leaves.profileSubtitle,
    },
  }))
}

async function applyHomepageLeaf(root: string): Promise<'ok' | 'refresh'> {
  const config = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.homepage))) ?? {}
  return applyPatch(root, (t) => ({ ...t, homepage: readHomepageLeaves(config) }))
}
