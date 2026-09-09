import { ok } from '../Contract/result'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
import { mutateRegistryFile } from './contextsRegistry'

export async function reorderContextsOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'reorderContexts' }>,
): Promise<MutateReply> {
  const r = await mutateRegistryFile(root, (cur) => {
    const byId = new Map(cur.contexts.map((c) => [c.id, c]))
    const ordered = req.ids.map((id) => byId.get(id)).filter((c) => c !== undefined)
    const rest = cur.contexts.filter((c) => !req.ids.includes(c.id))
    return { contexts: [...ordered, ...rest] }
  })
  return r.ok ? ok({}) : r
}
