import { basename, dirname, titleFromPath, relative, relJoin } from '../Paths/posix'
import { createDisambiguated } from '../Paths/names'
import { ok } from '../Contract/result'
import { mutableTarget } from './liveTree'
import { moveIndexPaths } from '../Index/indexSeed'
import type { MutateReply, MutateRequest } from './mutateRequest'
import type { MutateContext } from './mutate'
import { renamePage } from './page'
import { landingRefusal, renameFolderEntity } from './folderEntity'
import { type CascadeReport, renameCascade } from './cascade'
import { reportRename } from '../Sync/Client/tap'

export async function renameOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'rename' }>,
): Promise<MutateReply> {
  const resolved = await mutableTarget(root, req.path, [req.kind])
  if (!resolved.ok) return resolved
  const abs = resolved.value
  if (req.kind !== 'page') {
    const refused = await landingRefusal(root, dirname(abs), req.newName)
    if (refused) return refused
    const r = await renameFolderEntity(abs, req.newName)
    if (!r.ok) return r
    await moveIndexPaths(root, abs, r.value.path)
    reportRename(relative(root, abs), relative(root, r.value.path))
    return ok({})
  }
  const oldTitle = titleFromPath(abs)
  const relParent = req.path.split('/').slice(0, -1).join('/')
  const renamedReply = (landedPath: string, cascade?: CascadeReport): MutateReply => {
    const file = basename(landedPath)
    return ok({ renamed: { path: relJoin(relParent, file), name: titleFromPath(file) }, cascade })
  }
  if (req.fromCreate) {
    const r = await createDisambiguated(req.newName, (name) => renamePage(abs, name))
    if (!r.ok) return r
    await moveIndexPaths(root, abs, r.value.path)
    return renamedReply(r.value.path)
  }
  const r = await renamePage(abs, req.newName)
  if (!r.ok) return r
  // The index moves first, so the renamed page's own links to its old title are found where it now lives.
  await moveIndexPaths(root, abs, r.value.path)
  reportRename(relative(root, abs), relative(root, r.value.path))
  return renamedReply(r.value.path, await renameCascade(root, oldTitle, { title: req.newName }))
}
