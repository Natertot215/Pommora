import type { NexusTree, SelectionState } from '@shared/types'
import { titleFromPath } from '@shared/connections'
import type { TrailSegment } from '@renderer/DesignSystem/Elements/NavTrail'
import type { SelectTarget } from '../../store'
import { ancestryOf, type TrailNode } from '../../treeIndex'
import { findSpace } from '../Scope'

/** The kinds that sit on a spine — every other selection has no breadcrumb path at all. */
type SpineTarget = Extract<SelectTarget, { kind: 'collection' | 'set' | 'page' }>

const hasSpine = (target: SelectTarget): target is SpineTarget =>
  target.kind === 'collection' || target.kind === 'set' || target.kind === 'page'

/** The ordered spine from a target's collection down to the target itself. Null when the target
 *  no longer resolves. */
function spineOf(tree: NexusTree, target: SelectTarget): TrailNode[] | null {
  return hasSpine(target) ? ancestryOf(tree, target) : null
}

const targetOf = (node: TrailNode): SelectTarget | null => {
  switch (node.kind) {
    case 'collection':
      return { kind: 'collection', id: node.id }
    case 'set':
    case 'page':
      return { kind: node.kind, id: node.id, path: node.path }
    default:
      return null
  }
}

/**
 * The deepest node the breadcrumb should draw to, updated as navigation moves. The depth holds
 * while walking up its own spine, so the segments left behind stay dimmed and re-navigable; going
 * deeper or branching onto a different path makes `target` the new depth.
 */
export function crumbDepthFor(
  tree: NexusTree | null,
  prev: SelectTarget | null,
  target: SelectTarget,
): SelectTarget | null {
  if (!hasSpine(target)) return null
  if (!prev || !tree) return target
  const prevChain = spineOf(tree, prev)
  return prevChain?.some((n) => n.id === target.id) ? prev : target
}

/**
 * Breadcrumb segments for the open view. The spine runs from the collection to the deepest node
 * visited (`depth`) — the collection and depth-1 set navigate, deeper sub-sets are plain, the
 * current node is inert, and every segment past it is dimmed and clickable to re-descend.
 */
export function subfieldCrumbs(
  tree: NexusTree | null,
  selection: SelectionState,
  depth: SelectTarget | null,
  navigate: (target: SelectTarget, dir: 'back' | 'forward') => void,
): TrailSegment[] {
  if (!tree) return []
  switch (selection.kind) {
    case 'none':
    case 'context':
      return []
    case 'homepage':
      return [{ title: tree.nexus.name }]
    case 'space': {
      const sp = findSpace(tree, selection.id)
      return sp ? [{ title: sp.name }] : []
    }
    case 'collection':
    case 'set':
    case 'page': {
      const currentChain = spineOf(tree, selection)
      if (!currentChain)
        return selection.kind === 'page' ? [{ title: titleFromPath(selection.path) }] : []
      const currentPos = currentChain.length - 1
      // Extend to the deepest visited node when it descends from the current one.
      const deepChain = depth ? spineOf(tree, depth) : null
      const spine =
        deepChain &&
        deepChain.length > currentChain.length &&
        currentChain.every((n, i) => n.id === deepChain[i]?.id)
          ? deepChain
          : currentChain
      return spine.map((node, i) => {
        const forwardCrumb = i > currentPos
        // Up the spine only the collection (0) and depth-1 set (1) open a detail surface.
        const navigable = forwardCrumb || (i < currentPos && (i === 0 || i === 1))
        const target = navigable ? targetOf(node) : null
        return {
          title: node.title,
          ghost: forwardCrumb || undefined,
          onSelect: target ? () => navigate(target, forwardCrumb ? 'forward' : 'back') : undefined,
        }
      })
    }
  }
}
