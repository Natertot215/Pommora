// `mergeFrontmatter` is set-if-present-ELSE-DELETE over the keys it is handed: a changed key the next root holds no value for is deleted. `null` is not the delete sentinel — the merge would write the literal.

import {
  joinsSpellings,
  reconcileGovernedRoot,
  type GovernedWorld,
} from '../Contexts/contextResolve'
import { writtenSpelling } from './propertyValue'
import { changedKeys } from './governedSweep'
import { heldValue, landValue, writeTarget } from '../Files/heldKeys'
import { atomicWriteFile, readTextOrNull } from '../Files/atomicWrite'
import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'
import type { Json } from '../Files/stableJson'

/** `raw` with `value` written where `writeTarget` places it, collapsing every spelling of `name`, its members spelled as the root already spells them, after the reconcile repairs every other governed key. */
export function writtenRoot(raw: Json, name: string, value: unknown, world: GovernedWorld): Json {
  const target = writeTarget(raw, name)
  const reconciled = reconcileGovernedRoot(raw, world, undefined, target.govern).root
  const written = writtenSpelling(value, heldValue(raw, name, joinsSpellings(name, world)))
  return landValue(reconciled, target, written)
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
  const next = world
    ? writtenRoot(raw, name, value, world)
    : landValue(raw, { key: name, govern: [] }, value)
  const content = mergeFrontmatter(
    existing,
    next,
    changedKeys(raw, next),
    splitEnvelope(existing).body,
  )
  if (content !== existing) await atomicWriteFile(absFile, content)
}
