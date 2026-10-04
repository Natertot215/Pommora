import { machine } from '../Platform/machine'
import { liveTreeOf, mutableTarget } from '../Nexus/liveTree'
import { heldKey } from '../Paths/caseFold'
import { writtenRoot } from './governedWrite'
import { governedWorldOf, writeSpaceSidecar } from '../Contexts/contextWrite'
import { spaceWorldOf } from '../Contexts/contextResolve'
import { noShape, updatePageProperty } from '../Nexus/page'
import { ok, type Result } from '../Contract/result'
import type { MutateContext } from '../Nexus/mutate'
import { done, type MutateReply, type MutateRequest } from '../Nexus/mutateRequest'
import type { PropertyDefinition } from './properties'
import { type Adoption, encodeValue, isBlankValue, type PropertyValue } from './propertyValue'
import { applyAdoptions } from './optionOps'
import { readRegistry, NO_PROPERTY } from './propertiesRegistry'

export async function setSpaceProperty(
  root: string,
  absSpaceDir: string,
  def: PropertyDefinition,
  value: PropertyValue | null,
): Promise<Result<null>> {
  const clear = value === null || isBlankValue(value)
  const encoded = clear ? undefined : encodeValue(value)
  if (!clear && encoded === undefined) return noShape(def.name)
  const world = spaceWorldOf(await liveTreeOf(root))
  const adoptions: Adoption[] = []
  const written = await writeSpaceSidecar(absSpaceDir, (raw) =>
    clear && heldKey(raw, def.name) === undefined
      ? null
      : writtenRoot(raw, def.name, encoded, world, adoptions),
  )
  if (written.ok) await applyAdoptions(root, adoptions)
  return written
}

export async function setSpacePropertyOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'setProperty' }>,
): Promise<MutateReply> {
  const resolved = await mutableTarget(root, req.path, ['space'])
  if (!resolved.ok) return resolved
  const def = (await readRegistry(root)).defs[req.propertyId]
  if (!def) return NO_PROPERTY
  return done(await setSpaceProperty(root, resolved.value, def, req.value))
}

export async function setPagePropertyOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'setProperty' }>,
): Promise<MutateReply> {
  const resolved = await mutableTarget(root, req.path, ['page'])
  if (!resolved.ok) return resolved
  // Resolved inside the lock: a rename sweeps under the schema lock, not this one, so a name read before the lock can send the write to a key the sweep has already passed.
  const adoptions = await machine().lock(resolved.value, async () => {
    const def = (await readRegistry(root)).defs[req.propertyId]
    if (!def) return NO_PROPERTY
    return updatePageProperty(
      resolved.value,
      def,
      req.value,
      await governedWorldOf(root, resolved.value),
    )
  })
  if (!adoptions.ok) return adoptions
  await applyAdoptions(root, adoptions.value)
  return ok({})
}
