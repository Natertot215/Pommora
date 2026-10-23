// `mergeFrontmatter` is set-if-present-ELSE-DELETE over the keys it is handed: a changed key the next root holds no value for is deleted. `null` is not the delete sentinel — the merge would write the literal.

import { reconcileGovernedRoot, type GovernedWorld } from '../Contexts/contextResolve'
import { keepingForeignWords, writtenSpelling } from './propertyValue'
import { changedKeys } from '../Nexus/governedSweep'
import { landValue } from '../Files/rootValues'
import { atomicWriteFile, readTextOrNull } from '../Files/atomicWrite'
import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'
import type { Json } from '../Files/stableJson'

/** `raw` with `value` under `key`, its members spelled as the root already spells them, after the reconcile repairs every other governed key. */
export function writtenRoot(raw: Json, key: string, value: unknown, world: GovernedWorld): Json {
  const reconciled = reconcileGovernedRoot(raw, world, undefined, key).root
  const def = world.defs.get(key)
  const kept = def ? keepingForeignWords(def, value, raw[key]) : value
  return landValue(reconciled, key, writtenSpelling(kept, raw[key]))
}

export async function setGovernedRootKey(
  absFile: string,
  key: string,
  value: unknown,
  world?: GovernedWorld,
): Promise<void> {
  const existing = await readTextOrNull(absFile)
  if (existing === null) throw new Error('That page could not be read.')
  const raw = splitFrontmatter(existing)
  const next = world ? writtenRoot(raw, key, value, world) : landValue(raw, key, value)
  const content = mergeFrontmatter(
    existing,
    next,
    changedKeys(raw, next),
    splitEnvelope(existing).body,
  )
  if (content !== existing) await atomicWriteFile(absFile, content)
}
