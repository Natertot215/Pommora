import type { IconName } from '@pommora/uix/Symbols'
import type { CollectionNode, NexusTree, SetNode } from '../Nexus/tree'
import { isContainer, type ContainerKind } from '../Nexus/entities'
import { findContainerById, isTopSet } from '../Nexus/treePatch'

export const ARCHIVE_ICON: IconName = 'archive'

/** A Collection or a top-level Set: what owns an archive place and saved views of its own. */
export const ownsArchivePlace = (n: { kind: string; path: string }): boolean =>
  n.kind === 'collection' || (n.kind === 'set' && isTopSet(n.path))

/** A target that names a container by id: a Collection, a Set, or either's archive place. */
export const namesContainer = <T extends { kind: unknown }>(
  n: T | null | undefined,
): n is T & { kind: ContainerKind | 'archive' } => isContainer(n) || n?.kind === 'archive'

/** The Collection or top-level Set with this id; none once it's gone or sits deeper. */
export function topContainerOf(
  tree: NexusTree | null,
  id: string,
): CollectionNode | SetNode | undefined {
  const node = tree && findContainerById(tree, id)
  return node && ownsArchivePlace(node) ? node : undefined
}
