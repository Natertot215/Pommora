// Key holders: which pages and Spaces hold a key, found from the content index and the tree, and what each one holds.

import { queryMembers, readPageRelations } from './contentIndex'
import { nexusCorpus, unlessVouched } from './indexSeed'
import { parseJsonObject, readTextOrNull } from '../Files/atomicWrite'
import { splitFrontmatter, sweepParse } from '../Files/pageFile'
import type { Json } from '../Files/stableJson'
import { parseContextKey } from '../Contexts/contexts'
import { isBlankRaw } from '../Files/rootValues'
import { collectionFolders, rootId } from '../Nexus/governedSweep'
import { storeOf } from '../Paths/bundleLayout'
import { addressable, type NexusPages, nexusPages, storedSpaces } from '../Nexus/heldPages'
import { liveTreeOf } from '../Nexus/liveTree'
import type { NexusTree, SpaceNode } from '../Nexus/tree'
import { archiveReach } from '../Nexus/treePatch'
import { exactTitle } from '../Paths/caseFold'
import { SPACE_SIDECAR } from '../Paths/nexusPaths'
import { isAtOrUnder, isMarkdownFile, join, relative } from '../Paths/posix'

type Reach = 'governed' | { collection: string } | 'anywhere'

/** A folder an op moved ahead of its sweep, root-relative. */
export type FolderMove = { from: string; to: string }

export type HolderQuery = {
  keys: readonly string[]
  reach: Reach
  title?: string
  id?: string
  moved?: FolderMove
  every?: true
}

/** A holder a finder read: the id `byId` addresses it by, the query keys it holds, their values as written, or null when it couldn't be read, and, for a page read from its own file, the key each one's line stood above, in the page's own key order. */
export type Held = {
  file: string
  id: string | null
  keys: string[]
  values: Json | null
  above: Record<string, string | undefined>
}

export type Holders = { files: string[]; held: Held[] }

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

/** Where `rel` sits once `moved` has moved the folder holding it. */
export const movedTo = (rel: string, moved?: FolderMove): string =>
  moved && isAtOrUnder(rel, moved.from) ? `${moved.to}${rel.slice(moved.from.length)}` : rel

const sidecarAt = (root: string, rel: string, moved?: FolderMove): string =>
  join(root, movedTo(rel, moved), SPACE_SIDECAR)

/** The sidecar of each Space the tree or `stored` holds that `holds` answers for, a tree Space at the folder `moved` sent it to when the tree still lists the one it left. */
export const spaceFiles = (
  root: string,
  tree: NexusTree,
  stored: readonly SpaceNode[],
  holds: (space: SpaceNode) => boolean,
  moved?: FolderMove,
): string[] =>
  [...tree.contexts.flatMap((g) => g.spaces), ...stored]
    .filter(holds)
    .map((s) => sidecarAt(root, s.path, moved))

/** The pages and Spaces holding any of `keys`: pages from the content index (the corpus before it's ready), Spaces from the tree. A property's key means something only where a schema governs it, so `governed` reaches the pages of Collections and the Archive, and `{ collection }` one Collection's and its Archive's; a Context tag means something on any page, so `anywhere` reaches every one. Both of those reach every Space holding the key, every Space whose row order lists `id`, and every Space the tree couldn't read, which may hold anything. `title` narrows a Context key's pages to those naming that Space, and `moved` points a Space under a folder the op moved ahead of the tree. `every` passes over a page the index lists without every key while its row still describes its file, as a rename's clash check counts them, and reads no stored page. */
export async function findHolders(root: string, q: HolderQuery, read?: 'values'): Promise<Holders> {
  const tree = await liveTreeOf(root)
  const title = q.title === undefined ? undefined : exactTitle(q.title)
  const rels = q.keys.map((key) => queryMembers(key, title))
  const listed = rels.map((r) => r && new Set(r))
  const named = rels.includes(null) ? null : [...new Set(rels.flatMap((r) => r ?? []))]
  const reached = await pagesInReach(root, tree, named, q.reach)
  const pages = q.every
    ? await unlessVouched(
        root,
        reached.filter((file) => !storeOf(relative(root, file))),
        (rel) => !!named && !listed.every((l) => l?.has(rel)),
      )
    : reached
  const holds = (s: SpaceNode): boolean =>
    q.keys.some((key) =>
      Object.hasOwn(s[parseContextKey(key) === null ? 'values' : 'contextKeys'] ?? {}, key),
    ) ||
    (q.id !== undefined && !!s.rowOrder?.includes(q.id))
  const known = read ? await nexusPages(root, tree) : null
  const spaces =
    typeof q.reach === 'string'
      ? [
          ...spaceFiles(root, tree, known?.stored ?? (await storedSpaces(root)), holds, q.moved),
          ...(tree.unreadable ?? []).flatMap((u) =>
            u.kind === 'space' ? [sidecarAt(root, u.path, q.moved)] : [],
          ),
        ]
      : []
  const files = [...pages, ...spaces]
  if (!known) return { files, held: [] }
  return readHolders(root, files, q.keys, known.byId, listed)
}

/** Each of `files` read once: `held` lists each one holding any of `keys`, or that couldn't be read, with the keys `listed`, the index's members of each key in turn, last read it holding, and `files` leaves out a holder no id addresses, which a strip passes over since no restore could put its value back. */
export async function readHolders(
  root: string,
  files: readonly string[],
  keys: readonly string[],
  byId: NexusPages['byId'],
  listed: readonly (ReadonlySet<string> | null)[] = [],
): Promise<Holders> {
  const held: Held[] = []
  const heldOut = new Set<string>()
  for (const file of files) {
    const text = await readTextOrNull(file)
    const page = text !== null && isMarkdownFile(file) ? sweepParse(text) : null
    const rel = relative(root, file)
    // An unreadable page answers the index's last read of it, so a delete's Trash entry keeps what its strip can't reach yet; a readable one answers its file, whose parsed values the index's JSON doesn't always carry.
    const raw =
      text !== null
        ? isMarkdownFile(file)
          ? (page?.raw ?? splitFrontmatter(text))
          : parseJsonObject(text)
        : isMarkdownFile(file)
          ? ((readPageRelations([rel])?.pages[rel]?.values as Json | undefined) ?? null)
          : null
    const holding = keys.filter((k, i) => (raw ? Object.hasOwn(raw, k) : !!listed[i]?.has(rel)))
    if (raw && !holding.length) continue
    const id = raw ? rootId(file, raw) : undefined
    const addressed = addressable(root, byId, id, file) ? id : null
    if (raw && addressed === null) heldOut.add(file)
    held.push({
      file,
      id: addressed,
      keys: holding,
      values: raw && Object.fromEntries(holding.map((k) => [k, raw[k]])),
      above: Object.fromEntries(holding.map((k) => [k, page?.above(k)])),
    })
  }
  return { files: files.filter((file) => !heldOut.has(file)), held }
}

/** Each addressed holder's value under `key`, by its id, a blank one left out. */
export const heldValues = (held: readonly Held[], key: string): Record<string, unknown> =>
  Object.fromEntries(
    held.flatMap((h) =>
      h.id && h.values && !isBlankRaw(h.values[key]) ? [[h.id, h.values[key]]] : [],
    ),
  )

/** Each addressed holder's `above` under `key`, by its id, as `heldValues` files its value. */
export const heldAbove = (held: readonly Held[], key: string): Record<string, string> =>
  Object.fromEntries(held.flatMap((h) => (h.id && h.above[key] ? [[h.id, h.above[key]]] : [])))

/** The holders a values read leaves out of `files` because no id addresses them (none, or one another file shares): each keeps its value and counts as unfinished, since no restore could put it back. */
export const unaddressed = (held: readonly Held[]): number =>
  held.filter((h) => h.values && !h.id).length
