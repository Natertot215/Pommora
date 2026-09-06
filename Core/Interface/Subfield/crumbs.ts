import type { NexusTree } from '@pommora/core/Nexus/tree'
import type { SelectionState } from '@pommora/core/Navigation/navRef'
import { titleFromPath } from '@pommora/core/Connections/connections'
import type { TrailSegment } from '@pommora/uix/Elements/NavTrail/NavTrail'
import type { SelectTarget } from '../../Session/store'
import { ancestryOf, type TrailNode } from '../../Session/treeIndex'
import { findSpace } from '../../Session/treeIndex'

type SpineTarget = Extract<SelectTarget, { kind: 'collection' | 'set' | 'page' }>

const hasSpine = (target: SelectTarget): target is SpineTarget =>
  target.kind === 'collection' || target.kind === 'set' || target.kind === 'page'

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

/** The depth holds while walking up its own spine, so the segments left behind stay dimmed and re-navigable; going deeper or branching makes `target` the new depth. */
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
