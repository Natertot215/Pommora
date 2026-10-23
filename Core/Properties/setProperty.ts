import { machine } from '../Platform/machine'
import { liveTreeOf, mutableTarget } from '../Nexus/liveTree'
import {
  pageWorldOf,
  rewriteRaw,
  rewriteRootAt,
  spaceWorldOf,
  writeSpaceSidecar,
  writtenRoot,
} from '../Nexus/governedRoot'
import type { MutateContext } from '../Nexus/mutate'
import { type MutateReply, type MutateRequest, undoOf } from '../Nexus/mutateRequest'
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
  let before: unknown
  const written = await writeSpaceSidecar(resolved.value, (raw) => {
    before = raw[def.key]
    return writtenRoot(raw, def.key, value, world)
  })
  return written.ok ? undoOf([{ file: req.path, fieldId: def.id, before }]) : written
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
    const value = requestedValue(req, def)
    const world = await pageWorldOf(root, resolved.value)
    let before: unknown
    const written = await rewriteRootAt(resolved.value, (page) => {
      before = page.pair(def.key)
      return rewriteRaw((raw) => writtenRoot(raw, def.key, value, world))(page)
    })
    return written.ok ? undoOf([{ file: req.path, fieldId: def.id, before }]) : written
  })
}
