// The C-1 seam: inside a view-embed tile, view resolution reads the tile payload and
// every view-CONFIG write lands on the payload (D-12: copied, never synced) — the
// source's saved views, per-machine active slot, and container config are untouchable
// from scope. Gating is by EFFECT: surfaces write through useSaveView, which routes on
// the scope's presence; outside a scope everything behaves exactly as before.

import { createContext, useContext } from 'react'
import type { CollectionNode, SetNode } from '@shared/types'
import { pickViewState, type SavedView, type ViewState } from '@shared/views'
import { saveViewAdopting } from '@renderer/Detail/Views/viewMint'

/** The refusal a locked scope answers every view-config write with — surfaces report it, never
 *  swallow it (a config surface that looked live and dropped the write is the loss this names). */
export const VIEW_CONFIG_LOCKED = 'The view configuration is locked on this embed.'

export interface ViewEmbedScopeValue {
  source: CollectionNode | SetNode
  view: SavedView
  /** Persist the tile's copied config — writes the block payload via the saveBlocks updater. Refuses
   *  while `locked` (B-5): every config surface routes through here, so one gate freezes them all. */
  persistConfig: (next: SavedView) => void
  /** Persist the tile's view STATE, folded onto the stored view. Never lock-gated, and never a route
   *  for config: it writes the state keys alone, so a refused override can't ride along with it. */
  persistState: (next: ViewState) => void
  /** B-5 per-tile config lock. Frozen: view config + view CRUD. Live: data drags, value edits, and
   *  view state — collapsing a band says how you're reading the tile, not how it's configured. */
  locked: boolean
  /** Toggle the lock — writes the tile entry directly (never through the frozen persistConfig). */
  setLocked: (locked: boolean) => void
}

const Ctx = createContext<ViewEmbedScopeValue | null>(null)
export const ViewEmbedScopeProvider = Ctx.Provider
export const useViewEmbedScope = (): ViewEmbedScopeValue | null => useContext(Ctx)

/** The one view-config writer surfaces call: in scope the write is a payload update
 *  (the sentinel/mint/active-slot machinery never runs) — or a refusal envelope while the
 *  tile is locked; outside, the adopt-and-save path unchanged. The scope's `view` may be
 *  stale mid-gesture, so callers still pass the full next view, exactly as they did to
 *  saveViewAdopting. `viewState` marks a write as how-you're-reading-it rather than config:
 *  it survives the lock, and only then narrows to the state keys — an unlocked write stays whole
 *  so it keeps folding in every sibling override the way every other persist does. */
export function useSaveView(
  source: CollectionNode | SetNode,
  refetch: () => Promise<void>,
): (
  view: SavedView,
  opts?: { skipRefetch?: boolean; viewState?: boolean },
) => Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const scope = useViewEmbedScope()
  if (scope) {
    // An embed re-renders off its own tile payload — persistConfig updates it in place, no refetch path.
    return (view, opts) => {
      if (scope.locked) {
        if (!opts?.viewState)
          return Promise.resolve({ ok: false as const, error: VIEW_CONFIG_LOCKED })
        scope.persistState(pickViewState(view))
        return Promise.resolve({ ok: true as const, id: view.id })
      }
      scope.persistConfig(view)
      return Promise.resolve({ ok: true as const, id: view.id })
    }
  }
  return (view, opts) => saveViewAdopting(source, view, refetch, opts)
}
