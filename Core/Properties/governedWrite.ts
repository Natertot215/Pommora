// `mergeFrontmatter` is set-if-present-ELSE-DELETE over the keys it is handed: a changed key the next root holds no value for is deleted. `null` is not the delete sentinel — the merge would write the literal.

import { reconcileGovernedRoot, type GovernedWorld } from '../Contexts/contextResolve'
import { keepingForeignWords, writtenSpelling } from './propertyValue'
import { changedKeys } from './governedSweep'
import { landValue } from '../Files/heldKeys'
import { atomicWriteFile, readTextOrNull } from '../Files/atomicWrite'
import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'
import type { Json } from '../Files/stableJson'

/** `raw` with `value` under `name`, its members spelled as the root already spells them, after the reconcile repairs every other governed key. */
export function writtenRoot(raw: Json, name: string, value: unknown, world: GovernedWorld): Json {
  const reconciled = reconcileGovernedRoot(raw, world, undefined, name).root
  const def = world.defs.get(name)
  const kept = def ? keepingForeignWords(def, value, raw[name]) : value
  return landValue(reconciled, name, writtenSpelling(kept, raw[name]))
}

export async function setGovernedRootKey(
  absFile: string,
  name: string,
  value: unknown,
  world?: GovernedWorld,
): Promise<void> {
  const existing = await readTextOrNull(absFile)
  if (existing === null) throw new Error('That page could not be read.')
  const raw = splitFrontmatter(existing)
  const next = world ? writtenRoot(raw, name, value, world) : landValue(raw, name, value)
  const content = mergeFrontmatter(
    existing,
    next,
    changedKeys(raw, next),
    splitEnvelope(existing).body,
  )
  if (content !== existing) await atomicWriteFile(absFile, content)
}
