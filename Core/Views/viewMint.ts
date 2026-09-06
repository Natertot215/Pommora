// The view-mint machinery: entry-mint is the SOLE place a container's default view is born.
// On landing a view-bearing container whose views[] is empty, `ensureContainerView` mints once (an
// in-flight map keyed by container id guards a re-select from double-firing). Every other view writer
// routes through `saveViewAdopting` — a sentinel-holding write awaits the in-flight mint and saves
// against the real id, never minting its own.

import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { Result } from '@pommora/core/Contract/result'
import { DEFAULT_VIEW_ID, mintDefaultView, type SavedView } from '@pommora/core/Views/views'
import { host } from '../Platform/dialer'

const inFlight = new Map<string, Promise<string>>()

// Wired by the store at creation — a sentinel adoption must land in the activeViews slice,
// and this module stays store-free.
let onViewAdopted: (containerId: string, viewId: string) => void = () => {}
export function wireViewAdopted(fn: (containerId: string, viewId: string) => void): void {
  onViewAdopted = fn
}

export const pendingViewMint = (containerId: string): Promise<string> | undefined =>
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

/** The ONE view writer every surface calls.*/
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
  const res = await host().ask('views:save', source.path, source.kind, toSave)
  if (res.ok) {
    if (wasSentinel) {
      await host().ask('activeViews:set', source.id, res.value.id)
      onViewAdopted(source.id, res.value.id)
    }
  }
  return res
}
