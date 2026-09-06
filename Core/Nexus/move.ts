import { dirname } from '../Paths/posix'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { fail, ok, type Result } from '../Contract/result'
import { moveIndexPaths } from '../Index/indexSeed'
import type { MutateReply, MutateRequest } from '../Pages/mutateRequest'
import type { MutateContext } from './mutate'
import { movePage } from './page'
import { moveFolderEntity } from './folderEntity'
import { resolveFolderKind } from './folderKind'
import { setChildOrder } from './reorder'
import { noteValueWrite } from './valuesChanged'

async function movesInto(root: string, dst: string): Promise<Result<null>> {
  const depth = dirname(dst) === root ? 'root' : 'nested'
  const kind = await resolveFolderKind(dst, depth, { agenda: {}, homed: new Set(), root })
  return kind === 'collection' || kind === 'set'
    ? ok(null)
    : fail('invalid-path', 'Pages live in Collections and Sets.')
}

async function ends(
  root: string,
  path: string,
  newParentPath: string,
): Promise<Result<{ src: string; dst: string }>> {
  const src = await resolveUnderRoot(root, path)
  if (!src.ok) return src
  const dst = await resolveUnderRoot(root, newParentPath)
  if (!dst.ok) return dst
  const destOk = await movesInto(root, dst.value)
  if (!destOk.ok) return destOk
  return ok({ src: src.value, dst: dst.value })
}

export async function movePageOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'movePage' }>,
): Promise<MutateReply> {
  const at = await ends(root, req.path, req.newParentPath)
  if (!at.ok) return at
  const r = await movePage(at.value.src, at.value.dst)
  if (!r.ok) return r
  if (req.order) await setChildOrder(at.value.dst, 'page_order', req.order)
  await moveIndexPaths(root, at.value.src, r.value.path)
  noteValueWrite(root, r.value.path)
  return ok({})
}

export async function moveSetOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'moveSet' }>,
): Promise<MutateReply> {
  const at = await ends(root, req.path, req.newParentPath)
  if (!at.ok) return at
  const r = await moveFolderEntity(at.value.src, at.value.dst)
  if (!r.ok) return r
  await setChildOrder(at.value.dst, 'set_order', req.order)
  await moveIndexPaths(root, at.value.src, r.value.path)
  noteValueWrite(root, r.value.path)
  return ok({})
}
