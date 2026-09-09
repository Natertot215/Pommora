import { machine } from '../Platform/machine'
import { splitFrontmatter } from '../Files/pageFile'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { readTextOrNull } from '../Files/atomicWrite'

import { loadGovernedWorld } from '../Contexts/contextWrite'
import { updatePageProperty } from '../Nexus/page'
import { fail, ok } from '../Contract/result'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
import { applyAdoptions } from './optionOps'
import { readRegistry } from './propertiesRegistry'

export async function setPropertyOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'setProperty' }>,
): Promise<MutateReply> {
  const resolved = await resolveUnderRoot(root, req.path)
  if (!resolved.ok) return resolved
  // Resolved inside the lock: a rename sweeps on its own chain, so a name read before the lock can send the write to a key the sweep has already passed.
  const adoptions = await machine().lock(resolved.value, async () => {
    const def = (await readRegistry(root)).defs[req.propertyId]
    if (!def) return fail('not-found', 'Property not found.')
    const content = await readTextOrNull(resolved.value)
    if (content === null) return fail('not-found', 'That page could not be read.')
    const world = await loadGovernedWorld(root, resolved.value, splitFrontmatter(content))
    const r = await updatePageProperty(root, resolved.value, def, req.value, world)
    return r
  })
  if (!adoptions.ok) return adoptions
  await applyAdoptions(root, adoptions.value)
  return ok({})
}
