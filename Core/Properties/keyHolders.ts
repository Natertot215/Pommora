// Intersected with the sweep's own scope folders: the index answers over the whole nexus, so an unintersected query would strip keys from pages the sweeps were meant to leave alone.

import { queryKeyHolders } from '../Index/contentIndex'
import { corpusUnder, nexusCorpus } from '../Index/indexSeed'
import { readJsonObject, readTextOrNull } from '../Files/atomicWrite'
import { relative } from '../Paths/posix'
import { splitFrontmatter } from '../Files/pageFile'
import { ID_KEY } from '../Nexus/identityMark'
import { asString } from '../Nexus/coerce'
import { ensurePageId } from '../Nexus/adopt'
import { isAdoptedId } from '../Nexus/ids'
import { getLiveTree } from '../Nexus/liveTree'
import { patchPageFromDisk } from '../Nexus/watchPatch'
import { pageAt } from '../Nexus/treePatch'
import { valueOr } from '../Contract/result'
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
  for (const file of corpusUnder(
    root,
    queryKeyHolders(key) ?? (await nexusCorpus(root)),
    folders,
  )) {
    const content = await readTextOrNull(file)
    if (content !== null && key in splitFrontmatter(content)) holders.push(file)
  }
  for (const file of await spaceSidecars(root)) {
    const raw = await readJsonObject(file)
    if (raw && key in raw) holders.push(file)
  }
  return holders
}

/** The pages holding `key` that a value can be filed for by ID, those values, and the holders left as they are: a page the tree lists without an ID is given one first, and a holder whose ID another already took, or that the tree doesn't list, is kept. */
export async function keyedHolders(
  root: string,
  files: string[],
  key: string,
): Promise<{ holders: string[]; values: Record<string, unknown>; kept: string[] }> {
  const holders: string[] = []
  const values: Record<string, unknown> = {}
  const kept: string[] = []
  const seen = new Set<string>()
  for (const file of files) {
    const content = await readTextOrNull(file)
    if (content === null) continue
    const fields = splitFrontmatter(content) as Record<string, unknown>
    if (!(key in fields)) continue
    const id = asString(fields[ID_KEY]) ?? (await stampListed(root, file))
    if (!id || seen.has(id)) {
      kept.push(file)
      continue
    }
    seen.add(id)
    holders.push(file)
    if (!isBlankRaw(fields[key])) values[id] = fields[key]
  }
  return { holders, values, kept }
}

async function stampListed(root: string, file: string): Promise<string | null> {
  const rel = relative(root, file)
  const tree = getLiveTree()
  const listed = tree && pageAt(tree, rel)
  if (!listed || !isAdoptedId(listed.id)) return null
  const id = valueOr(await ensurePageId(file), null)
  if (id) await patchPageFromDisk(root, rel)
  return id
}
