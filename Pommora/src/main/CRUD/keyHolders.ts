// The set is intersected with the sweep's own scope folders — the index answers over the whole
// nexus, while a property value only means anything inside the Collection whose schema governs
// it, so an unintersected query would strip keys from pages the sweeps were meant to leave alone.

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

// Read from the corpus, not the index: a row the echo window kept out would hide a holder.
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
