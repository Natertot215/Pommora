import { basename, titleFromPath, relative, relJoin } from '../Paths/posix'
import { isReserved, resolveUnderRoot } from '../Paths/pathSafety'
import { createDisambiguated } from '../Paths/names'
import { errText, fault, ok } from '../Contract/result'
import { moveIndexPaths } from '../Index/indexSeed'
import type { MutateReply, MutateRequest } from './mutateRequest'
import type { MutateContext } from './mutate'
import { renamePage } from './page'
import { renameFolderEntity } from './folderEntity'
import { type CascadeReport, renameCascade } from './cascade'
import { reportRename } from '../Sync/Client/tap'

export async function renameOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'rename' }>,
): Promise<MutateReply> {
  const resolved = await resolveUnderRoot(root, req.path)
  if (!resolved.ok) return resolved
  const abs = resolved.value
  if (await isReserved(root, abs)) return fault('That item can’t be renamed.')
  if (req.kind !== 'page') {
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
  const cascade = await renameCascade(root, oldTitle, { title: req.newName }).catch(
    (e): CascadeReport => ({
      pages: [],
      hosts: [],
      warning: `Links to “${oldTitle}” weren't updated: ${errText(e)}`,
    }),
  )
  return renamedReply(r.value.path, cascade)
}
