import type { IconName } from '@pommora/uix/Symbols'
import type { CollectionNode, NexusTree, SetNode } from '../Nexus/tree'
import { findContainerById, isTopSet } from '../Nexus/treePatch'

export const ARCHIVE_ICON: IconName = 'archive'

/** The Collection or top-level Set with this id, what owns an archive place and saved views of its own; none once it's gone or sits deeper. */
export function archiveOwnerOf(
  tree: NexusTree | null,
  id: string,
): CollectionNode | SetNode | undefined {
  const node = tree && findContainerById(tree, id)
  return node && (node.kind === 'collection' || isTopSet(node.path)) ? node : undefined
}
