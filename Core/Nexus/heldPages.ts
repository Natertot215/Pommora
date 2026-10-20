// The held tree's pages by path and by id, for the host's writers, and the one projection that adds the Archive's pages to the tree's entities, for every refill and every frozen world.

import { heldTreeOf } from './liveTree'
import { join, relative, titleFromPath } from '../Paths/posix'
import { type EntityRecord, pagesByPathOf, pagesOf, recordsOf } from './record'
import { entityMemo, type NexusTree } from './tree'
import { readIndexedStats } from '../Index/contentIndex'
import { ARCHIVE_DIR_REL, archivedCollectionIdOf } from '../Paths/nexusPaths'
import { corpusFilesUnder } from '../Files/walk'
import { stampedIdOf } from '../Files/pageFile'
import { readWatchScope } from '../Settings/settings'
import { originPathOf } from '../Bundles/bundle'
import { type ConnPage, connPage } from '../Connections/pageIndex'

/** Null marks an id two files claim: the window shows the first listed (`record.ts`'s `pagesByIdOf`); a file writer refuses it. */
const writablePathsOf = entityMemo([], (tree): ReadonlyMap<string, string | null> => {
  const byId = new Map<string, string | null>()
  for (const p of pagesOf(tree)) byId.set(p.id, byId.has(p.id) ? null : p.path)
  return byId
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

export async function nexusPages(root: string, tree: NexusTree): Promise<NexusPages> {
  const rows: ReadonlyMap<string, { id?: string | null }> =
    readIndexedStats(ARCHIVE_DIR_REL) ?? (await archiveIds(root))
  const byId = new Map<string, EntityRecord | null>()
  const add = (r: EntityRecord): void => {
    byId.set(r.id, byId.has(r.id) ? null : r)
  }
  recordsOf(tree).forEach(add)
  const archived: ConnPage[] = []
  for (const [path, { id }] of rows) {
    const owner = archivedCollectionIdOf(path)
    if (!id || owner === null) continue
    add({ id, kind: 'page', title: titleFromPath(path), path })
    const left = originPathOf(root, { kind: 'archive', id: owner }, join(root, path))
    archived.push(connPage(id, left))
  }
  return { byId, archived }
}

async function archiveIds(root: string): Promise<Map<string, { id: string | null }>> {
  const rels = await corpusFilesUnder(root, join(root, ARCHIVE_DIR_REL), await readWatchScope(root))
  const ids = await Promise.all(rels.map((rel) => stampedIdOf(join(root, rel))))
  return new Map(rels.map((rel, i) => [rel, { id: ids[i] }]))
}
