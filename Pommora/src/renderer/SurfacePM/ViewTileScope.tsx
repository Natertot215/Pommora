// Inside a view-embed tile, every view-CONFIG write lands on the tile payload (copied, never
// synced) — the source's saved views, active slot, and container config are untouchable from
// scope. Gating is by effect: surfaces write through useSaveView; outside a scope, unchanged.

import { createContext, useContext } from 'react'
import type { CollectionNode, SetNode } from '@shared/types'
import { fail, ok, type Result } from '@shared/result'
import { pickViewState, type SavedView, type ViewState } from '@shared/views'
import { saveViewAdopting } from '@renderer/Views/viewMint'

/** Surfaces must report this, never swallow it — a write that looked live and silently dropped
 *  is the bug this guards against. */
export const VIEW_CONFIG_LOCKED = 'The view configuration is locked on this embed.'

export interface ViewTileScopeValue {
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

const Ctx = createContext<ViewTileScopeValue | null>(null)
export const ViewTileScopeProvider = Ctx.Provider
export const useViewTileScope = (): ViewTileScopeValue | null => useContext(Ctx)

export type ViewWrite =
  | { kind: 'config'; view: SavedView }
  | { kind: 'state'; state: ViewState }
  | { kind: 'refused' }

/** THE lock-write rule for a view tile, in one place: unlocked writes the whole view; a locked tile
 *  refuses a config write but still folds a state-only one (`opts.viewState`), so a refused config
 *  override can't ride in on the state it's allowed. Both the scope's `useSaveView` and the tile's own
 *  config edits route through this — the gate is defined once, not re-checked against the raw entry. */
export function resolveViewWrite(
  locked: boolean,
  view: SavedView,
  opts?: { viewState?: boolean },
): ViewWrite {
  if (!locked) return { kind: 'config', view }
  if (opts?.viewState) return { kind: 'state', state: pickViewState(view) }
  return { kind: 'refused' }
}

/** In scope, the write is a payload update — or a refusal envelope while locked. Callers still
 *  pass the FULL next view (as to saveViewAdopting): the scope's `view` may be stale mid-gesture. */
export function useSaveView(
  source: CollectionNode | SetNode,
): (view: SavedView, opts?: { viewState?: boolean }) => Promise<Result<{ id: string }>> {
  const scope = useViewTileScope()
  if (scope) {
    return (view, opts) => {
      const write = resolveViewWrite(scope.locked, view, opts)
      if (write.kind === 'refused')
        return Promise.resolve(fail('operation-failed', VIEW_CONFIG_LOCKED))
      if (write.kind === 'state') scope.persistState(write.state)
      else scope.persistConfig(write.view)
      return Promise.resolve(ok({ id: view.id }))
    }
  }
  return (view) => saveViewAdopting(source, view)
}
