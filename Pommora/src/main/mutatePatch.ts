// The write channels' confirmation: after a successful write, main applies the matching change
// to the live tree — a pure transform where the request carries the whole fact, or a one-file
// disk re-read through the walk's own readers — and the caller pushes when the tree object
// moved. A write with no patch degrades to one verification walk, never a silently stale tree.

import type { BannerOwnerKind, MutableKind, MutateRequest } from '@shared/mutate'
import type { CollectionNode, NexusTree, SetNode } from '@shared/types'
import {
  insertCreatedInTree,
  parentOf,
  patchContextGroupsInTree,
  relocateNodeInTree,
  removeNodeInTree,
  renameNodeInTree,
  repointRegistryInTree,
  reorderChildrenInTree,
  reorderPagesInTree,
  reorderTopInTree,
} from '@shared/treePatch'
import { isAdoptedId } from './ids'
import { orderedDefs, readRegistry } from './IO/propertiesRegistry'
import { dropLiveTree, getLiveTree, refreshAfterWrite } from './liveTree'
import {
  applyPatch,
  patchContainerFromDisk,
  patchCropsFromDisk,
  patchHomepageFromDisk,
  patchPageFromDisk,
  patchSettingsFromDisk,
  patchSpaceFromDisk,
  patchSpaceOrderFromDisk,
  patchTopOrderFromDisk,
} from './watchPatch'
import { CONTEXTS_DIR_REL } from '@shared/nexusPaths'

export interface MutateOutcome {
  created?: { id: string; path: string }
  renamed?: { path: string; name: string }
}

/** The pure-transform arms — the request (plus what actually landed) carries the whole fact.
 *  `'no-change'` means a value write or a trash-internal write cannot move the tree, so the
 *  hottest ops cost zero IPC. Null = no transform owns the op; the caller confirms another
 *  way or walks. */
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
      // unresolved node must walk rather than commit an order-only patch that lies about the move.
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

/** Whether the entity at `path`, or anything beneath it, rides a path-derived adopted id. */
function subtreeHoldsAdoptedId(tree: NexusTree, path: string): boolean {
  const under = (p: string): boolean => p === path || p.startsWith(`${path}/`)
  const scan = (containers: readonly (CollectionNode | SetNode)[]): boolean =>
    containers.some(
      (c) =>
        (under(c.path) && isAdoptedId(c.id)) ||
        c.pages.some((p) => under(p.path) && isAdoptedId(p.id)) ||
        (c.sets ? scan(c.sets) : false),
    )
  return scan(tree.collections)
}

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
    case 'setDisclosureLock':
      return (await patchEntityFromDisk(root, req.kind, req.path)) ?? 'refresh'
    // A banner replace drops the old image's crop through dropReplacedAsset — a crops.json write
    // the app's own watcher never sees — so the writer re-reads that leaf itself.
    case 'setBanner':
    case 'setHeadingIconHidden': {
      let own: 'ok' | 'refresh'
      if (req.kind === 'homepage') own = await patchHomepageFromDisk(root)
      else if (req.kind === 'navview')
        own = 'ok' // navigation.json is a file the walk never reads
      else own = (await patchEntityFromDisk(root, req.kind, req.path)) ?? 'refresh'
      if (own === 'refresh') return 'refresh'
      return req.op === 'setBanner' ? patchCropsFromDisk(root) : 'ok'
    }
    case 'setContext':
      return isSpacePath(req.path)
        ? patchSpaceFromDisk(root, req.path)
        : patchPageFromDisk(root, req.path)
    case 'setCrop':
      return patchCropsFromDisk(root)
    case 'setProfileImage': {
      const own = await patchSettingsFromDisk(root)
      if (own === 'refresh') return 'refresh'
      return patchCropsFromDisk(root)
    }
    case 'setProfileIcon':
    case 'setProfileSubtitle':
      return patchSettingsFromDisk(root)
    case 'restore':
      return 'refresh' // placement resolution is the restore path's own business
    default: {
      const tree = getLiveTree()
      if (!tree) return 'refresh'
      // An adopted id is a hash of the very path a rename or move changes, and re-deriving it
      // lives main-side — so an affected subtree degrades to the walk, which derives every id
      // fresh, instead of holding an id the next walk can never produce.
      if (
        (req.op === 'rename' || req.op === 'movePage' || req.op === 'moveSet') &&
        subtreeHoldsAdoptedId(tree, req.path)
      )
        return 'refresh'
      const patched = patchForMutation(tree, req, reply)
      if (patched === 'no-change') return 'ok'
      if (patched === null) return 'refresh'
      if (applyPatch(root, () => patched) === 'refresh') return 'refresh'
      // A create's or a reorder's landed position derives from an order file the transform
      // didn't read — one more targeted read pins it to exactly what the walk would derive
      // (the transforms rank unlisted entities by current order; the walk ranks them by title).
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
        case 'reorderChildren':
          return patchContainerFromDisk(root, req.parentPath)
        case 'reorderTop':
          return patchTopOrderFromDisk(root)
        case 'createSpace':
        case 'reorderSpaces':
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

/** The registry family's confirmation: re-read `properties.json` — never request values, which
 *  the writers normalize and stamp before writing — and patch the one fact into both of its homes
 *  (`tree.registry` and each `CollectionNode.properties`). The def edits are the whole family bar
 *  four, and they move no assignment list, so the re-point is a pure transform. `containerPath`
 *  names the one Collection whose sidecar the write also touched — assign, unassign, reorder, and
 *  the create that assigns — and only that sidecar is re-read. */
export const confirmRegistry = (root: string, containerPath?: string): Promise<NexusTree | null> =>
  confirmBy(root, () => routeRegistry(root, containerPath))

async function routeRegistry(root: string, containerPath?: string): Promise<'ok' | 'refresh'> {
  const registry = await readRegistry(root)
  if (applyPatch(root, (t) => repointRegistryInTree(t, orderedDefs(registry))) === 'refresh')
    return 'refresh'
  const tree = getLiveTree()
  // A raw nexus's walk never opens container sidecars, so there is no assignment list to
  // re-read — the same gate the watcher's classifier applies.
  if (!tree || isAdoptedId(tree.nexus.id) || containerPath === undefined) return 'ok'
  return patchContainerFromDisk(root, containerPath)
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
      await refreshAfterWrite(root)
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
