// Inside a view tile every view-config write lands on the tile payload, never on the source.

import { createContext, useContext } from 'react'
import type { CollectionNode, SetNode } from '@shared/types'
import { fail, ok, type Result } from '@shared/result'
import { pickViewState, type SavedView, type ViewState } from '@shared/views'
import { saveViewAdopting } from '@renderer/Views/viewMint'

export const VIEW_CONFIG_LOCKED = 'The view configuration is locked on this embed.'

export interface ViewTileScopeValue {
  source: CollectionNode | SetNode
  view: SavedView
  persistConfig: (next: SavedView) => void
  persistState: (next: ViewState) => void
  locked: boolean
  setLocked: (locked: boolean) => void
}

const Ctx = createContext<ViewTileScopeValue | null>(null)
export const ViewTileScopeProvider = Ctx.Provider
export const useViewTileScope = (): ViewTileScopeValue | null => useContext(Ctx)

export type ViewWrite =
  | { kind: 'config'; view: SavedView }
  | { kind: 'state'; state: ViewState }
  | { kind: 'refused' }

/** A locked tile refuses a config write but still folds a state-only one, so a refused config
 *  override can't ride in on the state it's allowed. */
export function resolveViewWrite(
  locked: boolean,
  view: SavedView,
  opts?: { viewState?: boolean },
): ViewWrite {
  if (!locked) return { kind: 'config', view }
  if (opts?.viewState) return { kind: 'state', state: pickViewState(view) }
  return { kind: 'refused' }
}

/** Callers pass the full next view: the scope's `view` may be stale mid-gesture. */
export function useSaveView(
  source: CollectionNode | SetNode,
): (view: SavedView, opts?: { viewState?: boolean }) => Promise<Result<{ id: string }>> {
  const scope = useViewTileScope()
  return (view, opts) => {
    if (!scope) return saveViewAdopting(source, view)
    const write = resolveViewWrite(scope.locked, view, opts)
    if (write.kind === 'refused')
      return Promise.resolve(fail('operation-failed', VIEW_CONFIG_LOCKED))
    if (write.kind === 'state') scope.persistState(write.state)
    else scope.persistConfig(write.view)
    return Promise.resolve(ok({ id: view.id }))
  }
}
