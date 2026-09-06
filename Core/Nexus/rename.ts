import { basename, relJoin } from '../Locations/posix'
import { basenameNoMd } from '../Locations/coerce'
import { isReserved, resolveUnderRoot } from '../Locations/pathSafety'
import { createDisambiguated } from '../Locations/disambiguate'
import { fault, ok } from '../Contract/result'
import { moveIndexPaths } from '../Index/indexSeed'
import { rewriteTileConnections } from '../Tiles/tilesFile'
import type { MutateReply, MutateRequest } from '../Pages/mutateRequest'
import type { MutateContext } from './mutate'
import { renamePage } from './page'
import { renameFolderEntity } from './folderEntity'
import { renameCascade } from './cascade'

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
    return ok({})
  }
  const oldTitle = basenameNoMd(basename(abs))
  const relParent = req.path.split('/').slice(0, -1).join('/')
  const renamedReply = (landedPath: string): MutateReply => {
    const file = basename(landedPath)
    return ok({ renamed: { path: relJoin(relParent, file), name: basenameNoMd(file) } })
  }
  if (req.fromCreate) {
    const r = await createDisambiguated(req.newName, (name) => renamePage(abs, name))
    if (!r.ok) return r
    await moveIndexPaths(root, abs, r.value.path)
    return renamedReply(r.value.path)
  }
  const r = await renamePage(abs, req.newName)
  if (!r.ok) return r
  try {
    const cascade = await renameCascade(root, oldTitle, req.newName)
    if (!cascade.ok) {
      await renamePage(r.value.path, oldTitle)
      return cascade
    }
  } catch {
    await renamePage(r.value.path, oldTitle)
    return fault('Rename cascade failed; the rename was reverted.')
  }
  try {
    await rewriteTileConnections(root, oldTitle, req.newName)
  } catch {}
  await moveIndexPaths(root, abs, r.value.path)
  return renamedReply(r.value.path)
}
