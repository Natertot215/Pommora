// `mergeFrontmatter` is set-if-present-ELSE-DELETE over the keys it is handed: a key in `govern` absent from `next` is deleted. `null` is not the delete sentinel — the merge would write the literal.

import {
  preservedChanges,
  reconcileGovernedRoot,
  type GovernedWorld,
} from '../Contexts/contextResolve'
import type { Adoption } from './propertyValue'
import { atomicWriteFile, readTextOrNull } from '../Files/atomicWrite'
import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'

export async function setGovernedRootKeys(
  absFile: string,
  next: Record<string, unknown>,
  govern: readonly string[],
  world?: GovernedWorld,
): Promise<Adoption[]> {
  const existing = await readTextOrNull(absFile)
  if (existing === null) throw new Error('That page could not be read.')
  const raw = splitFrontmatter(existing)
  const own = Object.fromEntries(Object.entries(raw).filter(([k]) => !govern.includes(k)))
  const reconciled = world
    ? reconcileGovernedRoot(own, world)
    : { root: own, changed: [], adoptions: [] }
  const { adoptions } = reconciled
  const preserved = preservedChanges(reconciled, own)
  const content = mergeFrontmatter(
    existing,
    { ...preserved, ...next },
    [...Object.keys(preserved), ...govern],
    splitEnvelope(existing).body,
  )
  if (content === existing) return adoptions
  await atomicWriteFile(absFile, content)
  return adoptions
}
