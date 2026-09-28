// Intersected with the sweep's own scope folders: the index answers over the whole nexus, so an unintersected query would strip keys from pages the sweeps were meant to leave alone.

import { queryKeyHolders } from '../Index/contentIndex'
import { corpusUnder, nexusCorpus } from '../Index/indexSeed'
import { readJsonObject, readTextOrNull } from '../Files/atomicWrite'
import { splitFrontmatter } from '../Files/pageFile'
import { ID_KEY } from '../Nexus/identityMark'
import { asString } from '../Nexus/coerce'
import { stampListed } from '../Nexus/adopt'
import { isBlankRaw } from './propertyValue'
import { spaceSidecars } from '../Contexts/spaceSidecar'

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
  const indexed = queryKeyHolders(key)
  for (const file of corpusUnder(root, indexed ?? (await nexusCorpus(root)), folders)) {
    const content = await readTextOrNull(file)
    // An unreadable file holds the key when the index last read it holding it.
    if (content === null ? indexed !== null : key in splitFrontmatter(content)) holders.push(file)
  }
  for (const file of await spaceSidecars(root)) {
    const raw = await readJsonObject(file)
    if (raw && key in raw) holders.push(file)
  }
  return holders
}

/** The values of the pages holding `key`, filed by ID, the files a strip should reach, and whether the values miss a holder: a page the tree lists without an ID is given one first, a holder whose ID another already took, or that the tree doesn't list, is kept out of the strip, and a file that can't be read is stripped once it reads. */
export async function keyedHolders(
  root: string,
  files: string[],
  key: string,
): Promise<{ values: Record<string, unknown>; strip: string[]; partial: boolean }> {
  const values: Record<string, unknown> = {}
  const kept: string[] = []
  const seen = new Set<string>()
  let unread = false
  for (const file of files) {
    const content = await readTextOrNull(file)
    if (content === null) {
      unread = true
      continue
    }
    const fields = splitFrontmatter(content) as Record<string, unknown>
    if (!(key in fields)) continue
    const id = asString(fields[ID_KEY]) ?? (await stampListed(root, file))
    if (!id || seen.has(id)) {
      kept.push(file)
      continue
    }
    seen.add(id)
    if (!isBlankRaw(fields[key])) values[id] = fields[key]
  }
  return {
    values,
    strip: files.filter((f) => !kept.includes(f)),
    partial: unread || kept.length > 0,
  }
}
