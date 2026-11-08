// A drag's tree order, painted ahead of its write and taken back when the write is refused.

import { useMemo, useSyncExternalStore } from 'react'
import { announceDrag } from '@pommora/uix/Interactions/a11y'
import { channel } from '@pommora/uix/Utilities/subscribable'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { OrderRequest } from '../../Nexus/mutateRequest'
import { containerAt, orderInTree } from '../../Nexus/treePatch'
import { useSession } from '../../Session/store'

const ahead = channel<readonly OrderRequest[]>([])

export function usePainted(source: CollectionNode | SetNode): CollectionNode | SetNode {
  const tree = useSession((s) => s.tree)
  const orders = useSyncExternalStore(ahead.subscribe, ahead.get)
  return useMemo(
    () =>
      tree && orders.length > 0
        ? (containerAt(
            orders.reduce((t, req) => orderInTree(t, req) ?? t, tree),
            source.path,
          ) ?? source)
        : source,
    [tree, source, orders],
  )
}

export function refusedDrop(landed: boolean, name: string): boolean {
  if (!landed) announceDrag('return', name)
  return landed
}

export function mutateAhead(
  req: OrderRequest,
  name: string,
  after?: Promise<boolean>,
): Promise<boolean> {
  ahead.set([...ahead.get(), req])
  const write = (): Promise<boolean> =>
    useSession
      .getState()
      .mutate(req)
      .then((outcome) => refusedDrop(outcome !== null, name))
  return (after ? after.then((ok) => ok && write()) : write()).finally(() =>
    ahead.set(ahead.get().filter((r) => r !== req)),
  )
}
