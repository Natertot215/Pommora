import { entityIcon } from '../Assets/entityIconPolicy'
import type { DefaultIcons } from '../Settings/personalization'
import type { CollectionNode, NexusTree, PageNode, SetNode } from '../Nexus/tree'
import type { PickItem } from './menuModel'

/** Every Collection and Set as a branch, its Sets before its own leaves as the sidebar lists them. */
export function containerPickTree<T>(
  tree: NexusTree,
  icons: DefaultIcons,
  leaves: (c: CollectionNode | SetNode) => PickItem<T>[],
): PickItem<T>[] {
  const branch = (c: CollectionNode | SetNode): PickItem<T> => ({
    label: c.title,
    icon: entityIcon(c.kind, c.icon, icons),
    submenu: [...(c.sets ?? []).map(branch), ...leaves(c)],
  })
  return tree.collections.map(branch)
}

export const pagePickTree = <T>(
  tree: NexusTree,
  icons: DefaultIcons,
  pick: (p: PageNode) => T,
): PickItem<T>[] =>
  containerPickTree(tree, icons, (c) =>
    c.pages.map((p) => ({
      label: p.title,
      icon: entityIcon('page', tree.config.pageMetadata[p.id]?.icon, icons),
      pick: pick(p),
    })),
  )
