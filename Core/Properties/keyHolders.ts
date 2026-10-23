// Key holders: the files holding a property's key, confirmed from disk, and the values they hold filed by ID for a strip to record.

import { queryKeyHolders } from '../Index/contentIndex'
import { readJsonObject, readTextOrNull } from '../Files/atomicWrite'
import { splitFrontmatter } from '../Files/pageFile'
import { ID_KEY } from '../Nexus/identityMark'
import { asString } from '../Nexus/coerce'
import { isBlankRaw } from '../Files/rootValues'
import { spaceSidecars } from '../Contexts/spaceSidecar'
import { governedReach, outsideArchive } from '../Nexus/governedSweep'
import { addressable, type NexusPages } from '../Nexus/heldPages'

// A confirmation names only what's outside the Archive. Both loops answer from disk: the index holds a page as its last settled event read it, which an outside edit not yet settled can have changed, and the Spaces come from the folder enumeration the sweeps write through, which also finds those under a Context folder a rename cut short has moved ahead of the registry.
export async function confirmedKeyHolders(root: string, key: string): Promise<string[]> {
  const holders: string[] = []
  const indexed = queryKeyHolders(key)
  for (const file of await governedReach(root, indexed)) {
    if (!outsideArchive(root, file)) continue
    const content = await readTextOrNull(file)
    // An unreadable file holds the key when the index last read it holding it.
    if (content === null ? indexed !== null : Object.hasOwn(splitFrontmatter(content), key))
      holders.push(file)
  }
  for (const file of await spaceSidecars(root)) {
    const raw = await readJsonObject(file)
    if (raw && Object.hasOwn(raw, key)) holders.push(file)
  }
  return holders
}

export interface KeyedHolders {
  values: Record<string, unknown>
  strip: string[]
  partial: boolean
}

/** The values of the pages holding `key`, filed by ID, the files a strip should reach, and whether the values miss a holder: a holder with no ID, or with one `byId` marks as two files' claim, is kept out of the strip, and a file that can't be read is stripped once it reads. */
export async function keyedHolders(
  files: string[],
  key: string,
  byId: NexusPages['byId'],
): Promise<KeyedHolders> {
  const values: Record<string, unknown> = {}
  const kept: string[] = []
  let unread = false
  for (const file of files) {
    const content = await readTextOrNull(file)
    if (content === null) {
      unread = true
      continue
    }
    const fields = splitFrontmatter(content) as Record<string, unknown>
    if (!Object.hasOwn(fields, key)) continue
    const id = asString(fields[ID_KEY])
    if (!addressable(byId, id)) {
      kept.push(file)
      continue
    }
    if (!isBlankRaw(fields[key])) values[id] = fields[key]
  }
  return {
    values,
    strip: files.filter((f) => !kept.includes(f)),
    partial: unread || kept.length > 0,
  }
}
