import { setOrDrop } from '../Files/atomicWrite'
import { cropKeyFor } from '../Paths/nexusPaths'
import { updateCrops } from '../Settings/settings'
import { fault, ok } from '../Contract/result'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
import { assetFilePath } from './assetRoots'
import { clampZoom } from './cropGeometry'

export async function setCropOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'setCrop' }>,
): Promise<MutateReply> {
  const key = cropKeyFor(await assetFilePath(root, req.image), req.image)
  if (!key) return fault('That image can’t be framed.')
  await updateCrops(root, (b) =>
    setOrDrop(b, key, req.crop && { ...req.crop, zoom: clampZoom(req.crop.zoom) }),
  )
  return ok({})
}
