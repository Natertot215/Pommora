import type { MutateContext } from '../Nexus/mutate'
import { done, type MutateReply, type MutateRequest } from '../Nexus/mutateRequest'
import { resolveRowOrder } from '@pommora/uix/Utilities/moveItem'
import { mutateRegistryFile } from './contextsRegistry'

export async function reorderContextsOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'reorderContexts' }>,
): Promise<MutateReply> {
  const r = await mutateRegistryFile(root, (cur) => ({
    contexts: resolveRowOrder(cur.contexts, (c) => c.id, req.ids),
  }))
  return done(r)
}
