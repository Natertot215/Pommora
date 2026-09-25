import { isPlainObject } from '../Contract/validators'
import type { ContainerKind } from '../Nexus/schemas'
import {
  containerViewIds,
  DEFAULT_VIEW_ID,
  mergeViewEdit,
  mintViewId,
  ownsViewId,
  savedView,
  type SavedView,
} from './views'
import { ok, fail, type Result, fault } from '../Contract/result'
import { readJsonObject, setOrDrop } from '../Files/atomicWrite'
import { patchSidecar, type Refuse } from '../Files/sidecar'
import type { Json } from '../Files/stableJson'
import { freeName } from '../Paths/names'
import { sidecarPath } from '../Paths/paths'

interface ViewsDoc {
  cur: Json
  views: unknown[]
  ids: string[]
  resolve: (id: string) => string
}

// The positional ids each container's repairs replaced, so a write still in flight under one lands on the view it named.
const repaired = new Map<string, Map<string, string>>()

const answering = (
  read: string[],
  ids: string[],
  minted: Map<string, string> | undefined,
  id: string,
): string => {
  const at = read.indexOf(id)
  return at >= 0 ? ids[at] : (minted?.get(id) ?? id)
}

// Every write first mints an id for each shown view still answering to a positional one, so a positional id never reaches the file; `resolve` carries a caller's id across the repair, and the selection follows it.
function patchViews(
  folder: string,
  kind: ContainerKind,
  fn: (doc: ViewsDoc, refuse: Refuse) => Json | null,
): Promise<Result<Json>> {
  return patchSidecar(folder, kind, (raw, refuse) => {
    const views = Array.isArray(raw.views) ? [...raw.views] : []
    const read = containerViewIds(views)
    const ids = [...read]
    const minted = repaired.get(folder) ?? new Map<string, string>()
    views.forEach((v, i) => {
      if (!isPlainObject(v) || ownsViewId(v.id, read[i])) return
      ids[i] = mintViewId()
      minted.set(read[i], ids[i])
      views[i] = { ...v, id: ids[i] }
    })
    if (minted.size > 0) repaired.set(folder, minted)
    const resolve = (id: string): string => answering(read, ids, minted, id)
    const cur: Json = { ...raw, views }
    if (typeof raw.active_view === 'string') cur.active_view = resolve(raw.active_view)
    return fn({ cur, views, ids, resolve }, refuse)
  })
}

export async function saveView(
  folder: string,
  kind: ContainerKind,
  view: SavedView,
): Promise<Result<{ id: string }>> {
  let id = view.id
  const written = await patchViews(folder, kind, ({ cur, views, ids, resolve }) => {
    const at = ids.indexOf(resolve(view.id))
    id = at >= 0 ? ids[at] : view.id === DEFAULT_VIEW_ID ? mintViewId() : resolve(view.id)
    const finalView: SavedView = { ...view, id }
    if (at < 0) views.push(finalView)
    else views[at] = mergeViewEdit(views[at], finalView)
    return { ...cur, views }
  })
  return written.ok ? ok({ id }) : written
}

/** A copy starts from the stored view, so what this build doesn't read is copied too; it lands right after its original. */
export async function duplicateView(
  folder: string,
  kind: ContainerKind,
  viewId: string,
): Promise<Result<null>> {
  const written = await patchViews(folder, kind, ({ cur, views, ids, resolve }, refuse) => {
    const at = ids.indexOf(resolve(viewId))
    const src = views[at]
    if (!isPlainObject(src)) return refuse(fail('not-found', 'View not found.'))
    const names = views.map((v) => savedView.safeParse(v).data?.name ?? '')
    views.splice(at + 1, 0, { ...src, id: mintViewId(), name: freeName(names[at], names) })
    return { ...cur, views }
  })
  return written.ok ? ok(null) : written
}

export async function readStoredView(
  folder: string,
  kind: ContainerKind,
  viewId: string,
): Promise<Json | null> {
  const raw = await readJsonObject(sidecarPath(folder, kind))
  const views = Array.isArray(raw?.views) ? raw.views : []
  const ids = containerViewIds(views)
  const view = views[ids.indexOf(answering(ids, ids, repaired.get(folder), viewId))]
  return isPlainObject(view) ? view : null
}

export async function setActiveView(
  folder: string,
  kind: ContainerKind,
  viewId: string,
): Promise<Result<Json>> {
  return patchViews(folder, kind, ({ cur, resolve }) =>
    setOrDrop(cur, 'active_view', resolve(viewId)),
  )
}

export async function reorderViews(
  folder: string,
  kind: ContainerKind,
  orderedIds: string[],
): Promise<Result<null>> {
  const written = await patchViews(folder, kind, ({ cur, views, ids, resolve }) => {
    const wanted = orderedIds.map(resolve)
    const rank = (i: number): number => {
      const at = wanted.indexOf(ids[i])
      return at < 0 ? wanted.length : at
    }
    const order = views.map((_, i) => i).sort((a, b) => rank(a) - rank(b))
    return { ...cur, views: order.map((i) => views[i]) }
  })
  return written.ok ? ok(null) : written
}

export async function deleteView(
  folder: string,
  kind: ContainerKind,
  viewId: string,
): Promise<Result<null>> {
  const written = await patchViews(folder, kind, ({ cur, views, ids, resolve }, refuse) => {
    if (views.length <= 1) return refuse(fault('Cannot delete the last view.'))
    const at = ids.indexOf(resolve(viewId))
    if (at < 0) return refuse(fail('not-found', 'View not found.'))
    views.splice(at, 1)
    // A sidecar naming a view that is gone is legible nonsense; the absent key is the container's "no choice made", which pickView already reads.
    return setOrDrop(
      { ...cur, views },
      'active_view',
      cur.active_view === ids[at] ? null : cur.active_view,
    )
  })
  return written.ok ? ok(null) : written
}
