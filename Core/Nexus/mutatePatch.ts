// After a successful write the matching change lands on the live tree, by pure transform or a
// one-file re-read. A write with no patch degrades to a walk, never a silently stale tree.

import type {
  BannerOwnerKind,
  MutableKind,
  MutateOutcome,
  MutateRequest,
} from '../Pages/mutateRequest'
import type { CollectionNode, NexusTree, SetNode } from './tree'
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
} from './treePatch'
import { isAdoptedId } from '../Locations/ids'
import { orderedDefs, readRegistry } from '../Properties/propertiesRegistry'
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
import { CONTEXTS_DIR_REL } from '../Locations/nexusPaths'

/** `'no-change'`: the op cannot move the tree. Null: no transform owns it, so the caller walks. */
function patchForMutation(
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
      // A null relocate reads as "already there" only when it IS that parent; otherwise walk.
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
      // The landed name, never the ask: a from-create rename may have disambiguated.
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

/** `'ok'` means the live tree already reflects the write; `'refresh'` owes one verification walk. */
async function routeMutation(
  root: string,
  req: MutateRequest,
  reply: MutateOutcome,
): Promise<'ok' | 'refresh'> {
  // The unlink cascades into every member's frontmatter; only the walk re-derives contextValues.
  if (req.op === 'delete' && (req.kind === 'space' || req.kind === 'context')) return 'refresh'
  switch (req.op) {
    // Field writes land through the writer's own normalization, so confirm by re-reading the one
    // file that changed (a Context's icon lives in its registry, a structural walk input).
    case 'setIcon':
    case 'setDisclosureLock':
      return patchEntityFromDisk(root, req.kind, req.path) ?? 'refresh'
    // A banner replace drops the old crop through dropReplacedAsset, a crops.json write the
    // watcher never sees, so the writer re-reads that leaf itself.
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
      // An adopted id hashes the very path a rename or move changes, so an affected subtree walks
      // rather than hold an id the next walk could never produce.
      if (
        (req.op === 'rename' || req.op === 'movePage' || req.op === 'moveSet') &&
        subtreeHoldsAdoptedId(tree, req.path)
      )
        return 'refresh'
      const patched = patchForMutation(tree, req, reply)
      if (patched === 'no-change') return 'ok'
      if (patched === null) return 'refresh'
      if (applyPatch(root, () => patched) === 'refresh') return 'refresh'
      // The landed position derives from an order file the transform never read: it ranks unlisted
      // entities by order where the walk ranks by title, so one targeted read pins it.
      switch (req.op) {
        case 'createPage':
          return req.order ? 'ok' : patchContainerFromDisk(root, req.parentPath)
        case 'createContainer': {
          // The creation seeded the new sidecar with a default view; read it, then pin the order.
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

export const confirmMutation = (
  root: string,
  req: MutateRequest,
  reply: MutateOutcome,
): Promise<NexusTree | null> => confirmBy(root, () => routeMutation(root, req, reply))

/** Re-reads `properties.json` rather than trusting request values, which the writers normalize
 *  before writing. `containerPath` names the one Collection sidecar the write also touched. */
export const confirmRegistry = (root: string, containerPath?: string): Promise<NexusTree | null> =>
  confirmBy(root, () => routeRegistry(root, containerPath))

async function routeRegistry(root: string, containerPath?: string): Promise<'ok' | 'refresh'> {
  const registry = await readRegistry(root)
  if (applyPatch(root, (t) => repointRegistryInTree(t, orderedDefs(registry))) === 'refresh')
    return 'refresh'
  const tree = getLiveTree()
  if (!tree || containerPath === undefined) return 'ok'
  return patchContainerFromDisk(root, containerPath)
}

/** Run the targeted confirmer, degrade to a walk on refusal, hand back the tree when it moved. */
export async function confirmBy(
  root: string,
  work: () => Promise<'ok' | 'refresh'>,
): Promise<NexusTree | null> {
  const before = getLiveTree()
  if ((await work()) === 'refresh') {
    try {
      await refreshAfterWrite(root)
    } catch {
      // The walk failed after the write landed, so the held tree predates it; dropped, reads walk.
      dropLiveTree()
    }
  }
  const now = getLiveTree()
  return now && now !== before ? now : null
}
