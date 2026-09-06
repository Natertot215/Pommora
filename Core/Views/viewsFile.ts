// A freshly-minted default view arrives with the `view_default` sentinel id; saveView swaps it for a real `view_<ulid>` here (shared/ can't mint ids).

import { readContainerSidecar, type ContainerKind } from '../Nexus/schemas'
import { DEFAULT_VIEW_ID, VIEW_ID_PREFIX, type SavedView } from './views'
import { ok, fail, type Result } from '../Contract/result'
import { newId } from '../Nexus/ids'
import { writeSidecar, withSidecarLock } from '../Files/sidecar'

const viewsOf = (sidecar: { views?: SavedView[] }): SavedView[] => sidecar.views ?? []

export function saveView(
  folder: string,
  kind: ContainerKind,
  view: SavedView,
): Promise<Result<{ id: string }>> {
  return withSidecarLock(folder, kind, async () => {
    const sidecar = await readContainerSidecar(folder, kind)
    if (sidecar === null) return fail('not-found', 'Container sidecar not found.')
    const id = view.id === DEFAULT_VIEW_ID ? `${VIEW_ID_PREFIX}${newId()}` : view.id
    const finalView: SavedView = { ...view, id }
    const views = [...viewsOf(sidecar)]
    const idx = views.findIndex((v) => v.id === id)
    if (idx >= 0) views[idx] = finalView
    else views.push(finalView)
    await writeSidecar(folder, kind, { ...sidecar, views })
    return ok({ id })
  })
}

export function reorderViews(
  folder: string,
  kind: ContainerKind,
  orderedIds: string[],
): Promise<Result<null>> {
  return withSidecarLock(folder, kind, async () => {
    const sidecar = await readContainerSidecar(folder, kind)
    if (sidecar === null) return fail('not-found', 'Container sidecar not found.')
    const views = viewsOf(sidecar)
    const byId = new Map(views.map((v) => [v.id, v]))
    const named = new Set(orderedIds)
    const reordered: SavedView[] = [
      ...orderedIds.map((id) => byId.get(id)).filter((v): v is SavedView => v !== undefined),
      ...views.filter((v) => !named.has(v.id)),
    ]
    await writeSidecar(folder, kind, { ...sidecar, views: reordered })
    return ok(null)
  })
}

export function deleteView(
  folder: string,
  kind: ContainerKind,
  viewId: string,
): Promise<Result<null>> {
  return withSidecarLock(folder, kind, async () => {
    const sidecar = await readContainerSidecar(folder, kind)
    if (sidecar === null) return fail('not-found', 'Container sidecar not found.')
    const views = viewsOf(sidecar)
    if (views.length <= 1) return fail('operation-failed', 'Cannot delete the last view.')
    const next = views.filter((v) => v.id !== viewId)
    if (next.length === views.length) return fail('not-found', 'View not found.')
    await writeSidecar(folder, kind, { ...sidecar, views: next })
    return ok(null)
  })
}
