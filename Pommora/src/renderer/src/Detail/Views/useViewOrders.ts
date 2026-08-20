// The per-view manual order cache, one home for both renderers. `viewOrders` is the per-machine
// tiebreaker the pipeline's sorter reads when a view is sorted or grouped; the canonical
// `page_order` answers the unsorted structural case and never comes through here.

import { useEffect, useState } from 'react'

export interface ViewOrders {
  /** viewId → the manual order it was last dropped into. */
  viewOrders: Record<string, string[]>
  /** Write one view's order. The wire write lands in the local copy too — nothing re-reads the
   *  cache mid-session, so a stale local array would outlive the override that masks it. */
  persistViewOrder: (ids: string[]) => void
}

export function useViewOrders(containerPath: string, viewId: string): ViewOrders {
  const [viewOrders, setViewOrders] = useState<Record<string, string[]>>({})
  useEffect(() => {
    let canceled = false
    void window.nexus.viewOrders.get().then((m) => {
      if (!canceled) setViewOrders(m)
    })
    return () => {
      canceled = true
    }
  }, [containerPath])
  return {
    viewOrders,
    persistViewOrder: (ids) => {
      setViewOrders((m) => ({ ...m, [viewId]: ids }))
      void window.nexus.viewOrders.set(viewId, ids)
    },
  }
}
