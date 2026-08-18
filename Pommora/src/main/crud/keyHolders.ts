// The candidate files a key-scoped sweep may open: the index's holders when one answers, else
// the corpus. Either way the set is intersected with the sweep's own scope folders — the index
// answers over the whole nexus, while a property value only means anything inside the
// Collection whose schema governs it, so an unintersected query would strip keys from pages
// the sweeps were written to leave alone. The per-file key check inside each rewrite stays as
// the second belt; this one confirms the scope.

import { join, sep } from 'node:path'
import { queryKeyHolders } from '../db/contentIndex'
import { readExcludedFolders } from '../indexSeed'
import { corpusFiles } from '../io/walk'

export async function keyHolderFiles(
  root: string,
  key: string,
  folders: string[],
): Promise<string[]> {
  const rels = queryKeyHolders(key) ?? (await corpusFiles(root, await readExcludedFolders(root)))
  return rels
    .map((rel) => join(root, rel))
    .filter((abs) => folders.some((folder) => abs.startsWith(folder + sep)))
}
