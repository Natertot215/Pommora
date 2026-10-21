import { basename, dirname, join } from '../Paths/posix'
import { ok, type Result } from '../Contract/result'
import { done, type MutateReply, type MutateRequest } from './mutateRequest'
import { CONTAINER_KINDS } from './entities'
import type { MutateContext } from './mutate'
import { movePage } from './page'
import { landingRefusal, moveFolderEntity } from './folderEntity'
import { liveTreeOf, mutableTarget } from './liveTree'
import { archivedSetIds, goneEdit, reachConfig, reachReport } from './configReach'
import { containerAt, owningCollection } from './treePatch'
import { dropDeparture, setChildOrder } from './reorder'
import { archivedWithin } from '../Bundles/bundle'

async function ends(
  root: string,
  { path, newParentPath }: { path: string; newParentPath: string },
  kind: 'page' | 'set',
): Promise<Result<{ src: string; dst: string }>> {
  const src = await mutableTarget(root, path, [kind])
  if (!src.ok) return src
  const dst = await mutableTarget(root, newParentPath, CONTAINER_KINDS)
  if (!dst.ok) return dst
  return ok({ src: src.value, dst: dst.value })
}

export async function movePageOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'movePage' }>,
): Promise<MutateReply> {
  const at = await ends(root, req, 'page')
  if (!at.ok) return at
  if (dirname(at.value.src) === at.value.dst)
    return req.order ? done(await setChildOrder(at.value.dst, 'page_order', req.order)) : ok({})
  const tree = await liveTreeOf(root)
  const r = await movePage(at.value.src, at.value.dst)
  if (!r.ok) return r
  await dropDeparture(root, tree, 'page', req.path)
  if (req.order) await setChildOrder(at.value.dst, 'page_order', req.order)
  return ok({})
}

export async function moveSetOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'moveSet' }>,
): Promise<MutateReply> {
  const at = await ends(root, req, 'set')
  if (!at.ok) return at
  if (dirname(at.value.src) === at.value.dst)
    return done(await setChildOrder(at.value.dst, 'set_order', req.order))
  const refused = await landingRefusal(root, at.value.dst, basename(at.value.src))
  if (refused) return refused
  const from = dirname(req.path).split('/')
  const to = req.newParentPath.split('/')
  const diverge = from.findIndex((seg, i) => seg !== to[i])
  const left = diverge === -1 ? null : from.slice(0, diverge + 1).join('/')
  const held = await liveTreeOf(root)
  const owner = owningCollection(held, req.path)?.id
  const setId = containerAt(held, req.path)?.id
  // What was archived from within it moves with it.
  const within =
    left !== null && owner && setId ? await archivedWithin(root, setId, owner, held) : []
  const archived = await Promise.all(
    within.map(({ bundlePath, record }) =>
      record.entity === 'set' ? archivedSetIds(root, join(root, bundlePath)) : [],
    ),
  )
  const edit = left === null ? null : goneEdit(held, 'set', req.path, archived.flat())
  const r = await moveFolderEntity(root, at.value.src, at.value.dst)
  if (!r.ok) return r
  await dropDeparture(root, held, 'set', req.path)
  await setChildOrder(at.value.dst, 'set_order', req.order)
  const reach = left && edit ? await reachConfig(root, edit, join(root, left)) : null
  return ok(reach ? { cascade: reachReport(reach) } : {})
}
