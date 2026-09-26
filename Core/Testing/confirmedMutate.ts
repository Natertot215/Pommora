import { handleMutate } from '../Nexus/mutate'
import { confirmBy, confirmMutation } from '../Nexus/mutatePatch'
import { seedContentIndex } from '../Index/indexSeed'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
import type { TrashDeps } from '../Trash/bundle'

/** A mutation as the host runs one: the write, then the confirm that brings the held tree up to it — a rescope walks and reseeds. */
export async function confirmedMutate(
  root: string,
  req: MutateRequest,
  deps: TrashDeps,
): Promise<MutateReply> {
  const reply = await handleMutate(root, req, deps)
  if (!reply.ok) return reply
  if (!reply.value.rescope) await confirmMutation(root, req, reply.value)
  else {
    await confirmBy(root, async () => 'refresh')
    await seedContentIndex(root)
  }
  return reply
}
