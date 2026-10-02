import { expect } from 'vitest'
import { getLiveTree } from '../Nexus/liveTree'
import { handleMutate } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
import { readNexus } from '../Nexus/readNexus'
import { flush } from '../Nexus/settle'
import { stabilize } from '../Nexus/treeStabilize'
import type { TrashDeps } from '../Trash/bundle'

const QUIET = { push: () => {}, watch: async () => {} }

/** A mutation as the host runs one: the write, whose events land as it goes, then the settle. The held tree must then be what a fresh read of the disk answers, which proves every arm the operation reached. */
export async function settledMutate(
  root: string,
  req: MutateRequest,
  deps: TrashDeps,
): Promise<MutateReply> {
  const reply = await handleMutate(root, req, deps)
  await flush(QUIET, root)
  const held = getLiveTree()
  if (held) expect(stabilize(await readNexus(root), held)).toBe(held)
  return reply
}
