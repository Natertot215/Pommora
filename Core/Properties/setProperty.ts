import { machine } from '../Platform/machine'
import { liveTreeOf, mutableTarget } from '../Nexus/liveTree'
import { setGovernedRootKey, writtenRoot } from './governedWrite'
import { pageWorldOf, writeSpaceSidecar } from '../Contexts/contextWrite'
import { type GovernedWorld, spaceWorldOf } from '../Contexts/contextResolve'
import { pathExists } from '../Files/atomicWrite'
import { fail, ok, type Result } from '../Contract/result'
import type { MutateContext } from '../Nexus/mutate'
import { done, type MutateReply, type MutateRequest } from '../Nexus/mutateRequest'
import type { PropertyDefinition } from './properties'
import { valueToWrite } from './propertyValue'
import { readRegistry, NO_PROPERTY } from './propertiesRegistry'

// Takes no lock of its own: callers hold the page's lock over a wider span, and a re-take would be refused.
export async function landPageValue(
  absFile: string,
  name: string,
  raw: unknown,
  world?: GovernedWorld,
): Promise<Result<null>> {
  if (!(await pathExists(absFile))) return fail('not-found', 'Page not found.')
  await setGovernedRootKey(absFile, name, raw, world)
  return ok(null)
}

export async function landSpaceValue(
  root: string,
  absSpaceDir: string,
  name: string,
  value: unknown,
): Promise<Result<null>> {
  const world = spaceWorldOf(await liveTreeOf(root))
  return writeSpaceSidecar(absSpaceDir, (raw) =>
    value === undefined && !Object.hasOwn(raw, name) ? null : writtenRoot(raw, name, value, world),
  )
}

type ValueRequest = Extract<MutateRequest, { op: 'setProperty' | 'restoreValue' }>

function requestedValue(req: ValueRequest, def: PropertyDefinition): Result<unknown> {
  switch (req.op) {
    case 'setProperty':
      return valueToWrite(def, req.value)
    case 'restoreValue':
      return ok(req.held)
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
  return done(value.ok ? await landSpaceValue(root, resolved.value, def.key, value.value) : value)
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
      return value.ok
        ? landPageValue(
            resolved.value,
            def.key,
            value.value,
            await pageWorldOf(root, resolved.value),
          )
        : value
    }),
  )
}
