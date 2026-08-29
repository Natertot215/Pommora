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
import { atomicWriteFile } from '../IO/atomicWrite'
import { mergeFrontmatter, splitEnvelope } from '../IO/pageFile'
import { nowIso } from './util'

/** Write a set of governed root keys onto a page, preserving every other key and comment.
 *  A property write passes one key; a Context write passes its whole reconciled set. */
export async function setGovernedRootKeys(
  absFile: string,
  next: Record<string, unknown>,
  govern: readonly string[],
): Promise<void> {
  const existing = await readFile(absFile, 'utf8')
  const content = mergeFrontmatter(
    existing,
    { ...next, modified_at: nowIso() },
    [...govern, 'modified_at'],
    splitEnvelope(existing).body,
  )
  await atomicWriteFile(absFile, content)
}
