// The one writer for Pommora-governed frontmatter keys, whichever layer owns them.
//
// `mergeFrontmatter` is set-if-present-ELSE-DELETE over the keys it is handed: `govern` is the
// key set this write owns, `next` is what those keys become, and **a key in `govern` absent
// from `next` is deleted**. `null` is not the delete sentinel — the merge sets on anything that
// is not `undefined`, so a null would write the literal.

import { readFile } from 'node:fs/promises'
import { reconcileGovernedRoot, survivingChanges, type GovernedWorld } from '@shared/contextResolve'
import type { Adoption } from '@shared/propertyValue'
import { atomicWriteFile } from '../IO/atomicWrite'
import { mergeFrontmatter, splitEnvelope } from '../IO/pageFile'
import { splitFrontmatter } from '../readNexus'
import { sessionRoot } from '../session'
import { noteValueWrite } from '../valuesChanged'

export async function setGovernedRootKeys(
  absFile: string,
  next: Record<string, unknown>,
  govern: readonly string[],
  world?: GovernedWorld,
): Promise<Adoption[]> {
  const existing = await readFile(absFile, 'utf8')
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
  await atomicWriteFile(absFile, content)
  noteValueWrite(sessionRoot(), absFile)
  return adoptions
}
