import { readJsonObject, setOrDrop } from '../Files/atomicWrite'
import { nexusConfig, NEXUS_CONFIG_FILES } from '../Paths/paths'
import { updateSettings } from '../Settings/settings'
import { ok } from '../Contract/result'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
import { adoptImageSource, dropReplacedAsset } from './adoptFile'
import { assetFileToDelete } from './assetRoots'

export async function setProfileImageOp(
  { root, deps }: MutateContext,
  req: Extract<MutateRequest, { op: 'setProfileImage' }>,
): Promise<MutateReply> {
  const existing = await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))
  const prev = await assetFileToDelete(root, existing?.profile_image)
  const adopted = req.source ? await adoptImageSource(root, req.source) : ok(null)
  if (!adopted.ok) return adopted
  // Field first, then the replaced file: a failed write never points at a deleted file.
  await updateSettings(root, (cur) => setOrDrop(cur, 'profile_image', adopted.value))
  await dropReplacedAsset(root, prev, adopted.value, deps.trashToSystem)
  return ok(adopted.value ? { adopted: adopted.value } : {})
}
