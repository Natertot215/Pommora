// The held tree's pages by path and by id, for the host's writers, and the one projection that adds the Archive's pages to the tree's entities, for every refill and every frozen world.
// Relinks (create, rename, move) resolve against the live index; strips, refills, and frozen worlds resolve against the tree plus the Archive, `linkWorld`.

import { heldTreeOf } from './liveTree'
import { join, relative, titleFromPath } from '../Paths/posix'
import { type EntityRecord, pagesByIdOf, pagesByPathOf, pagesOf, recordsOf } from './record'
import { entityMemo, type NexusTree } from './tree'
import { indexReady, readIndexedStats } from '../Index/contentIndex'
import { ARCHIVE_DIR_REL, archivedCollectionIdOf } from '../Paths/nexusPaths'
import { corpusFilesUnder } from '../Files/walk'
import { stampedIdOf } from '../Files/pageFile'
import { scopeOf } from '../Settings/codec'
import { originPathOf } from '../Bundles/bundle'
import { buildPageIndex, type ConnPage, connPage, type PageIndex } from '../Connections/pageIndex'

type ById = Map<string, EntityRecord | null>

const claim = (byId: ById, r: EntityRecord): void => {
  byId.set(r.id, byId.has(r.id) ? null : r)
}

/** Null marks an id two files claim: the window shows the first listed (`record.ts`'s `pagesByIdOf`); a file writer refuses it. */
const entitiesById = entityMemo([recordsOf], (tree): ReadonlyMap<string, EntityRecord | null> => {
  const byId: ById = new Map()
  for (const r of recordsOf(tree)) claim(byId, r)
  return byId
})

const writablePathsOf = entityMemo([recordsOf], (tree): ReadonlyMap<string, string | null> => {
  const byId = entitiesById(tree)
  return new Map(pagesOf(tree).map((p) => [p.id, byId.get(p.id)?.path ?? null]))
})

/** Empty when the tree is not this root's, so a stale tree never names ids for another nexus. */
export const liveIdIndex = (root: string): ReadonlyMap<string, string> => {
  const tree = heldTreeOf(root)
  return tree ? pagesByPathOf(tree) : new Map()
}

export const liveIdOf = (root: string, absFile: string): string | undefined =>
  liveIdIndex(root).get(relative(root, absFile))

/** Null when the tree is not this root's, the id is absent, or two files claim it. */
export const livePathOf = (root: string, id: string): string | null => {
  const tree = heldTreeOf(root)
  return tree ? (writablePathsOf(tree).get(id) ?? null) : null
}

export const idHeld = (root: string, id: string): boolean => {
  const tree = heldTreeOf(root)
  return tree ? writablePathsOf(tree).has(id) : false
}

/** `byId` holds every entity the tree holds and every page the Archive holds, an archived one at the path a writer opens, and null where two files claim one id, so neither is addressed by it; `archived` holds the Archive's pages at the paths they left, where a link written before they left still names them. */
export interface NexusPages {
  byId: ReadonlyMap<string, EntityRecord | null>
  archived: readonly ConnPage[]
}

/** Whether `byId` addresses the one file carrying `id`: not where the file carries no ID, nor where two files claim it, so no strip files a value under it and no refill writes it. */
export const addressable = (byId: NexusPages['byId'], id: string | undefined): id is string =>
  id !== undefined && byId.get(id) !== null

/** The title the window shows for `id`: its one holder's, or the first-listed page's where two files claim it. */
export const shownTitle = (
  tree: NexusTree,
  byId: NexusPages['byId'],
  id: string,
): string | undefined => byId.get(id)?.title ?? pagesByIdOf(tree).get(id)?.title

export async function nexusPages(root: string, tree: NexusTree): Promise<NexusPages> {
  const rows = await archivedPageIds(root, tree)
  const byId: ById = new Map(entitiesById(tree))
  const archived: ConnPage[] = []
  for (const [path, { id }] of rows) {
    const owner = archivedCollectionIdOf(path)
    if (!id || owner === null) continue
    claim(byId, { id, kind: 'page', title: titleFromPath(path), path })
    const left = originPathOf(root, { kind: 'archive', id: owner }, join(root, path))
    archived.push(connPage(id, left))
  }
  return { byId, archived }
}

/** The tree's pages and the Archive's at the paths they left, with `more` beside them. */
export const linkWorld = (
  tree: NexusTree,
  archived: readonly ConnPage[],
  more: readonly ConnPage[] = [],
): PageIndex => buildPageIndex([...pagesOf(tree), ...archived, ...more])

export async function archivedPageIds(
  root: string,
  tree: NexusTree,
): Promise<ReadonlyMap<string, { id?: string }>> {
  const indexed = indexReady() ? readIndexedStats(ARCHIVE_DIR_REL) : null
  if (indexed) return indexed
  const rels = await corpusFilesUnder(root, join(root, ARCHIVE_DIR_REL), scopeOf(tree.config))
  const ids = await Promise.all(rels.map((rel) => stampedIdOf(join(root, rel))))
  return new Map(rels.map((rel, i) => [rel, { id: ids[i] ?? undefined }]))
}
