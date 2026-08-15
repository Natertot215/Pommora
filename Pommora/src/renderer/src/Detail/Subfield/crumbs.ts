import type { CollectionNode, NexusTree, SelectionState, SetNode } from '@shared/types'
import { titleFromPath } from '@shared/connections'
import type { SelectTarget } from '../../store'
import { findSpace } from '../Scope'

/** One breadcrumb segment. `onClick` absent ⇒ the current/non-navigable segment; `ghost` ⇒ a dimmed
 *  segment ahead of the current one — a path you backed out of, still clickable to re-descend into. */
export interface Crumb {
  key: string
  title: string
  ghost?: boolean
  onClick?: () => void
}

const allCollections = (tree: NexusTree): CollectionNode[] => [...(tree.collections ?? [])]

export function chainOf(
  tree: NexusTree,
  id: string,
): { collection: CollectionNode; sets: SetNode[] } | null {
  const inSets = (sets: SetNode[] | undefined, acc: SetNode[]): SetNode[] | null => {
    for (const s of sets ?? []) {
      if (s.id === id || s.pages.some((p) => p.id === id)) return [...acc, s]
      const deep = inSets(s.sets, [...acc, s])
      if (deep) return deep
    }
    return null
  }
  for (const col of allCollections(tree)) {
    if (col.id === id || col.pages.some((p) => p.id === id)) return { collection: col, sets: [] }
    const path = inSets(col.sets, [])
    if (path) return { collection: col, sets: path }
  }
  return null
}

/** One node on the breadcrumb spine — its navigation target, display title, and identity. */
interface ChainNode {
  id: string
  title: string
  target: SelectTarget
}

/** The ordered spine from a target's collection down to the target itself — a collection, the sets
 *  descending to it, and the page when the target is one. Null when the target no longer resolves. */
function nodeChain(tree: NexusTree, target: SelectTarget): ChainNode[] | null {
  if (target.kind !== 'collection' && target.kind !== 'set' && target.kind !== 'page') return null
  const chain = chainOf(tree, target.id)
  if (!chain) return null
  const nodes: ChainNode[] = [
    {
      id: chain.collection.id,
      title: chain.collection.title,
      target: { kind: 'collection', id: chain.collection.id },
    },
  ]
  for (const s of chain.sets)
    nodes.push({ id: s.id, title: s.title, target: { kind: 'set', id: s.id, path: s.path } })
  if (target.kind === 'page')
    nodes.push({
      id: target.id,
      title: titleFromPath(target.path),
      target: { kind: 'page', id: target.id, path: target.path },
    })
  return nodes
}

/**
 * The deepest node the breadcrumb should draw to, updated as navigation moves. The depth holds while
 * you walk UP its own spine — `target` is the depth itself or one of its ancestors — so the segments
 * you left stay dimmed and re-navigable. Going deeper, or branching onto a different path, makes
 * `target` the new depth. Non-container selections have no spine and clear it.
 */
export function crumbDepthFor(
  tree: NexusTree | null,
  prev: SelectTarget | null,
  target: SelectTarget,
): SelectTarget | null {
  if (target.kind !== 'collection' && target.kind !== 'set' && target.kind !== 'page') return null
  if (!prev || !tree) return target
  const prevChain = nodeChain(tree, prev)
  return prevChain?.some((n) => n.id === target.id) ? prev : target
}

/**
 * Breadcrumb segments for the open view. The spine runs from the collection down to the deepest node
 * visited on the current path (`depth`) — the collection and depth-1 set navigate, deeper sub-sets
 * are plain, the current node is inert, and every segment past it is dimmed and clickable to
 * re-descend. Walking up the path keeps the deeper segments in view rather than collapsing them.
 */
export function subfieldCrumbs(
  tree: NexusTree | null,
  selection: SelectionState,
  depth: SelectTarget | null,
  navigate: (target: SelectTarget, dir: 'back' | 'forward') => void,
): Crumb[] {
  if (!tree) return []
  switch (selection.kind) {
    case 'none':
    case 'context':
      return []
    case 'homepage':
      return [{ key: 'home', title: tree.nexus.name }]
    case 'space': {
      const sp = findSpace(tree, selection.id)
      return sp ? [{ key: selection.id, title: sp.name }] : []
    }
    case 'collection':
    case 'set':
    case 'page': {
      const currentChain = nodeChain(tree, selection)
      if (!currentChain)
        return selection.kind === 'page'
          ? [{ key: selection.id, title: titleFromPath(selection.path) }]
          : []
      const currentPos = currentChain.length - 1
      // Extend to the deepest visited node when it descends from the current one; otherwise the spine
      // ends at the current node.
      const deepChain = depth ? nodeChain(tree, depth) : null
      const spine =
        deepChain &&
        deepChain.length > currentChain.length &&
        currentChain.every((n, i) => n.id === deepChain[i]?.id)
          ? deepChain
          : currentChain
      return spine.map((node, i) => {
        const forwardCrumb = i > currentPos
        // Up the spine only the collection (0) and depth-1 set (1) open a detail surface; the current
        // node is inert; every forward crumb re-descends.
        const navigable = forwardCrumb || (i < currentPos && (i === 0 || i === 1))
        return {
          key: forwardCrumb ? `fwd-${node.id}` : node.id,
          title: node.title,
          ghost: forwardCrumb || undefined,
          onClick: navigable
            ? () => navigate(node.target, forwardCrumb ? 'forward' : 'back')
            : undefined,
        }
      })
    }
  }
}
