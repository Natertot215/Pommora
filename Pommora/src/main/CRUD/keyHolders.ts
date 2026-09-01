// The candidate files a key-scoped sweep may open: the index's holders when one answers, else
// the corpus. Either way the set is intersected with the sweep's own scope folders — the index
// answers over the whole nexus, while a property value only means anything inside the
// Collection whose schema governs it, so an unintersected query would strip keys from pages
// the sweeps were written to leave alone. The per-file key check inside each rewrite stays as
// the second belt; this one confirms the scope.

import { queryKeyHolders } from '../Database/contentIndex'
import { corpusUnder, nexusCorpus } from '../indexSeed'
import { readTextOrNull } from '../IO/atomicWrite'
import { readFrontmatterFields } from '../IO/pageFile'

export async function keyHolderFiles(
  root: string,
  key: string,
  folders: string[],
): Promise<string[]> {
  return corpusUnder(root, queryKeyHolders(key) ?? (await nexusCorpus(root)), folders)
}

/** Every page in scope that actually holds `key`, read from the corpus rather than the index — a
 *  row the echo window kept out of the index would otherwise hide a holder from a rename that
 *  then deletes its value. */
export async function confirmedKeyHolders(
  root: string,
  key: string,
  folders: string[],
): Promise<string[]> {
  const holders: string[] = []
  for (const file of corpusUnder(root, await nexusCorpus(root), folders)) {
    const content = await readTextOrNull(file)
    if (content !== null && key in readFrontmatterFields(content)) holders.push(file)
  }
  return holders
}
