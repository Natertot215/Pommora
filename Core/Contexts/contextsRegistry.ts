// Mutations serialize on the registry file's own lock, a different key from the schema ops' `.nexus` lock, so a schema op can write the registry without re-taking the lock it holds.

import {
  type ContextDef,
  contextsRegistry,
  seededRegistry,
  type ContextsRegistry,
} from './contexts'
import { ok, type Result, fault } from '../Contract/result'
import { readJsonStrict, rmwJsonStrict, writeJson } from '../Files/atomicWrite'
import { newId } from '../Nexus/ids'
import { contextsRegistryFile } from '../Paths/paths'

/** zod loose keeps unknown fields at both the registry and entry level, so foreign data round-trips every rewrite. */
function parseRegistry(raw: Record<string, unknown>): Result<ContextsRegistry> {
  const parsed = contextsRegistry.safeParse(raw)
  return parsed.success ? ok(parsed.data) : fault('Invalid contexts registry.')
}

/** The registry IS Context identity, so a nexus without one has no Contexts and no way to mint the first — every create reads it strictly and fails on a missing file. */
export async function ensureContextsRegistry(root: string): Promise<void> {
  const raw = await readJsonStrict(contextsRegistryFile(root))
  if (raw.ok || raw.error.code !== 'not-found') return
  await writeJson(contextsRegistryFile(root), seededRegistry(newId))
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
  }).catch(fault)
  if (!written.ok) return written
  return parseRegistry(written.value)
}

export const withContextAt =
  (def: ContextDef, at?: number) =>
  (cur: ContextsRegistry): ContextsRegistry => {
    const i = at ?? cur.contexts.length
    return { contexts: [...cur.contexts.slice(0, i), def, ...cur.contexts.slice(i)] }
  }
