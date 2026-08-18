// Pure tree patch transforms — the one definition both processes apply: the renderer
// optimistically, main as canon. A request that can't be resolved against the given tree
// returns null → the caller falls back to a full walk.

import { NEW_PAGE_SLOT, type MutateRequest, type StateOrderKey } from '@shared/mutate'
import { titleFromPath } from '@shared/connections'
import type {
  CollectionNode,
  ContextGroup,
  NexusTree,
  OpenIn,
  PageNode,
  SetNode,
  SpaceNode,
  ViewButton,
  ViewStyle,
} from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import type { SavedView } from '@shared/views'

const basename = (path: string): string => path.slice(path.lastIndexOf('/') + 1)
// '' for a root-level path — a bare slice(0, lastIndexOf) would eat the name's last character.
const parentOf = (path: string): string => {
  const i = path.lastIndexOf('/')
  return i === -1 ? '' : path.slice(0, i)
}
const joinPath = (parent: string, name: string): string => (parent ? `${parent}/${name}` : name)

// ---------- node factories ----------
// The walk's literal node shapes, stated once. Every producer builds nodes here, so a
// transform-built node and a walk-built node of the same entity carry identical key sets —
// which is what lets `stabilize` prove tree convergence by reference identity.

export function makePageNode(f: {
  id: string
  title: string
  path: string
  icon?: string
}): PageNode {
  return { kind: 'page', id: f.id, title: f.title, icon: f.icon, path: f.path }
}

export function makeSpaceNode(f: {
  id: string
  title: string
  path: string
  contextId: string
  icon?: string
  banner?: string
  headingIconHidden?: boolean
  color?: string
}): SpaceNode {
  return {
    kind: 'space',
    id: f.id,
    title: f.title,
    icon: f.icon,
    path: f.path,
    banner: f.banner,
    headingIconHidden: f.headingIconHidden ?? false,
    color: f.color,
    contextId: f.contextId,
  }
}

export function makeSetNode(f: {
  id: string
  title: string
  path: string
  icon?: string
  banner?: string
  headingIconHidden?: boolean
  sets?: SetNode[]
  pages?: PageNode[]
  views?: SavedView[]
  viewButton?: ViewButton
  viewStyle?: ViewStyle
}): SetNode {
  return {
    kind: 'set',
    id: f.id,
    title: f.title,
    icon: f.icon,
    path: f.path,
    banner: f.banner,
    headingIconHidden: f.headingIconHidden ?? false,
    sets: f.sets ?? [],
    pages: f.pages ?? [],
    views: f.views,
    viewButton: f.viewButton,
    viewStyle: f.viewStyle,
  }
}

export function makeCollectionNode(f: {
  id: string
  title: string
  path: string
  icon?: string
  banner?: string
  headingIconHidden?: boolean
  properties?: PropertyDefinition[]
  sets?: SetNode[]
  pages?: PageNode[]
  views?: SavedView[]
  openIn?: OpenIn
  viewButton?: ViewButton
  viewStyle?: ViewStyle
}): CollectionNode {
  return {
    kind: 'collection',
    id: f.id,
    title: f.title,
    icon: f.icon,
    path: f.path,
    banner: f.banner,
    headingIconHidden: f.headingIconHidden ?? false,
    properties: f.properties,
    sets: f.sets ?? [],
    pages: f.pages ?? [],
    views: f.views,
    openIn: f.openIn,
    viewButton: f.viewButton,
    viewStyle: f.viewStyle,
  }
}

/** The ORIGINAL oldPath/newPath thread through the whole recursion — swapping against a child's
 *  already-swapped path would re-prepend its segment and corrupt every grandchild. */
function reparentPaths<T extends PageNode | SetNode | CollectionNode>(
  node: T,
  oldPath: string,
  newPath: string,
): T {
  const swap = (p: string): string => (p === oldPath ? newPath : newPath + p.slice(oldPath.length))
  if (node.kind === 'page') return { ...node, path: swap(node.path) }
  const set = node as SetNode
  return {
    ...set,
    path: swap(set.path),
    sets: set.sets?.map((s) => reparentPaths(s, oldPath, newPath)),
    pages: set.pages.map((pg) => ({ ...pg, path: swap(pg.path) })),
  } as T
}

/** Extract the page/set at `path` from its container; returns the pruned container tree + the node. */
function extract(
  containers: (CollectionNode | SetNode)[],
  path: string,
): { containers: (CollectionNode | SetNode)[]; node: PageNode | SetNode | null } {
  let node: PageNode | SetNode | null = null
  const next = containers.map((c) => {
    if (node) return c
    const page = c.pages.find((p) => p.path === path)
    if (page) {
      node = page
      return { ...c, pages: c.pages.filter((p) => p.path !== path) }
    }
    const set = c.sets?.find((s) => s.path === path)
    if (set) {
      node = set
      return { ...c, sets: (c.sets ?? []).filter((s) => s.path !== path) }
    }
    if (c.sets?.length) {
      const r = extract(c.sets, path)
      if (r.node) {
        node = r.node
        return { ...c, sets: r.containers as SetNode[] }
      }
    }
    return c
  })
  return { containers: next, node }
}

/** Insert `node` into the container at `parentPath` (its pages for a page, sets for a set). */
function insert(
  containers: (CollectionNode | SetNode)[],
  parentPath: string,
  node: PageNode | SetNode,
  pageAt?: number,
): { containers: (CollectionNode | SetNode)[]; done: boolean } {
  let done = false
  const next = containers.map((c) => {
    if (done) return c
    if (c.path === parentPath) {
      done = true
      if (node.kind !== 'page') return { ...c, sets: [...(c.sets ?? []), node] }
      const at =
        pageAt !== undefined && pageAt >= 0 ? Math.min(pageAt, c.pages.length) : c.pages.length
      return { ...c, pages: [...c.pages.slice(0, at), node, ...c.pages.slice(at)] }
    }
    if (c.sets?.length) {
      const r = insert(c.sets, parentPath, node, pageAt)
      if (r.done) {
        done = true
        return { ...c, sets: r.containers as SetNode[] }
      }
    }
    return c
  })
  return { containers: next, done }
}

/** Relocate the node at `path` under `newParentPath`, updating paths. Null if unresolved or a no-op. */
export function relocateNodeInTree(
  tree: NexusTree,
  path: string,
  newParentPath: string,
): NexusTree | null {
  if (parentOf(path) === newParentPath) return null // already there
  const newPath = joinPath(newParentPath, basename(path))
  const pulled = extract(tree.collections, path)
  if (!pulled.node) return null
  const moved = reparentPaths(pulled.node, path, newPath)
  const placed = insert(pulled.containers, newParentPath, moved)
  if (!placed.done) return null
  return { ...tree, collections: placed.containers as CollectionNode[] }
}

function holdsPath(containers: (CollectionNode | SetNode)[], path: string): boolean {
  return containers.some(
    (c) =>
      c.path === path ||
      c.pages.some((p) => p.path === path) ||
      (c.sets ? holdsPath(c.sets, path) : false),
  )
}

/** Insert a just-created entity at its slot. Null when it's already present — the confirming
 *  push can land before the caller's reply continuation runs, and a second insert would
 *  duplicate the node; null keeps the optimistic layer idempotent. */
export function insertCreatedInTree(
  tree: NexusTree,
  req: MutateRequest,
  created: { id: string; path: string },
): NexusTree | null {
  const present =
    req.op === 'createContextGroup'
      ? (tree.contexts?.some((g) => g.def.id === created.id) ?? false)
      : req.op === 'createSpace'
        ? (tree.contexts?.some((g) => g.spaces.some((s) => s.path === created.path)) ?? false)
        : holdsPath(tree.collections, created.path)
  if (present) return null
  if (req.op === 'createContextGroup') {
    const title = basename(created.path)
    const group: ContextGroup = {
      def: { id: created.id, title },
      spaces: [],
    }
    return { ...tree, contexts: [...(tree.contexts ?? []), group] }
  }
  if (req.op === 'createSpace') {
    if (!tree.contexts?.some((g) => g.def.id === req.contextId)) return null
    const node = makeSpaceNode({
      id: created.id,
      title: basename(created.path),
      path: created.path,
      contextId: req.contextId,
    })
    return {
      ...tree,
      contexts: tree.contexts.map((g) =>
        g.def.id === req.contextId ? { ...g, spaces: [...g.spaces, node] } : g,
      ),
    }
  }
  if (req.op === 'createContainer' && req.kind === 'collection') {
    // Only top-level collections are walked as CollectionNodes — a nested one is unresolvable
    // here (a set-shaped node would render the wrong kind), so the caller walks.
    if (req.parentPath !== '') return null
    const node = makeCollectionNode({
      id: created.id,
      title: basename(created.path),
      path: created.path,
    })
    return { ...tree, collections: [...tree.collections, node] }
  }
  if (req.op === 'createContainer' || req.op === 'createPage') {
    const node: PageNode | SetNode =
      req.op === 'createPage'
        ? makePageNode({
            id: created.id,
            title: titleFromPath(created.path),
            path: created.path,
          })
        : makeSetNode({
            id: created.id,
            title: basename(created.path),
            path: created.path,
          })
    // A positional create's row must appear AT its slot — the order array already names it, and
    // an appended row would flash at the container's bottom.
    const pageAt =
      req.op === 'createPage' && req.order ? req.order.indexOf(NEW_PAGE_SLOT) : undefined
    const placed = insert(tree.collections, req.parentPath, node, pageAt)
    if (!placed.done) return null
    return { ...tree, collections: placed.containers as CollectionNode[] }
  }
  return null
}

/** Context-layer patches. A Context's folder and a Space's folder are both named by title, so a
 *  rename moves paths too: a Space is a leaf and swaps its own tail; a Context rename prefix-swaps
 *  every member Space's path under the renamed group directory. */
export function patchContextGroupsInTree(tree: NexusTree, req: MutateRequest): NexusTree | null {
  const groups = tree.contexts
  if (!groups.length) return null
  const withGroups = (next: ContextGroup[]): NexusTree => ({ ...tree, contexts: next })
  switch (req.op) {
    case 'renameContext':
      return withGroups(
        groups.map((g) =>
          g.def.id === req.contextId
            ? {
                ...g,
                def: { ...g.def, title: req.newName },
                spaces: g.spaces.map((s) => {
                  const groupDir = parentOf(s.path)
                  const newDir = joinPath(parentOf(groupDir), req.newName)
                  return { ...s, path: joinPath(newDir, basename(s.path)) }
                }),
              }
            : g,
        ),
      )
    case 'renameSpace':
      return withGroups(
        groups.map((g) => ({
          ...g,
          spaces: g.spaces.map((s) =>
            s.id === req.spaceId
              ? { ...s, title: req.newName, path: joinPath(parentOf(s.path), req.newName) }
              : s,
          ),
        })),
      )
    case 'setSpaceColor':
      return withGroups(
        groups.map((g) => ({
          ...g,
          spaces: g.spaces.map((s) => {
            if (s.id !== req.spaceId) return s
            const { color: _color, ...rest } = s
            return req.color ? { ...rest, color: req.color } : rest
          }),
        })),
      )
    case 'reorderContexts':
      return withGroups(reorderById(groups, req.ids, (g) => g.def.id))
    case 'reorderSpaces':
      return withGroups(
        groups.map((g) =>
          g.def.id === req.contextId
            ? { ...g, spaces: reorderById(g.spaces, req.ids, (s) => s.id) }
            : g,
        ),
      )
    default:
      return null
  }
}

/** Reorder `items` to follow `ids`; unlisted items keep their relative order at the tail. */
function reorderById<T>(items: T[], ids: string[], idOf: (item: T) => string): T[] {
  const rank = new Map(ids.map((id, i) => [id, i]))
  return [...items].sort(
    (a, b) => (rank.get(idOf(a)) ?? ids.length) - (rank.get(idOf(b)) ?? ids.length),
  )
}

export type TreeEntity = PageNode | SetNode | CollectionNode | SpaceNode

/** `fn` returns the replacement — or null to remove it. */
export function updateNodeInTree(
  tree: NexusTree,
  path: string,
  fn: (node: TreeEntity) => TreeEntity | null,
): NexusTree | null {
  for (const [gi, g] of (tree.contexts ?? []).entries()) {
    const i = g.spaces.findIndex((s) => s.path === path)
    if (i === -1) continue
    const next = fn(g.spaces[i])
    const spaces = [...g.spaces]
    if (next === null) spaces.splice(i, 1)
    else spaces[i] = next as SpaceNode
    const groups = [...(tree.contexts ?? [])]
    groups[gi] = { ...g, spaces }
    return { ...tree, contexts: groups }
  }
  const r = updateInContainers(tree.collections, path, fn)
  return r.found ? { ...tree, collections: r.containers as CollectionNode[] } : null
}

function updateInContainers(
  containers: (CollectionNode | SetNode)[],
  path: string,
  fn: (node: TreeEntity) => TreeEntity | null,
): { containers: (CollectionNode | SetNode)[]; found: boolean } {
  let found = false
  const out: (CollectionNode | SetNode)[] = []
  for (const cont of containers) {
    if (found) {
      out.push(cont)
      continue
    }
    if (cont.path === path) {
      found = true
      const next = fn(cont)
      if (next !== null) out.push(next as CollectionNode | SetNode)
      continue
    }
    const pi = cont.pages.findIndex((p) => p.path === path)
    if (pi !== -1) {
      found = true
      const next = fn(cont.pages[pi])
      const pages = [...cont.pages]
      if (next === null) pages.splice(pi, 1)
      else pages[pi] = next as PageNode
      out.push({ ...cont, pages })
      continue
    }
    if (cont.sets?.length) {
      const r = updateInContainers(cont.sets, path, fn)
      if (r.found) {
        found = true
        out.push({ ...cont, sets: r.containers as SetNode[] })
        continue
      }
    }
    out.push(cont)
  }
  return { containers: out, found }
}

/** Rename the entity at `path` (filename = title): title, path, and descendant paths update.
 *  Only valid after the write succeeded — a collision fails main-side and never patches. */
export function renameNodeInTree(tree: NexusTree, path: string, newName: string): NexusTree | null {
  const parent = parentOf(path)
  return updateNodeInTree(tree, path, (node) => {
    if (node.kind === 'page')
      return { ...node, title: newName, path: joinPath(parent, `${newName}.md`) }
    if (node.kind === 'collection' || node.kind === 'set')
      return { ...reparentPaths(node, path, joinPath(parent, newName)), title: newName }
    return { ...node, title: newName, path: joinPath(parent, newName) }
  })
}

/** Remove the entity at `path` (a just-confirmed delete). */
export function removeNodeInTree(tree: NexusTree, path: string): NexusTree | null {
  return updateNodeInTree(tree, path, () => null)
}

/** Patch renderer-knowable display fields on the entity at `path` (icon / heading-icon chrome). */
export function patchNodeInTree(
  tree: NexusTree,
  path: string,
  patch: { icon?: string | null; headingIconHidden?: boolean },
): NexusTree | null {
  return updateNodeInTree(tree, path, (node) => {
    const next = { ...node }
    if ('icon' in patch) {
      if (patch.icon === null || patch.icon === undefined) delete next.icon
      else next.icon = patch.icon
    }
    if (patch.headingIconHidden !== undefined) next.headingIconHidden = patch.headingIconHidden
    return next
  })
}

/** Stable order-by-id: listed ids in `order` order, unknown ids after in their current order.
 *  Exported so an optimistic view-local override ranks by the same law the tree patch applies. */
export function byOrder<T extends { id: string }>(arr: T[], order: string[]): T[] {
  return reorderById(arr, order, (item) => item.id)
}

export function reorderTopInTree(tree: NexusTree, _key: StateOrderKey, order: string[]): NexusTree {
  return { ...tree, collections: byOrder(tree.collections, order) }
}

/** Reorder a container's child containers ('' = the vault's top collections). */
export function reorderChildrenInTree(
  tree: NexusTree,
  parentPath: string,
  order: string[],
): NexusTree | null {
  if (parentPath === '') return { ...tree, collections: byOrder(tree.collections, order) }
  return updateNodeInTree(tree, parentPath, (node) =>
    node.kind === 'collection' || node.kind === 'set'
      ? { ...node, sets: byOrder(node.sets ?? [], order) }
      : node,
  )
}

/** Reorder a container's pages to `order` — the pages-side twin of reorderChildrenInTree,
 *  composed after relocateNodeInTree so a moved page lands at its slot, not appended. */
export function reorderPagesInTree(
  tree: NexusTree,
  parentPath: string,
  order: string[],
): NexusTree | null {
  return updateNodeInTree(tree, parentPath, (node) =>
    node.kind === 'collection' || node.kind === 'set'
      ? { ...node, pages: byOrder(node.pages, order) }
      : node,
  )
}
