import { basename, dirname, join, titleFromPath, relJoin } from '../Paths/posix'
import { createDisambiguated } from '../Paths/names'
import { ok } from '../Contract/result'
import { mutableTarget } from './liveTree'
import type { MutateReply, MutateRequest } from './mutateRequest'
import type { MutateContext } from './mutate'
import { renamePage } from './page'
import { landingRefusal, renameFolderEntity } from './folderEntity'
import { pathExists } from '../Files/atomicWrite'
import { type CascadeReport, renameCascade } from './cascade'
import { excludedWithin, exclusionWriteRefusal } from '../Settings/settings'
import { titleHeldOutside } from './heldPages'

export async function renameOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'rename' }>,
): Promise<MutateReply> {
  const resolved = await mutableTarget(root, req.path, [req.kind])
  if (!resolved.ok) return resolved
  const abs = resolved.value
  if (req.kind !== 'page') {
    const refused =
      (await landingRefusal(root, dirname(abs), req.newName)) ??
      (await exclusionWriteRefusal(root, await excludedWithin(root, req.path)))
    if (refused) return refused
    const r = await renameFolderEntity(root, abs, req.newName)
    return r.ok ? ok({}) : r
  }
  const oldTitle = titleFromPath(abs)
  const relParent = req.path.split('/').slice(0, -1).join('/')
  const renamedReply = (landedPath: string, cascade?: CascadeReport): MutateReply => {
    const file = basename(landedPath)
    return ok({ renamed: { path: relJoin(relParent, file), name: titleFromPath(file) }, cascade })
  }
  if (req.fromCreate) {
    const r = await createDisambiguated(
      req.newName,
      (name) => renamePage(abs, name),
      (name) => pathExists(join(dirname(abs), `${name}.md`)),
    )
    if (!r.ok) return r
    return renamedReply(r.value.path)
  }
  const heldOutside = titleHeldOutside(root, oldTitle, req.path)
  const r = await renamePage(abs, req.newName)
  if (!r.ok) return r
  if (heldOutside) return renamedReply(r.value.path)
  return renamedReply(r.value.path, await renameCascade(root, oldTitle, { title: req.newName }))
}
