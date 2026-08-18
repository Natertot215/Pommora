// The write channels' confirmation: after a successful write, main applies the matching
// change to the live tree — a pure transform where the request carries the whole fact, a
// one-file disk re-read where the writer normalizes (exact by construction, through the
// walk's own readers) — and the caller pushes when the tree object moved. A write with no
// patch degrades to one verification walk, never to a silently stale tree.

import type { BannerOwnerKind, MutableKind, MutateRequest } from '@shared/mutate'
import type { NexusTree } from '@shared/types'
import {
  insertCreatedInTree,
  parentOf,
  patchContextGroupsInTree,
  relocateNodeInTree,
  removeNodeInTree,
  renameNodeInTree,
  reorderChildrenInTree,
  reorderPagesInTree,
  reorderTopInTree,
} from '@shared/treePatch'
import { isAdoptedId } from './ids'
import { orderedDefs, readRegistry } from './io/propertiesRegistry'
import { dropLiveTree, getLiveTree, refreshTree } from './liveTree'
import {
  applyPatch,
  patchContainerFromDisk,
  patchHomepageFromDisk,
  patchPageFromDisk,
  patchSettingsFromDisk,
  patchSpaceFromDisk,
  patchSpaceOrderFromDisk,
  patchTopOrderFromDisk,
} from './watchPatch'
import { CONTEXTS_DIR_REL } from './paths'

export interface MutateOutcome {
  created?: { id: string; path: string }
  renamed?: { path: string; name: string }
}

/** The pure-transform arms — the request (plus what actually landed) carries the whole fact.
 *  `'no-change'` relocates the renderer's old `invisible` knowledge: a value write and a
 *  trash-internal write cannot move the tree, so the hottest ops cost zero IPC. Null = no
 *  transform owns the op; the caller confirms another way or walks. */
export function patchForMutation(
  tree: NexusTree,
  req: MutateRequest,
  reply: MutateOutcome,
): NexusTree | 'no-change' | null {
  switch (req.op) {
    case 'setProperty':
    case 'emptyBundle':
      return 'no-change'
    case 'createPage':
    case 'createContainer':
    case 'createContextGroup':
    case 'createSpace':
      return reply.created ? insertCreatedInTree(tree, req, reply.created) : null
    case 'movePage': {
      const moved = relocateNodeInTree(tree, req.path, req.newParentPath)
      // A null relocate means "already in that parent" only when it IS that parent — an
      // unresolved node must walk, never commit an order-only patch that lies about the move.
      if (!moved && parentOf(req.path) !== req.newParentPath) return null
      return req.order
        ? (reorderPagesInTree(moved ?? tree, req.newParentPath, req.order) ?? moved)
        : moved
    }
    case 'moveSet': {
      const moved = relocateNodeInTree(tree, req.path, req.newParentPath)
      if (!moved && parentOf(req.path) !== req.newParentPath) return null
      return reorderChildrenInTree(moved ?? tree, req.newParentPath, req.order) ?? moved
    }
    case 'rename':
      // The landed name, never the ask — a from-create rename may have disambiguated.
      return renameNodeInTree(tree, req.path, reply.renamed?.name ?? req.newName)
    case 'delete':
      return removeNodeInTree(tree, req.path)
    case 'reorderChildren':
      return reorderChildrenInTree(tree, req.parentPath, req.order)
    case 'reorderTop':
      return reorderTopInTree(tree, req.key, req.order)
    case 'renameContext':
    case 'renameSpace':
    case 'setSpaceColor':
    case 'reorderContexts':
    case 'reorderSpaces':
      return patchContextGroupsInTree(tree, req)
    default:
      return null
  }
}

const isSpacePath = (path: string): boolean => path.startsWith(`${CONTEXTS_DIR_REL}/`)

/** Which disk-confirmer owns an entity kind — one statement, shared by every field write that
 *  names its target by kind. Null = the kind is not one of the walk's per-entity files. */
function patchEntityFromDisk(
  root: string,
  kind: MutableKind | BannerOwnerKind,
  path: string,
): Promise<'ok' | 'refresh'> | null {
  switch (kind) {
    case 'page':
      return patchPageFromDisk(root, path)
    case 'collection':
    case 'set':
      return patchContainerFromDisk(root, path)
    case 'space':
      return patchSpaceFromDisk(root, path)
    default:
      return null
  }
}

/** Route one confirmed mutation to its patch. `'ok'` means the live tree already reflects the
 *  write; `'refresh'` means the caller owes one verification walk. */
async function routeMutation(
  root: string,
  req: MutateRequest,
  reply: MutateOutcome,
): Promise<'ok' | 'refresh'> {
  // Deleting a Space (or a Context group) unlinks its value from every member's frontmatter —
  // a cascade across nodes the remove transform never touches; only the walk re-derives their
  // contextValues.
  if (req.op === 'delete' && (req.kind === 'space' || req.kind === 'context')) return 'refresh'
  switch (req.op) {
    // Field writes land through the writer's own normalization — confirm by re-reading the
    // one file that changed, with the walk's readers.
    case 'setIcon':
      // A Context's icon lives in its registry — a structural walk input.
      return patchEntityFromDisk(root, req.kind, req.path) ?? 'refresh'
    case 'setBanner':
    case 'setHeadingIconHidden':
      if (req.kind === 'homepage') return patchHomepageFromDisk(root)
      if (req.kind === 'navview') return 'ok' // navigation.json is a file the walk never reads
      return patchEntityFromDisk(root, req.kind, req.path) ?? 'refresh'
    case 'setContext':
      return isSpacePath(req.path)
        ? patchSpaceFromDisk(root, req.path)
        : patchPageFromDisk(root, req.path)
    case 'setProfileImage':
    case 'setProfileIcon':
    case 'setProfileSubtitle':
      return patchSettingsFromDisk(root)
    case 'restore':
      return 'refresh' // placement resolution is the restore path's own business
    default: {
      const tree = getLiveTree()
      if (!tree) return 'refresh'
      const patched = patchForMutation(tree, req, reply)
      if (patched === 'no-change') return 'ok'
      if (patched === null) return 'refresh'
      if (applyPatch(root, () => patched) === 'refresh') return 'refresh'
      // A create's position derives from an order file the transform didn't read — one more
      // targeted read pins it to exactly what the walk would derive.
      switch (req.op) {
        case 'createPage':
          return req.order ? 'ok' : patchContainerFromDisk(root, req.parentPath)
        case 'createContainer': {
          // The creation seeded the NEW sidecar (a default view) — read it in, then pin the
          // parent's order.
          const own = reply.created ? await patchContainerFromDisk(root, reply.created.path) : 'ok'
          if (own === 'refresh') return 'refresh'
          return req.parentPath === ''
            ? patchTopOrderFromDisk(root)
            : patchContainerFromDisk(root, req.parentPath)
        }
        case 'createSpace':
          return patchSpaceOrderFromDisk(root, req.contextId)
        default:
          return 'ok'
      }
    }
  }
}

/** Confirm a successful mutation against the live tree; a failed patch degrades to one walk.
 *  Returns the tree to push, or null when nothing anyone renders moved. */
export const confirmMutation = (
  root: string,
  req: MutateRequest,
  reply: MutateOutcome,
): Promise<NexusTree | null> => confirmBy(root, () => routeMutation(root, req, reply))

/** The registry family's confirmation: re-read `properties.json`, then re-resolve every
 *  collection's embedded defs from its own sidecar — never from request values, which the
 *  writers normalize and stamp before writing. One re-read patches the one fact in both its
 *  homes (`tree.registry` and each `CollectionNode.properties`), keeping them
 *  reference-identical the way the walk does. */
export const confirmRegistry = (root: string): Promise<NexusTree | null> =>
  confirmBy(root, () => routeRegistry(root))

async function routeRegistry(root: string): Promise<'ok' | 'refresh'> {
  const registry = await readRegistry(root)
  if (applyPatch(root, (t) => ({ ...t, registry: orderedDefs(registry) })) === 'refresh')
    return 'refresh'
  const tree = getLiveTree()
  // A raw nexus's walk never opens container sidecars, so there are no embedded defs to
  // re-point — the same gate the watcher's classifier applies.
  if (!tree || isAdoptedId(tree.nexus.id)) return 'ok'
  for (const c of tree.collections) {
    if ((await patchContainerFromDisk(root, c.path)) === 'refresh') return 'refresh'
  }
  return 'ok'
}

/** One shared shape for the remaining write channels: run the targeted confirmer, degrade to
 *  a walk on refusal, and hand back the tree to push when it moved. */
export async function confirmBy(
  root: string,
  work: () => Promise<'ok' | 'refresh'>,
): Promise<NexusTree | null> {
  const before = getLiveTree()
  if ((await work()) === 'refresh') {
    try {
      await refreshTree(root)
    } catch {
      // The write landed but the verification walk failed — the held tree predates the write
      // and must not keep serving as canon. Dropped, every later read walks (and surfaces the
      // failure honestly if the walk keeps failing).
      dropLiveTree()
    }
  }
  const now = getLiveTree()
  return now && now !== before ? now : null
}
