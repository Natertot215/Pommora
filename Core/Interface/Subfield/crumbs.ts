import { isCmd } from '@pommora/uix/Interactions/chords'
import type { NexusTree } from '../../Nexus/tree'
import { type ContainerKind, isContainer } from '../../Nexus/entities'
import type { SelectionState, SelectTarget } from '../../Navigation/navRef'
import { titleFromPath } from '../../Paths/posix'
import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { ancestryOf, type TrailNode, findSpace, nodesByIdOf } from '../../Nexus/treeIndex'
import { ARCHIVE_ICON, ARCHIVE_TITLE } from '../../Archive/archivePlace'
import { isTopContainer } from '../../Nexus/treePatch'

type SpineTarget = Extract<SelectTarget, { kind: ContainerKind | 'page' }>

const hasSpine = (target: SelectTarget): target is SpineTarget =>
  isContainer(target) || target.kind === 'page'

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
  navigate: (target: SelectTarget, dir: 'back' | 'forward', newTab: boolean) => void,
  foldersOpen: boolean,
): TrailSegment[] {
  if (!tree) return []
  const crumbsOver = (spine: TrailNode[], currentPos: number): TrailSegment[] =>
    spine.map((node, i) => {
      const forwardCrumb = i > currentPos
      const navigable = forwardCrumb || (i < currentPos && (isTopContainer(node) || foldersOpen))
      const target = navigable ? targetOf(node) : null
      return {
        title: node.title,
        ghost: forwardCrumb || undefined,
        onSelect: target
          ? (e: React.MouseEvent) => navigate(target, forwardCrumb ? 'forward' : 'back', isCmd(e))
          : undefined,
      }
    })
  switch (selection.kind) {
    case 'none':
    case 'matrix':
      return []
    case 'homepage':
      return [{ title: tree.nexus.name }]
    case 'space': {
      const sp = findSpace(tree, selection.id)
      return sp ? [{ title: sp.title }] : []
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
      return crumbsOver(spine, currentPos)
    }
    case 'archive': {
      const owner = nodesByIdOf(tree).get(selection.id)
      if (!owner) return []
      return crumbsOver(
        [
          ...owner.parents,
          owner,
          {
            kind: 'archive',
            id: owner.id,
            title: ARCHIVE_TITLE,
            path: owner.path,
            icon: ARCHIVE_ICON,
          },
        ],
        owner.parents.length + 1,
      )
    }
  }
}
