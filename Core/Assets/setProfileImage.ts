import { setOrDrop } from '../Files/atomicWrite'
import { updateSettings } from '../Settings/settings'
import { ok } from '../Contract/result'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
import { adoptImageSource } from './adoptFile'

export async function setProfileImageOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'setProfileImage' }>,
): Promise<MutateReply> {
  const adopted = req.source ? await adoptImageSource(root, req.source) : ok(null)
  if (!adopted.ok) return adopted
  await updateSettings(root, (cur) => setOrDrop(cur, 'profile_image', adopted.value))
  return ok(adopted.value ? { adopted: adopted.value } : {})
}
