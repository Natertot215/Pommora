import { machine } from '../Platform/machine'
import { liveTreeOf, mutableTarget } from '../Nexus/liveTree'
import { pageWorldOf, spaceWorldOf, writeGovernedKey } from '../Nexus/governedRoot'
import type { MutateContext } from '../Nexus/mutate'
import { type MutateReply, type MutateRequest, undoOf } from '../Nexus/mutateRequest'
import { valueToWrite } from './propertyValue'
import { readRegistry, NO_PROPERTY } from './propertiesRegistry'

type ValueRequest = Extract<MutateRequest, { op: 'setProperty' }>

export async function setSpacePropertyOp(
  { root }: MutateContext,
  req: ValueRequest,
): Promise<MutateReply> {
  const resolved = await mutableTarget(root, req.path, ['space'])
  if (!resolved.ok) return resolved
  const def = (await readRegistry(root)).defs[req.propertyId]
  if (!def) return NO_PROPERTY
  const value = valueToWrite(def, req.value)
  if (!value.ok) return value
  const world = spaceWorldOf(await liveTreeOf(root))
  const was = await writeGovernedKey(resolved.value, def.key, value.value, world)
  return was.ok ? undoOf([{ file: req.path, fieldId: def.id, ...was.value }]) : was
}

export async function setPagePropertyOp(
  { root }: MutateContext,
  req: ValueRequest,
): Promise<MutateReply> {
  const resolved = await mutableTarget(root, req.path, ['page'])
  if (!resolved.ok) return resolved
  // Resolved inside the lock: a rename sweeps under the schema lock, not this one, so a name read before the lock can send the write to a key the sweep has already passed.
  return machine().lock(resolved.value, async () => {
    const def = (await readRegistry(root)).defs[req.propertyId]
    if (!def) return NO_PROPERTY
    const value = valueToWrite(def, req.value)
    if (!value.ok) return value
    const world = await pageWorldOf(root, resolved.value)
    const was = await writeGovernedKey(resolved.value, def.key, value.value, world)
    return was.ok ? undoOf([{ file: req.path, fieldId: def.id, ...was.value }]) : was
  })
}
