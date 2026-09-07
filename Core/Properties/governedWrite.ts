// `mergeFrontmatter` is set-if-present-ELSE-DELETE over the keys it is handed: a key in `govern` absent from `next` is deleted. `null` is not the delete sentinel — the merge would write the literal.

import {
  reconcileGovernedRoot,
  survivingChanges,
  type GovernedWorld,
} from '../Contexts/contextResolve'
import type { Adoption } from './propertyValue'
import { atomicWriteFile } from '../Files/atomicWrite'
import { machine } from '../Platform/machine'
import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'

import { noteValueWrite } from '../Nexus/valuesChanged'
import { indexWrittenPage } from '../Index/indexSeed'

export async function setGovernedRootKeys(
  root: string,
  absFile: string,
  next: Record<string, unknown>,
  govern: readonly string[],
  world?: GovernedWorld,
): Promise<Adoption[]> {
  const existing = await machine().readText(absFile)
  if (existing === null) throw new Error(`Page not found: ${absFile}`)
  const raw = splitFrontmatter(existing)
  const own = Object.fromEntries(Object.entries(raw).filter(([k]) => !govern.includes(k)))
  const reconciled = world
    ? reconcileGovernedRoot(own, world)
    : { root: own, changed: [], adoptions: [] }
  const { changed, adoptions } = reconciled
  const content = mergeFrontmatter(
    existing,
    { ...survivingChanges(reconciled), ...next },
    [...changed, ...govern],
    splitEnvelope(existing).body,
  )
  if (content === existing) return adoptions
  await atomicWriteFile(absFile, content)
  noteValueWrite(root, absFile)
  await indexWrittenPage(root, absFile)
  return adoptions
}
