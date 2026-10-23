import { machine } from '../Platform/machine'
import { liveTreeOf, mutableTarget } from '../Nexus/liveTree'
import { writeSpaceSidecar } from '../Contexts/contextWrite'
import {
  pageWorldOf,
  rewriteRaw,
  rewriteRootAt,
  spaceWorldOf,
  writtenRoot,
} from '../Nexus/governedRoot'
import type { MutateContext } from '../Nexus/mutate'
import { done, type MutateReply, type MutateRequest } from '../Nexus/mutateRequest'
import type { PropertyDefinition } from './properties'
import { valueToWrite } from './propertyValue'
import { readRegistry, NO_PROPERTY } from './propertiesRegistry'

type ValueRequest = Extract<MutateRequest, { op: 'setProperty' | 'restoreValue' }>

function requestedValue(req: ValueRequest, def: PropertyDefinition): unknown {
  switch (req.op) {
    case 'setProperty':
      return valueToWrite(def, req.value)
    case 'restoreValue':
      return req.held
  }
}

export async function setSpacePropertyOp(
  { root }: MutateContext,
  req: ValueRequest,
): Promise<MutateReply> {
  const resolved = await mutableTarget(root, req.path, ['space'])
  if (!resolved.ok) return resolved
  const def = (await readRegistry(root)).defs[req.propertyId]
  if (!def) return NO_PROPERTY
  const value = requestedValue(req, def)
  const world = spaceWorldOf(await liveTreeOf(root))
  return done(
    await writeSpaceSidecar(resolved.value, (raw) =>
      value === undefined && !Object.hasOwn(raw, def.key)
        ? null
        : writtenRoot(raw, def.key, value, world),
    ),
  )
}

export async function setPagePropertyOp(
  { root }: MutateContext,
  req: ValueRequest,
): Promise<MutateReply> {
  const resolved = await mutableTarget(root, req.path, ['page'])
  if (!resolved.ok) return resolved
  // Resolved inside the lock: a rename sweeps under the schema lock, not this one, so a name read before the lock can send the write to a key the sweep has already passed.
  return done(
    await machine().lock(resolved.value, async () => {
      const def = (await readRegistry(root)).defs[req.propertyId]
      if (!def) return NO_PROPERTY
      const value = requestedValue(req, def)
      const world = await pageWorldOf(root, resolved.value)
      return rewriteRootAt(
        resolved.value,
        rewriteRaw((raw) => writtenRoot(raw, def.key, value, world)),
      )
    }),
  )
}
