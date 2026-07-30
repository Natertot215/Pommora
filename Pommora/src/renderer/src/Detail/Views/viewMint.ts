// The view-mint machinery: entry-mint is the SOLE place a container's default view is born.
// On landing a view-bearing container whose views[] is empty, `ensureContainerView` mints once (an
// in-flight map keyed by container id guards a re-select from double-firing). Every other view writer
// routes through `saveViewAdopting` — a sentinel-holding write awaits the in-flight mint and saves
// against the real id, never minting its own. Store-free: every save's refetch (load) re-hydrates the
// tree + activeViews slice from disk, so no writer here needs the store — the watcher echo-suppresses
// the app's own writes, so that load is the sole confirm the shown view reflects the change.
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
  refetch: () => Promise<void>,
): void {
  if ((source.views?.length ?? 0) > 0 || inFlight.has(source.id)) return
  const mint = (async () => {
    const res = await window.nexus.views.save(source.path, source.kind, mintDefaultView(schema))
    if (!res.ok) throw new Error(res.error.message)
    // A refetch failure must NOT un-guard: the view IS on disk, so re-minting would double it. The
    // stale tree self-heals on the next successful load; the guard stays so no second default is born.
    await refetch().catch(() => {})
    return res.value.id
  })()
  inFlight.set(source.id, mint)
  // Clear the guard ONLY when the save itself failed (allow a retry); a successful mint keeps it.
  void mint.catch(() => inFlight.delete(source.id))
}

/** The ONE view writer every surface calls. A sentinel-holding write adopts the in-flight mint's real
 *  id (never mints its own); a real id saves directly. A sentinel save also adopts the id as the active
 *  view so the writer's edits stay on the view the user sees. A successful save then refetches — the
 *  sidecar write is echo-suppressed at the watcher, so the explicit load() is the sole confirm for
 *  surfaces without their own optimistic view state. A caller that already shows the change through a
 *  live override passes `skipRefetch` to avoid a redundant full-nexus walk. A mint always refetches
 *  (it adopts a new view). */
export async function saveViewAdopting(
  source: CollectionNode | SetNode,
  view: SavedView,
  refetch: () => Promise<void>,
  opts?: { skipRefetch?: boolean },
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
    if (wasSentinel || !opts?.skipRefetch) await refetch()
  }
  return res
}
