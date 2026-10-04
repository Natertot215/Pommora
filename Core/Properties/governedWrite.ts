// `mergeFrontmatter` is set-if-present-ELSE-DELETE over the keys it is handed: a changed key the next root holds no value for is deleted. `null` is not the delete sentinel — the merge would write the literal.

import {
  reconcileGovernedRoot,
  survivingChanges,
  type GovernedWorld,
} from '../Contexts/contextResolve'
import { type Adoption, heldSpelling } from './propertyValue'
import { changedKeys, landValue, writeTarget } from './governedSweep'
import { atomicWriteFile, readTextOrNull } from '../Files/atomicWrite'
import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'
import type { Json } from '../Files/stableJson'

/** `raw` with `value` written where `writeTarget` places it, spelled as the root already spells it unless casing resolves, after the reconcile repairs every other governed key. */
export function writtenRoot(
  raw: Json,
  name: string,
  value: unknown,
  world: GovernedWorld,
  adoptions: Adoption[],
): Json {
  const target = writeTarget(raw, name, world.resolveCase)
  const reconciled = reconcileGovernedRoot(raw, world, undefined, target.govern)
  adoptions.push(...reconciled.adoptions)
  const written = world.resolveCase ? value : heldSpelling(value, raw[target.key])
  return landValue({ ...raw, ...survivingChanges(reconciled) }, target, written)
}

export async function setGovernedRootKey(
  absFile: string,
  name: string,
  value: unknown,
  world?: GovernedWorld,
): Promise<Adoption[]> {
  const existing = await readTextOrNull(absFile)
  if (existing === null) throw new Error('That page could not be read.')
  const raw = splitFrontmatter(existing)
  const adoptions: Adoption[] = []
  const next = world
    ? writtenRoot(raw, name, value, world, adoptions)
    : landValue(raw, { key: name, govern: [] }, value)
  const content = mergeFrontmatter(
    existing,
    next,
    changedKeys(raw, next),
    splitEnvelope(existing).body,
  )
  if (content !== existing) await atomicWriteFile(absFile, content)
  return adoptions
}
