// The one writer for Pommora-governed frontmatter keys, whichever layer owns them.
//
// The signature carries both halves of a write because `mergeFrontmatter` is set-if-present-
// ELSE-DELETE over the keys it is handed: `govern` is the key set this write owns, `next` is what
// those keys become, and **a key in `govern` absent from `next` is deleted**. A change-set alone
// cannot express a delete — an unassign is signalled by omission, and nothing else records that
// the key was ever there. `null` is not the sentinel either; the merge sets on anything that is
// not `undefined`, so a null would write the literal.
//
// It also stamps `modified_at` itself. Leaving that to callers deletes the stamp on any write
// that governs it without supplying it, which is the same trap one field over.

import { readFile } from 'node:fs/promises'
import { reconcileGovernedRoot, survivingChanges, type GovernedWorld } from '@shared/contextResolve'
import type { Adoption } from '@shared/propertyValue'
import { atomicWriteFile } from '../IO/atomicWrite'
import { mergeFrontmatter, splitEnvelope } from '../IO/pageFile'
import { splitFrontmatter } from '../readNexus'
import { nowIso } from './util'
import { sessionRoot } from '../session'
import { noteValueWrite } from '../valuesChanged'

// The caller's keys leave the root before the reconcile sees it, so an absence in `next` deletes.
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
    { ...survivingChanges(reconciled), ...next, modified_at: nowIso() },
    [...changed, ...govern, 'modified_at'],
    splitEnvelope(existing).body,
  )
  await atomicWriteFile(absFile, content)
  noteValueWrite(sessionRoot(), absFile)
  return adoptions
}
