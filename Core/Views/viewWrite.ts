import type { CollectionNode, SetNode } from '../Nexus/tree'
import { ok, type Result, fault } from '../Contract/result'
import { pickViewState, type SavedView, type ViewPatch } from './views'
import { stageView, unstageView } from './Host/pendingView'
import { useViewTileScope, type ViewTileScopeValue } from './ViewTileScope'
import { reportRefusal } from '../Interface/Notifications/notifications'
import { dialer } from '../Platform/dialer'

export const VIEW_CONFIG_LOCKED = 'The view configuration is locked on this embed.'

/** A locked tile refuses a config write but still folds a state-only one, so a refused config override can't ride in on the state it's allowed. */
export function resolveViewWrite(
  locked: boolean,
  patch: ViewPatch,
  opts?: { viewState?: boolean },
): ViewPatch | null {
  if (!locked) return patch
  return opts?.viewState ? pickViewState(patch) : null
}

/** A refusal reaches the user here, so no caller reports it again. */
export async function saveViewIn(
  scope: ViewTileScopeValue | null,
  source: CollectionNode | SetNode,
  view: SavedView,
  patch: ViewPatch,
  opts?: { viewState?: boolean },
): Promise<Result<{ id: string }>> {
  const r = await writeView(scope, source, view, patch, opts)
  reportRefusal(r)
  return r
}

async function writeView(
  scope: ViewTileScopeValue | null,
  source: CollectionNode | SetNode,
  view: SavedView,
  patch: ViewPatch,
  opts?: { viewState?: boolean },
): Promise<Result<{ id: string }>> {
  if (!scope) {
    const base = stageView(source.id, view, patch)
    const r = await dialer().ask('views:save', source.path, source.kind, base, patch)
    if (!r.ok) unstageView(source.id, view.id, patch)
    return r
  }
  const write = resolveViewWrite(scope.locked, patch, opts)
  if (!write) return fault(VIEW_CONFIG_LOCKED)
  stageView(source.id, view, write)
  scope.persist(write)
  return ok({ id: view.id })
}

export function useSaveView(
  source: CollectionNode | SetNode,
): (
  view: SavedView,
  patch: ViewPatch,
  opts?: { viewState?: boolean },
) => Promise<Result<{ id: string }>> {
  const scope = useViewTileScope()
  return (view, patch, opts) => saveViewIn(scope, source, view, patch, opts)
}
