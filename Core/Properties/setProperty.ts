import { machine } from '../Platform/machine'
import { mutableTarget } from '../Nexus/liveTree'
import { readTextOrNull } from '../Files/atomicWrite'

import { isMarkdownFile } from '../Paths/posix'
import { governedWorldOf, writeSpaceSidecar } from '../Contexts/contextWrite'
import { noShape, updatePageProperty } from '../Nexus/page'
import { fail, ok, type Result } from '../Contract/result'
import type { MutateContext } from '../Nexus/mutate'
import { done, type MutateReply, type MutateRequest } from '../Nexus/mutateRequest'
import type { PropertyDefinition } from './properties'
import { encodeValue, isBlankValue, type PropertyValue } from './propertyValue'
import { applyAdoptions } from './optionOps'
import { readRegistry, NO_PROPERTY } from './propertiesRegistry'

export function setSpaceProperty(
  absSpaceDir: string,
  def: PropertyDefinition,
  value: PropertyValue | null,
): Promise<Result<null>> {
  const clear = value === null || isBlankValue(value)
  const encoded = clear ? undefined : encodeValue(value)
  if (!clear && encoded === undefined) return Promise.resolve(noShape(def.name))
  return writeSpaceSidecar(absSpaceDir, (raw) => {
    if (clear && !(def.name in raw)) return null
    const next = { ...raw }
    if (clear) delete next[def.name]
    else next[def.name] = encoded
    return next
  })
}

export async function setPropertyOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'setProperty' }>,
): Promise<MutateReply> {
  const resolved = await mutableTarget(root, req.path, ['page', 'space'])
  if (!resolved.ok) return resolved
  if (!isMarkdownFile(req.path)) {
    const def = (await readRegistry(root)).defs[req.propertyId]
    if (!def) return NO_PROPERTY
    const written = await setSpaceProperty(resolved.value, def, req.value)
    return done(written)
  }
  // Resolved inside the lock: a rename sweeps on its own chain, so a name read before the lock can send the write to a key the sweep has already passed.
  const adoptions = await machine().lock(resolved.value, async () => {
    const def = (await readRegistry(root)).defs[req.propertyId]
    if (!def) return NO_PROPERTY
    const content = await readTextOrNull(resolved.value)
    if (content === null) return fail('not-found', 'That page could not be read.')
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
