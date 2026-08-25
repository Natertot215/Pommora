// IO for the Contexts registry (`.nexus/contexts.json`) — the one identity source for
// Contexts & Spaces. Reads seed a nexus that has none; mutations serialize on the registry
// file (its own per-file lock, NOT the global schema-op chain — nesting a schema op there
// would deadlock).

import { contextsRegistry, seededRegistry, type ContextsRegistry } from '@shared/contexts'
import { fail, ok, type Result } from '@shared/result'
import { readJsonStrict, rmwJsonStrict, writeJson } from './io/atomicWrite'
import { newId } from './ids'
import { contextsRegistryFile } from './paths'

/** Parse a raw registry object leniently — zod loose keeps unknown fields at both the
 *  registry and entry level, so foreign data round-trips every rewrite. */
function parseRegistry(raw: Record<string, unknown>): Result<ContextsRegistry> {
  const parsed = contextsRegistry.safeParse(raw)
  return parsed.success ? ok(parsed.data) : fail('operation-failed', 'Invalid contexts registry.')
}

/** Read the registry, seeding a nexus that has none and writing it. */
export async function readRegistry(root: string): Promise<Result<ContextsRegistry>> {
  const raw = await readJsonStrict(contextsRegistryFile(root))
  if (raw.ok) return parseRegistry(raw.value)
  if (raw.error.code !== 'not-found') return raw

  const seeded = seededRegistry(newId)
  await writeJson(contextsRegistryFile(root), seeded)
  return ok(seeded)
}

/** Seed `.nexus/contexts.json` on open when a nexus has none. The registry IS Context
 *  identity, so a nexus without one has no Contexts and no way to mint the first — every
 *  create reads the registry strictly and fails on a missing file. */
export async function ensureContextsRegistry(root: string): Promise<void> {
  await readRegistry(root)
}

/** Read the registry for a lookup — strict, no seeding, no writes. Mutation-side use
 *  (the walk has its own lenient cached read). */
export async function readRegistryStrict(root: string): Promise<Result<ContextsRegistry>> {
  const raw = await readJsonStrict(contextsRegistryFile(root))
  return raw.ok ? parseRegistry(raw.value) : raw
}

/** Serialized registry RMW — `fn` maps the current registry to the next; a read failure
 *  fails the mutation without writing (strict, never fallback-to-empty). */
export async function mutateRegistryFile(
  root: string,
  fn: (current: ContextsRegistry) => ContextsRegistry,
): Promise<Result<ContextsRegistry>> {
  const written = await rmwJsonStrict(contextsRegistryFile(root), (raw) => {
    const parsed = parseRegistry(raw)
    // An invalid shape throws inside the RMW so nothing is written; caught below.
    if (!parsed.ok) throw new Error(parsed.error.message)
    // Overlay onto the raw object so registry-level foreign fields survive even a
    // mutator that rebuilds `{ contexts }` from scratch.
    return { ...raw, ...(fn(parsed.value) as unknown as Record<string, unknown>) }
  }).catch(() => fail('operation-failed', 'Invalid contexts registry.'))
  if (!written.ok) return written
  return parseRegistry(written.value)
}
