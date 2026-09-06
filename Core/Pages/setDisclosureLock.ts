import { resolveUnderRoot } from '../Paths/pathSafety'
import { rmwJsonStrict, setOrDrop } from '../Files/atomicWrite'
import { sidecarPath } from '../Paths/paths'
import { ok } from '../Contract/result'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from './mutateRequest'

export async function setDisclosureLockOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'setDisclosureLock' }>,
): Promise<MutateReply> {
  const resolved = await resolveUnderRoot(root, req.path)
  if (!resolved.ok) return resolved
  const written = await rmwJsonStrict(sidecarPath(resolved.value, req.kind), (cur) => {
    if (typeof cur.id !== 'string') throw new Error('That item has no id.')
    return setOrDrop(cur, 'disclosure_locked', req.locked)
  })
  return written.ok ? ok({}) : written
}
