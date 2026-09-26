// After a successful write the matching change lands on the live tree, by pure transform or a one-file re-read. A write with no patch degrades to a walk, never a silently stale tree.

import type { BannerOwnerKind, MutableKind, MutateOutcome, MutateRequest } from './mutateRequest'
import type { CollectionNode, NexusTree, SetNode } from './tree'
import {
  findContainerWhere,
  insertCreatedInTree,
  moveInTree,
  patchContextGroupsInTree,
  removeNodeInTree,
  renameNodeInTree,
  repointRegistryInTree,
  reorderChildrenInTree,
} from './treePatch'
import { isMarkdownFile, relDirname } from '../Paths/posix'
import { isAdoptedId } from './ids'
import { orderedDefs, readRegistry } from '../Properties/propertiesRegistry'
import { dropLiveTree, getLiveTree, refreshAfterWrite } from './liveTree'
import {
  applyPatch,
  patchContainerFromDisk,
  patchCropsFromDisk,
  patchHomepageFromDisk,
  patchOrderFromDisk,
  patchPageFromDisk,
  patchPageMetaFromDisk,
  patchSettingsFromDisk,
  patchSpaceFromDisk,
} from './watchPatch'
import { flushSidecarWrites } from './valuesChanged'
import { errText } from '../Contract/result'
import { dropTileHeadingLinks } from '../Tiles/tilesFile'

/** `'no-change'`: the op cannot move the tree. Null: no transform owns it, so the caller walks. */
function patchForMutation(
  tree: NexusTree,
  req: MutateRequest,
  reply: MutateOutcome,
): NexusTree | 'no-change' | null {
  switch (req.op) {
    case 'setProperty':
    case 'setSpaceColor':
    case 'setSpaceRowOrder':
    case 'emptyBundle':
    case 'renameHeading':
      return 'no-change'
    case 'createPage':
    case 'createContainer':
    case 'createContextGroup':
    case 'createSpace':
      return reply.created ? insertCreatedInTree(tree, req, reply.created) : null
    case 'movePage':
    case 'moveSet':
      return moveInTree(tree, req)
    case 'rename':
      // The landed name, never the ask: a from-create rename may have disambiguated.
      return renameNodeInTree(tree, req.path, reply.renamed?.name ?? req.newName)
    case 'delete':
      return removeNodeInTree(tree, req.path)
    case 'reorderChildren':
      return reorderChildrenInTree(tree, req.parentPath, req.order)
    case 'reorderTop':
      return reorderChildrenInTree(tree, '', req.order)
    case 'renameContext':
    case 'renameSpace':
    case 'reorderContexts':
    case 'reorderSpaces':
      return patchContextGroupsInTree(tree, req)
    default:
      return null
  }
}

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

// The page patch names the id it landed; a mutation confirm only needs to know that it landed.
const patchPage = async (root: string, path: string): Promise<'ok' | 'refresh'> =>
  (await patchPageFromDisk(root, path)) === 'refresh' ? 'refresh' : 'ok'

function patchEntityFromDisk(
  root: string,
  kind: MutableKind | BannerOwnerKind,
  path: string,
): Promise<'ok' | 'refresh'> | null {
  switch (kind) {
    case 'page':
      return patchPage(root, path)
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
    // Field writes land through the writer's own normalization, so confirm by re-reading the one file that changed (a Context's icon lives in its registry, a structural walk input).
    case 'setIcon':
      if (req.kind === 'page') return patchPageMetaFromDisk(root, req.path)
      return patchEntityFromDisk(root, req.kind, req.path) ?? 'refresh'
    case 'setDisclosureLock':
    case 'setActiveView':
      return patchEntityFromDisk(root, req.kind, req.path) ?? 'refresh'
    case 'setBanner':
    case 'setHeadingIconHidden':
      if (req.kind === 'homepage') return patchHomepageFromDisk(root)
      if (req.kind === 'navview') return 'ok'
      return patchEntityFromDisk(root, req.kind, req.path) ?? 'refresh'
    case 'setContext':
      return isMarkdownFile(req.path) ? patchPage(root, req.path) : 'ok'
    case 'setPageMeta':
      return patchPageMetaFromDisk(root, req.path)
    case 'setCrop':
      return patchCropsFromDisk(root)
    case 'reorderPanelContexts':
      return patchOrderFromDisk(root)
    case 'setProfileImage':
    case 'setProfileIcon':
      return patchSettingsFromDisk(root)
    case 'restore':
      dropTileHeadingLinks()
      return reply.landed && isMarkdownFile(reply.landed)
        ? patchPage(root, reply.landed)
        : 'refresh'
    default: {
      const tree = getLiveTree()
      if (!tree) return 'refresh'
      // An adopted id hashes the very path a rename or move changes, and a delete records its parent by stamping the adopted one away, so an affected subtree walks rather than hold an id the next walk could never produce.
      if (
        ((req.op === 'rename' || req.op === 'movePage' || req.op === 'moveSet') &&
          subtreeHoldsAdoptedId(tree, req.path)) ||
        (req.op === 'delete' &&
          isAdoptedId(findContainerWhere(tree, (c) => c.path === relDirname(req.path))?.id ?? ''))
      )
        return 'refresh'
      const patched = patchForMutation(tree, req, reply)
      if (patched === 'no-change') return 'ok'
      if (patched === null) return 'refresh'
      if (applyPatch(root, () => patched) === 'refresh') return 'refresh'
      // The landed position derives from an order file the transform never read: it ranks unlisted entities by order where the walk ranks by title, so one targeted read pins it.
      switch (req.op) {
        case 'createPage': {
          const placed = req.order ? 'ok' : await patchContainerFromDisk(root, req.parentPath)
          // A Context seed lands after the birth write, so the page reads back its membership.
          const seededContext = Object.values(req.seeds ?? {}).some((v) => v.kind === 'context')
          return placed === 'ok' && seededContext && reply.created
            ? patchPage(root, reply.created.path)
            : placed
        }
        case 'createContainer': {
          // The creation seeded the new sidecar with a default view; read it, then pin the order.
          const own = reply.created ? await patchContainerFromDisk(root, reply.created.path) : 'ok'
          if (own === 'refresh') return 'refresh'
          return req.parentPath === ''
            ? patchOrderFromDisk(root)
            : patchContainerFromDisk(root, req.parentPath)
        }
        case 'reorderChildren':
          return patchContainerFromDisk(root, req.parentPath)
        case 'reorderTop':
        case 'createSpace':
        case 'reorderSpaces':
          return patchOrderFromDisk(root)
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

/** Re-reads `properties.json` rather than trusting request values, which the writers normalize before writing. `containerPath` names the one Collection sidecar the write also touched. */
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

export async function confirmBy(
  root: string,
  work: () => Promise<'ok' | 'refresh'>,
): Promise<NexusTree | null> {
  const before = getLiveTree()
  let route = await work().catch((e) => {
    console.error('confirm: patch failed, walking:', errText(e))
    return 'refresh' as const
  })
  for (const dirRel of flushSidecarWrites(root)) {
    if (route === 'ok' && (await patchSpaceFromDisk(root, dirRel)) === 'refresh') route = 'refresh'
  }
  if (route === 'refresh') {
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
