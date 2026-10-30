// The held tree's pages by path and by id, for the host's writers, and the one projection that adds the Archive's pages to the tree's entities, for every refill and every frozen world.
// Relinks (create, rename, move) resolve against the live index; strips, refills, and frozen worlds resolve against the tree plus the Archive, `linkWorld`.

import { heldTreeOf } from './liveTree'
import { dirname, join, relative, titleFromPath } from '../Paths/posix'
import { type EntityRecord, pagesByIdOf, pagesByPathOf, pagesOf, recordsOf } from './record'
import { entityMemo, type NexusTree, type SpaceNode } from './tree'
import { indexReady, readIndexedStats } from '../Index/contentIndex'
import { ARCHIVE_DIR_REL, CONTEXTS_DIR_REL } from '../Paths/nexusPaths'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import { spaceNodeFrom, spaceSidecarsIn } from '../Contexts/spaceSidecar'
import { listBundles } from '../Bundles/bundle'
import { corpusFilesUnder } from '../Files/walk'
import { stampedIdOf } from '../Files/pageFile'
import { scopeOf } from '../Settings/codec'
import { storeOf } from '../Paths/bundleLayout'
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

/** `byId` holds every entity the tree holds and every page the Archive holds, an archived one at the path a writer opens, and every Space the Trash holds, a trashed Context's among them, read from its own sidecar, since the index holds pages alone; a trashed one fills only an id nothing else claims, and `stored` lists them, so a reach reads the Trash's Spaces once; and null where two files claim one id, so neither is addressed by it; `archived` holds the Archive's pages at the paths they left, where a link written before they left still names them. */
export interface NexusPages {
  byId: ReadonlyMap<string, EntityRecord | null>
  archived: readonly ConnPage[]
  stored: readonly SpaceNode[]
}

/** What a by-id sweep reads of each root: where its file is and what kind it is, so a trashed copy joins the live tree's records. */
export type RootsById = ReadonlyMap<string, Pick<EntityRecord, 'kind' | 'path'> | null>

export const rootFile = (root: string, at: Pick<EntityRecord, 'kind' | 'path'>): string =>
  at.kind === 'space' ? sidecarPath(join(root, at.path), 'space') : join(root, at.path)

/** Whether `byId` addresses `file` by the `id` it carries: not where the file carries no ID, where two files claim it, or where the one root `byId` holds for it is another file, a trashed copy of a live root's among them; an id `byId` doesn't hold yet, as a page the tree hasn't patched in, stays addressable. So no strip files a value under the wrong root and no refill writes it. */
export const addressable = (
  root: string,
  byId: RootsById,
  id: string | undefined,
  file: string,
): id is string => {
  const at = id === undefined ? null : byId.get(id)
  return at !== null && (at === undefined || rootFile(root, at) === file)
}

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
    const at = storeOf(path)
    if (!id || !at) continue
    claim(byId, { id, kind: 'page', title: titleFromPath(path), path })
    archived.push(connPage(id, at.origin))
  }
  const stored = await storedSpaces(root)
  for (const { id, kind, title, path } of stored)
    if (!byId.has(id)) byId.set(id, { id, kind, title, path })
  return { byId, archived, stored }
}

/** The tree's pages and the Archive's at the paths they left, with `more` beside them. */
export const linkWorld = (
  tree: NexusTree,
  archived: readonly ConnPage[],
  more: readonly ConnPage[] = [],
): PageIndex => buildPageIndex([...pagesOf(tree), ...archived, ...more])

export async function storedSpaces(root: string): Promise<SpaceNode[]> {
  const spaces: SpaceNode[] = []
  const trashed = await listBundles(root, { kind: 'trash' }, CONTEXTS_DIR_REL)
  for (const { bundlePath, record, artifactName } of trashed) {
    if (!artifactName) continue
    const artifact = join(root, bundlePath, artifactName)
    const held =
      record.entity === 'context'
        ? (await spaceSidecarsIn(artifact)).map((s) => ({ ...s, contextId: record.registry.id }))
        : record.entity === 'space' && record.parent.kind === 'context'
          ? [
              {
                name: artifactName,
                file: sidecarPath(artifact, 'space'),
                contextId: record.parent.id,
              },
            ]
          : []
    for (const { name, file, contextId } of held) {
      const sc = await readJsonObject(file)
      const at = { title: name, path: relative(root, dirname(file)), contextId }
      const space = sc && spaceNodeFrom(sc, at)
      if (space) spaces.push(space)
    }
  }
  return spaces
}

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
