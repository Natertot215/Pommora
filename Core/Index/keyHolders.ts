// Key holders: which pages and Spaces hold a key, found from the content index and the tree, and what each one holds.

import { queryMembers } from './contentIndex'
import { nexusCorpus } from './indexSeed'
import { parseJsonObject, readTextOrNull } from '../Files/atomicWrite'
import { splitFrontmatter } from '../Files/pageFile'
import type { Json } from '../Files/stableJson'
import { parseContextKey } from '../Contexts/contexts'
import { ID_KEY } from '../Nexus/identityMark'
import { asString } from '../Nexus/coerce'
import { isBlankRaw } from '../Files/rootValues'
import { collectionFolders, rootId } from '../Nexus/governedSweep'
import { addressable, nexusPages, type NexusPages } from '../Nexus/heldPages'
import { liveTreeOf } from '../Nexus/liveTree'
import type { NexusTree, SpaceNode } from '../Nexus/tree'
import { archiveReach } from '../Nexus/treePatch'
import { exactTitle } from '../Paths/caseFold'
import { SPACE_SIDECAR } from '../Paths/nexusPaths'
import { isAtOrUnder, isMarkdownFile, join, relative } from '../Paths/posix'

export type Reach = 'governed' | { collection: string } | 'anywhere'

/** A folder an op moved ahead of its sweep, root-relative. */
export type Moved = { from: string; to: string }

export type HolderQuery = {
  keys: readonly string[]
  reach: Reach
  title?: string
  id?: string
  moved?: Moved
}

/** A holder a finder read: the id `byId` addresses it by, the query keys it holds, and their values as written, or null when it couldn't be read. */
export type Held = { file: string; id: string | null; keys: string[]; values: Json | null }

export type Holders = { pages: string[]; spaces: string[]; held: Held[] }

/** The pages among `rels`, or among the whole corpus before the index is ready, that `reach` holds, as absolute paths. */
export async function pagesInReach(
  root: string,
  tree: NexusTree,
  rels: readonly string[] | null,
  reach: Reach,
): Promise<string[]> {
  const files = (rels ?? (await nexusCorpus(root))).map((rel) => join(root, rel))
  if (reach === 'anywhere') return files
  const only = reach === 'governed' ? undefined : reach.collection
  const archive = archiveReach(tree, only && relative(root, only))
  const folders = [
    ...(only === undefined ? collectionFolders(root, tree) : [only]),
    ...(archive === null ? [] : [join(root, archive)]),
  ]
  return files.filter((abs) => folders.some((folder) => abs.startsWith(`${folder}/`)))
}

const sidecarAt = (root: string, rel: string, moved?: Moved): string =>
  join(
    root,
    moved && isAtOrUnder(rel, moved.from) ? `${moved.to}${rel.slice(moved.from.length)}` : rel,
    SPACE_SIDECAR,
  )

/** The sidecar of each Space the tree holds that `holds` answers for, at the folder `moved` sent it to when the tree still lists the one it left. */
export const spaceFiles = (
  root: string,
  tree: NexusTree,
  holds: (space: SpaceNode) => boolean,
  moved?: Moved,
): string[] =>
  tree.contexts.flatMap((g) => g.spaces.filter(holds).map((s) => sidecarAt(root, s.path, moved)))

/**
 * The pages and Spaces holding any of `keys`: pages from the content index (the corpus before it's ready), Spaces from the tree. A property's key means something only where a schema governs it, so `governed` reaches the pages of Collections and the Archive, and `{ collection }` one Collection's and its Archive's; a Context tag means something on any page, so `anywhere` reaches every one. Both of those reach every Space holding the key, every Space whose row order lists `id`, and every Space the tree couldn't read, which may hold anything. `title` narrows a Context key's pages to those naming that Space, and `moved` points a Space under a folder the op moved ahead of the tree.
 *
 * With `read`, each file is read once: `held` lists each one holding a key or that couldn't be read, with the keys the index last read it holding, and `pages` and `spaces` leave out a holder no id addresses, which a strip passes over since no restore could put its value back.
 */
export async function findHolders(root: string, q: HolderQuery, read?: 'values'): Promise<Holders> {
  const tree = await liveTreeOf(root)
  const title = q.title === undefined ? undefined : exactTitle(q.title)
  const rels = q.keys.map((key) => queryMembers(key, title))
  const pages = await pagesInReach(
    root,
    tree,
    rels.includes(null) ? null : [...new Set(rels.flatMap((r) => r ?? []))],
    q.reach,
  )
  const holds = (s: SpaceNode): boolean =>
    q.keys.some((key) =>
      Object.hasOwn(s[parseContextKey(key) === null ? 'values' : 'contextKeys'] ?? {}, key),
    ) ||
    (q.id !== undefined && !!s.rowOrder?.includes(q.id))
  const spaces =
    typeof q.reach === 'string'
      ? [
          ...spaceFiles(root, tree, holds, q.moved),
          ...(tree.unreadable ?? []).flatMap((u) =>
            u.kind === 'space' ? [sidecarAt(root, u.path, q.moved)] : [],
          ),
        ]
      : []
  if (!read) return { pages, spaces, held: [] }
  const listed = rels.map((r) => r && new Set(r))
  const { byId } = await nexusPages(root, tree)
  const held: Held[] = []
  const heldOut = new Set<string>()
  for (const file of [...pages, ...spaces]) {
    const text = await readTextOrNull(file)
    const raw =
      text === null ? null : isMarkdownFile(file) ? splitFrontmatter(text) : parseJsonObject(text)
    const rel = relative(root, file)
    const keys = q.keys.filter((k, i) => (raw ? Object.hasOwn(raw, k) : !!listed[i]?.has(rel)))
    if (raw && !keys.length) continue
    const id = raw ? rootId(file, raw) : undefined
    const addressed = addressable(byId, id) ? id : null
    if (raw && addressed === null) heldOut.add(file)
    held.push({
      file,
      id: addressed,
      keys,
      values: raw && Object.fromEntries(keys.map((k) => [k, raw[k]])),
    })
  }
  const kept = (file: string): boolean => !heldOut.has(file)
  return { pages: pages.filter(kept), spaces: spaces.filter(kept), held }
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
