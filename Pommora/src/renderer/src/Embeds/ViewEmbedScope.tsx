// Inside a view-embed tile, every view-CONFIG write lands on the tile payload (copied, never
// synced) — the source's saved views, active slot, and container config are untouchable from
// scope. Gating is by effect: surfaces write through useSaveView; outside a scope, unchanged.

import { createContext, useContext } from 'react'
import type { CollectionNode, SetNode } from '@shared/types'
import { pickViewState, type SavedView, type ViewState } from '@shared/views'
import { saveViewAdopting } from '@renderer/Detail/Views/viewMint'

/** Surfaces must report this, never swallow it — a write that looked live and silently dropped
 *  is the bug this guards against. */
export const VIEW_CONFIG_LOCKED = 'The view configuration is locked on this embed.'

export interface ViewEmbedScopeValue {
  source: CollectionNode | SetNode
  view: SavedView
  /** Refuses while `locked` — every config surface routes through here, so one gate freezes them all. */
  persistConfig: (next: SavedView) => void
  /** Never lock-gated; writes the state keys alone, so a refused config override can't ride along with it. */
  persistState: (next: ViewState) => void
  locked: boolean
  /** Writes the tile entry directly — never through the frozen persistConfig. */
  setLocked: (locked: boolean) => void
}

const Ctx = createContext<ViewEmbedScopeValue | null>(null)
export const ViewEmbedScopeProvider = Ctx.Provider
export const useViewEmbedScope = (): ViewEmbedScopeValue | null => useContext(Ctx)

/** In scope, the write is a payload update — or a refusal envelope while locked. Callers still
 *  pass the FULL next view (as to saveViewAdopting): the scope's `view` may be stale mid-gesture.
 *  `viewState` survives the lock but narrows to the state keys; an unlocked write stays whole. */
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
