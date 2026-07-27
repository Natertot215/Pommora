// IO for the Contexts registry (`.nexus/contexts.json`) — the one identity source for
// Contexts & Spaces. Reads seed a nexus that has none; mutations serialize on the registry
// file (its own per-file lock, NOT the global schema-op chain — nesting a schema op there
// would deadlock).

import { contextsRegistry, seededRegistry, type ContextsRegistry } from '@shared/contexts'
import { fail, ok, type Result } from '@shared/result'
import type { NexusLabels } from '@shared/types'
import { readJsonStrict, rmwJsonStrict, writeJson } from './io/atomicWrite'
import { serializeOnFile } from './io/fileLock'
import { newId } from './ids'
import { contextsRegistryFile } from './paths'

/** Parse a raw registry object leniently — zod loose keeps unknown fields at both the
 *  registry and entry level, so foreign data round-trips every rewrite. */
function parseRegistry(raw: Record<string, unknown>): Result<ContextsRegistry> {
  const parsed = contextsRegistry.safeParse(raw)
  return parsed.success
    ? ok(parsed.data)
    : fail('operation-failed', 'Invalid contexts registry.', 'contexts')
}

/** Read the registry, seeding a nexus that has none from the labels and writing it. */
export async function readRegistry(
  root: string,
  labels: NexusLabels,
): Promise<Result<ContextsRegistry>> {
  const raw = await readJsonStrict(contextsRegistryFile(root))
  if (raw.ok) return parseRegistry(raw.value)
  if (raw.error.code !== 'not-found') return raw

  const seeded = seededRegistry(labels, newId)
  await writeJson(contextsRegistryFile(root), seeded)
  return ok(seeded)
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
  const file = contextsRegistryFile(root)
  return serializeOnFile(file, async () => {
    const written = await rmwJsonStrict(file, (raw) => {
      const parsed = parseRegistry(raw)
      // An invalid shape throws inside the RMW so nothing is written; caught below.
      if (!parsed.ok) throw new Error(parsed.error.message)
      // Overlay onto the raw object so registry-level foreign fields survive even a
      // mutator that rebuilds `{ contexts }` from scratch.
      return { ...raw, ...(fn(parsed.value) as unknown as Record<string, unknown>) }
    }).catch(() => fail('operation-failed', 'Invalid contexts registry.', 'contexts'))
    if (!written.ok) return written
    return parseRegistry(written.value)
  })
}
