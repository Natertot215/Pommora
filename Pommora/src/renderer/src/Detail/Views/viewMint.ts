// The view-mint machinery: entry-mint is the SOLE place a container's default view is born.
// On landing a view-bearing container whose views[] is empty, `ensureContainerView` mints once (an
// in-flight map keyed by container id guards a re-select from double-firing). Every other view writer
// routes through `saveViewAdopting` — a sentinel-holding write awaits the in-flight mint and saves
// against the real id, never minting its own. Store-free: main confirms every view save by
// patching its live tree and pushing, so no writer here needs the store.
import type { CollectionNode, SetNode } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import type { Result } from '@shared/result'
import { DEFAULT_VIEW_ID, mintDefaultView, type SavedView } from '@shared/views'

const inFlight = new Map<string, Promise<string>>()

export const pendingViewMint = (containerId: string): Promise<string> | undefined =>
  inFlight.get(containerId)

export function ensureContainerView(
  source: CollectionNode | SetNode,
  schema: PropertyDefinition[],
): void {
  if ((source.views?.length ?? 0) > 0 || inFlight.has(source.id)) return
  const mint = (async () => {
    const res = await window.nexus.views.save(source.path, source.kind, mintDefaultView(schema))
    if (!res.ok) throw new Error(res.error.message)
    return res.value.id
  })()
  inFlight.set(source.id, mint)
  // Clear the guard ONLY when the save itself failed (allow a retry); a successful mint keeps it.
  void mint.catch(() => inFlight.delete(source.id))
}

/** The ONE view writer every surface calls. A sentinel-holding write adopts the in-flight mint's real
 *  id (never mints its own); a real id saves directly. A sentinel save also adopts the id as the active
 *  view so the writer's edits stay on the view the user sees — main's confirming push carries the
 *  saved view into the tree. */
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
  const res = await window.nexus.views.save(source.path, source.kind, toSave)
  if (res.ok) {
    // A sentinel save adopts its real id (freshly minted, or the in-flight entry-mint's) as the active
    // view so the writer's edits stay on the view they see — keyed off the ORIGINAL id, since toSave.id
    // has already been swapped to the minted id by here.
    if (wasSentinel) await window.nexus.activeViews.set(source.id, res.value.id)
  }
  return res
}
