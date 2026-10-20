import { dirname, join } from '../Paths/posix'
import { createDisambiguated } from '../Paths/names'
import { ok } from '../Contract/result'
import { mutableTarget } from './liveTree'
import type { MutateReply, MutateRequest } from './mutateRequest'
import type { MutateContext } from './mutate'
import { renamePage } from './page'
import { landingRefusal, renameFolderEntity } from './folderEntity'
import { pathExists } from '../Files/atomicWrite'

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
    const r = await renameFolderEntity(root, abs, req.newName)
    return r.ok ? ok({}) : r
  }
  const r = req.fromCreate
    ? await createDisambiguated(
        req.newName,
        (name) => renamePage(abs, name),
        (name) => pathExists(join(dirname(abs), `${name}.md`)),
      )
    : await renamePage(abs, req.newName)
  return r.ok ? ok({}) : r
}
