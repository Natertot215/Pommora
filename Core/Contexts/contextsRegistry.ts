// Mutations serialize on the registry file's own per-file lock, NOT the global schema-op chain — nesting a schema op there would deadlock.

import { contextsRegistry, seededRegistry, type ContextsRegistry } from '../Properties/contexts'
import { fail, ok, type Result } from '../Contract/result'
import { readJsonStrict, rmwJsonStrict, writeJson } from '../IO/atomicWrite'
import { newId } from '../Locations/ids'
import { contextsRegistryFile } from '../Locations/paths'

/** zod loose keeps unknown fields at both the registry and entry level, so foreign data round-trips every rewrite. */
function parseRegistry(raw: Record<string, unknown>): Result<ContextsRegistry> {
  const parsed = contextsRegistry.safeParse(raw)
  return parsed.success ? ok(parsed.data) : fail('operation-failed', 'Invalid contexts registry.')
}

export async function readRegistry(root: string): Promise<Result<ContextsRegistry>> {
  const raw = await readJsonStrict(contextsRegistryFile(root))
  if (raw.ok) return parseRegistry(raw.value)
  if (raw.error.code !== 'not-found') return raw

  const seeded = seededRegistry(newId)
  await writeJson(contextsRegistryFile(root), seeded)
  return ok(seeded)
}

/** The registry IS Context identity, so a nexus without one has no Contexts and no way to mint the first — every create reads it strictly and fails on a missing file. */
export async function ensureContextsRegistry(root: string): Promise<void> {
  await readRegistry(root)
}

export async function readRegistryStrict(root: string): Promise<Result<ContextsRegistry>> {
  const raw = await readJsonStrict(contextsRegistryFile(root))
  return raw.ok ? parseRegistry(raw.value) : raw
}

/** A read failure fails the mutation without writing — strict, never fallback-to-empty. */
export async function mutateRegistryFile(
  root: string,
  fn: (current: ContextsRegistry) => ContextsRegistry,
): Promise<Result<ContextsRegistry>> {
  const written = await rmwJsonStrict(contextsRegistryFile(root), (raw) => {
    const parsed = parseRegistry(raw)
    if (!parsed.ok) throw new Error(parsed.error.message)
    // Overlay onto the raw object so registry-level foreign fields survive even a mutator that rebuilds `{ contexts }` from scratch.
    return { ...raw, ...(fn(parsed.value) as unknown as Record<string, unknown>) }
  }).catch(() => fail('operation-failed', 'Invalid contexts registry.'))
  if (!written.ok) return written
  return parseRegistry(written.value)
}
