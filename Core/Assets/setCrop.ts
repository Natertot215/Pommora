import { setOrDrop } from '../Files/atomicWrite'
import { cropKeyFor } from '../Paths/nexusPaths'
import { updateCrops } from '../Settings/settings'
import { fault, ok } from '../Contract/result'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
import { assetFilePath } from './assetRoots'

export async function setCropOp(
  root: string,
  req: Extract<MutateRequest, { op: 'setCrop' }>,
): Promise<MutateReply> {
  const key = cropKeyFor(await assetFilePath(root, req.image), req.image)
  if (!key) return fault('That image can’t be framed.')
  await updateCrops(root, (b) => setOrDrop(b, key, req.crop))
  return ok({})
}
