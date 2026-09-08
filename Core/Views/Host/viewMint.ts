// entry-mint is the SOLE place a container's default view is born (an in-flight map keyed by container id guards a re-select from double-firing); every other writer routes through `saveViewAdopting`, which awaits the in-flight mint rather than minting its own.

import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { Result } from '@pommora/core/Contract/result'
import { DEFAULT_VIEW_ID, mintDefaultView, type SavedView } from '@pommora/core/Views/views'
import { host } from '../../Platform/dialer'

const inFlight = new Map<string, Promise<string>>()

const pendingViewMint = (containerId: string): Promise<string> | undefined =>
  inFlight.get(containerId)

export function ensureContainerView(
  source: CollectionNode | SetNode,
  schema: PropertyDefinition[],
): void {
  if ((source.views?.length ?? 0) > 0 || inFlight.has(source.id)) return
  const mint = (async () => {
    const res = await host().ask('views:save', source.path, source.kind, mintDefaultView(schema))
    if (!res.ok) throw new Error(res.error.message)
    return res.value.id
  })()
  inFlight.set(source.id, mint)
  // Clear the guard ONLY when the save itself failed (allow a retry); a successful mint keeps it.
  void mint.catch(() => inFlight.delete(source.id))
}

export async function saveViewAdopting(
  source: CollectionNode | SetNode,
  view: SavedView,
): Promise<Result<{ id: string }>> {
  const wasSentinel = view.id === DEFAULT_VIEW_ID
  let toSave = view
  if (wasSentinel) {
    const minted = await pendingViewMint(source.id)?.catch(() => undefined)
    if (minted) toSave = { ...view, id: minted }
  }
  // Nothing records the adoption: the adopted view IS views[0] once the push lands, which pickView returns.
  return host().ask('views:save', source.path, source.kind, toSave)
}
