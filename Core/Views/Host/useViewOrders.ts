// `viewOrders` is the per-machine tiebreaker the pipeline's sorter reads when a view is sorted or grouped; the canonical `page_order` answers the unsorted structural case and never comes through here.

import { useEffect, useState } from 'react'
import { host } from '../../Platform/dialer'

interface ViewOrders {
  viewOrders: Record<string, string[]>
  persistViewOrder: (ids: string[]) => void
}

export function useViewOrders(containerPath: string, viewId: string): ViewOrders {
  const [viewOrders, setViewOrders] = useState<Record<string, string[]>>({})
  useEffect(() => {
    let canceled = false
    void host()
      .ask('viewOrders:get')
      .then((m) => {
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
      void host().ask('viewOrders:set', viewId, ids)
    },
  }
}
