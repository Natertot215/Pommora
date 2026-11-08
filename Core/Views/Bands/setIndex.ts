import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { SavedView } from '../views'
import { type GroupPlan, viewSetOrder } from '../Pipeline/group'
import { resolveRowOrder } from '@pommora/uix/Utilities/moveItem'

export interface SetIndex {
  node: ReadonlyMap<string, SetNode>
  parent: ReadonlyMap<string, string | null>
  children: ReadonlyMap<string | null, string[]>
  preorder: string[]
}

const cache = new WeakMap<CollectionNode | SetNode, SetIndex>()

export function setIndexOf(source: CollectionNode | SetNode): SetIndex {
  const hit = cache.get(source)
  if (hit) return hit
  const node = new Map<string, SetNode>()
  const parent = new Map<string, string | null>()
  const children = new Map<string | null, string[]>()
  const preorder: string[] = []
  const walk = (sets: SetNode[], parentId: string | null): void => {
    children.set(
      parentId,
      sets.map((s) => s.id),
    )
    for (const s of sets) {
      node.set(s.id, s)
      parent.set(s.id, parentId)
      preorder.push(s.id)
      walk(s.sets ?? [], s.id)
    }
  }
  walk(source.sets ?? [], null)
  const index = { node, parent, children, preorder }
  cache.set(source, index)
  return index
}

export const orderedChildren = (
  sets: SetIndex,
  parentKey: string | null,
  plan: GroupPlan,
  view: SavedView,
): string[] =>
  resolveRowOrder(sets.children.get(parentKey) ?? [], (id) => id, viewSetOrder(plan, view))
