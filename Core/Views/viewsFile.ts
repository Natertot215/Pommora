// A freshly-minted default view arrives with the `view_default` sentinel id; saveView swaps it for a real `view_<ulid>` here (shared/ can't mint ids).

import type { ContainerKind } from '../Nexus/schemas'
import { DEFAULT_VIEW_ID, VIEW_ID_PREFIX, type SavedView } from './views'
import { ok, fail, type Result } from '../Contract/result'
import { newId } from '../Nexus/ids'
import { setOrDrop } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { isPlainObject } from '../Properties/propertyValue'

const viewsOf = (raw: Record<string, unknown>): unknown[] =>
  Array.isArray(raw.views) ? raw.views : []

const idOf = (v: unknown): unknown => (isPlainObject(v) ? v.id : undefined)

export async function saveView(
  folder: string,
  kind: ContainerKind,
  view: SavedView,
): Promise<Result<{ id: string }>> {
  const id = view.id === DEFAULT_VIEW_ID ? `${VIEW_ID_PREFIX}${newId()}` : view.id
  const finalView: SavedView = { ...view, id }
  const written = await patchSidecar(folder, kind, (cur) => {
    const views = viewsOf(cur)
    return {
      ...cur,
      views: views.some((v) => idOf(v) === id)
        ? views.map((v) => (idOf(v) === id ? finalView : v))
        : [...views, finalView],
    }
  })
  return written.ok ? ok({ id }) : written
}

export async function reorderViews(
  folder: string,
  kind: ContainerKind,
  orderedIds: string[],
): Promise<Result<null>> {
  const written = await patchSidecar(folder, kind, (cur) => {
    const views = viewsOf(cur)
    const rank = (v: unknown): number => {
      const at = orderedIds.indexOf(idOf(v) as string)
      return at < 0 ? orderedIds.length : at
    }
    return { ...cur, views: [...views].sort((a, b) => rank(a) - rank(b)) }
  })
  return written.ok ? ok(null) : written
}

export async function deleteView(
  folder: string,
  kind: ContainerKind,
  viewId: string,
): Promise<Result<null>> {
  const written = await patchSidecar(folder, kind, (cur, refuse) => {
    const views = viewsOf(cur)
    if (views.length <= 1) return refuse(fail('operation-failed', 'Cannot delete the last view.'))
    const next = views.filter((v) => idOf(v) !== viewId)
    if (next.length === views.length) return refuse(fail('not-found', 'View not found.'))
    // A sidecar naming a view that is gone is legible nonsense; the absent key is the container's "no choice made", which pickView already reads.
    return setOrDrop(
      { ...cur, views: next },
      'active_view',
      cur.active_view === viewId ? null : cur.active_view,
    )
  })
  return written.ok ? ok(null) : written
}
