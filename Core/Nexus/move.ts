import { basename, relative } from '../Paths/posix'
import { ok, type Result } from '../Contract/result'
import { moveIndexPaths } from '../Index/indexSeed'
import type { MutateReply, MutateRequest } from './mutateRequest'
import type { MutateContext } from './mutate'
import { movePage } from './page'
import { landingRefusal, moveFolderEntity } from './folderEntity'
import { CONTAINER_KINDS, mutableTarget } from './liveTree'
import { setChildOrder } from './reorder'
import { noteValueWrite } from './valuesChanged'
import { reportRename } from '../Sync/Client/tap'

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
  const r = await movePage(at.value.src, at.value.dst)
  if (!r.ok) return r
  if (req.order) await setChildOrder(at.value.dst, 'page_order', req.order)
  await moveIndexPaths(root, at.value.src, r.value.path)
  reportRename(relative(root, at.value.src), relative(root, r.value.path))
  noteValueWrite(root, r.value.path)
  return ok({})
}

export async function moveSetOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'moveSet' }>,
): Promise<MutateReply> {
  const at = await ends(root, req, 'set')
  if (!at.ok) return at
  const refused = await landingRefusal(root, at.value.dst, basename(at.value.src))
  if (refused) return refused
  const r = await moveFolderEntity(at.value.src, at.value.dst)
  if (!r.ok) return r
  await setChildOrder(at.value.dst, 'set_order', req.order)
  await moveIndexPaths(root, at.value.src, r.value.path)
  reportRename(relative(root, at.value.src), relative(root, r.value.path))
  noteValueWrite(root, r.value.path)
  return ok({})
}
