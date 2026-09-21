// Intersected with the sweep's own scope folders: the index answers over the whole nexus, so an unintersected query would strip keys from pages the sweeps were meant to leave alone.

import { queryKeyHolders } from '../Index/contentIndex'
import { corpusUnder, nexusCorpus } from '../Index/indexSeed'
import { readJsonObject, readTextOrNull } from '../Files/atomicWrite'
import { listFilesRecursive } from '../Files/walk'
import { contextsDir, SPACE_SIDECAR } from '../Paths/paths'
import { splitFrontmatter } from '../Files/pageFile'

export async function keyHolderFiles(
  root: string,
  key: string,
  folders: string[],
): Promise<string[]> {
  return corpusUnder(root, queryKeyHolders(key) ?? (await nexusCorpus(root)), folders)
}

// The disk confirm stays: a row inside the write-echo window can be missing from the index.
export async function confirmedKeyHolders(
  root: string,
  key: string,
  folders: string[],
): Promise<string[]> {
  const holders: string[] = []
  for (const file of corpusUnder(
    root,
    queryKeyHolders(key) ?? (await nexusCorpus(root)),
    folders,
  )) {
    const content = await readTextOrNull(file)
    if (content !== null && key in splitFrontmatter(content)) holders.push(file)
  }
  for (const file of await listFilesRecursive(contextsDir(root), [SPACE_SIDECAR])) {
    const raw = await readJsonObject(file)
    if (raw && key in raw) holders.push(file)
  }
  return holders
}
