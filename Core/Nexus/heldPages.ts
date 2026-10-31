// The held tree's pages by path and by id, for the host's writers, and the one projection that adds what both stores hold to the tree's entities, for every by-id write, every link world, and the cascades' enumerators of the tree's Collections and Spaces.
// Relinks (create, rename, move) resolve against the live index; strips and refills resolve against the tree plus the Archive, `linkWorld`.

import { heldTreeOf } from './liveTree'
import { dirname, join, relative, titleFromPath } from '../Paths/posix'
import { type EntityRecord, pagesByIdOf, pagesByPathOf, pagesOf, recordsOf } from './record'
import { type CollectionNode, entityMemo, type NexusTree, type SpaceNode } from './tree'
import { indexReady, readIndexedStats } from '../Index/contentIndex'
import { ARCHIVE_DIR_REL, CONTEXTS_DIR_REL, TRASH_DIR } from '../Paths/nexusPaths'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import { spaceNodeFrom, spaceSidecarsIn } from '../Contexts/spaceSidecar'
import { listBundles, trashRoot } from '../Bundles/bundle'
import { originOf, standingCollection, type RecordFile, readRecord } from '../Bundles/record'
import { containerNodeFrom } from './containerFields'
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

/** `byId` holds every entity the tree holds and every page and Space a store holds, a stored one at the path a writer opens, and null where two files of the tree or the Archive claim one id, so neither is addressed by it; a trashed one fills only an id nothing else claims, so a live or archived root sharing it stays addressable. `archived` holds the Archive's pages at the paths they left, where a link written before they left still names them; the Trash's stay out, so a link naming a trashed page reads gone. */
export interface NexusPages {
  byId: ReadonlyMap<string, EntityRecord | null>
  archived: readonly ConnPage[]
}

/** What a by-id sweep reads of each root: where its file is and what kind it is. */
export type RootsById = ReadonlyMap<string, Pick<EntityRecord, 'kind' | 'path'> | null>

export const rootFile = (root: string, at: Pick<EntityRecord, 'kind' | 'path'>): string =>
  at.kind === 'space' ? sidecarPath(join(root, at.path), 'space') : join(root, at.path)

/** Whether `byId` addresses `file` by the `id` it carries: not where the file carries no ID, where two files claim it, or where the one root `byId` holds for it is another file, a trashed copy of a live root's among them; an id `byId` doesn't hold yet, as a page the tree hasn't patched in, stays addressable. So no strip files a value under the wrong root and no refill writes it. */
export const addressable = (
  root: string,
  byId: RootsById,
  id: string | undefined,
  file: string,
): id is string => id !== undefined && byId.get(id) !== null && !twinned(root, byId, id, file)

/** Whether `file` is a copy of the one root `byId` holds for its `id` elsewhere, which every strip and refill passes over unreported, since that root holds what it would take. */
export const twinned = (
  root: string,
  byId: RootsById,
  id: string | undefined,
  file: string,
): boolean => {
  const at = id === undefined ? null : byId.get(id)
  return !!at && rootFile(root, at) !== file
}

/** The title the window shows for `id`: its one holder's, or the first-listed page's where two files claim it. */
export const shownTitle = (
  tree: NexusTree,
  byId: NexusPages['byId'],
  id: string,
): string | undefined => byId.get(id)?.title ?? pagesByIdOf(tree).get(id)?.title

export async function nexusPages(
  root: string,
  tree: NexusTree,
  stored?: StoredNodes,
): Promise<NexusPages> {
  const byId: ById = new Map(entitiesById(tree))
  const archived: ConnPage[] = []
  for (const [path, { id }] of await storedPageIds(root, tree, ARCHIVE_DIR_REL)) {
    const at = storeOf(path)
    if (!id || !at) continue
    claim(byId, { id, kind: 'page', title: titleFromPath(path), path })
    archived.push(connPage(id, at.origin))
  }
  const { spaces } = stored ?? (await storedNodes(root, tree))
  const trashed = [...(await storedPageIds(root, tree, TRASH_DIR))].flatMap(([path, { id }]) =>
    id ? [{ id, kind: 'page' as const, title: titleFromPath(path), path }] : [],
  )
  for (const { id, kind, title, path } of [...trashed, ...spaces])
    if (!byId.has(id)) byId.set(id, { id, kind, title, path })
  return { byId, archived }
}

/** The tree's pages and the Archive's at the paths they left. */
export const linkWorld = (tree: NexusTree, archived: readonly ConnPage[]): PageIndex =>
  buildPageIndex([...pagesOf(tree), ...archived])

/** What the Trash holds of the tree's entities, read where it sits so no listing grows with the pages and Sets it holds: the Collections at its root level, where each one's bundle mints, and the Spaces under its Contexts, read from their own sidecars, since the index holds pages alone. `reach` answers what the owner lookups read for `rels`: each bundle's Collection by the bundle's root-relative path, a trashed Collection's own or the one a page or Set's origin stands in now, by its ids, so a Collection renamed or moved since, or a Set moved into another, keeps what the Trash holds of it; it reads the record of each bundle holding one of `rels` that it hasn't read, so a cascade reads only the bundles it reaches. The cascades' enumerators of the tree's Collections or Spaces take it beside the tree. */
export async function storedNodes(root: string, tree: NexusTree) {
  const owners = new Map<string, string | undefined>()
  const ownerOf = (record: RecordFile): string | undefined => {
    if (record.entity === 'collection') return record.id
    const origin = originOf(record)
    return origin ? standingCollection(tree, origin) : undefined
  }
  const collections: CollectionNode[] = []
  const reach = async (rels: Iterable<string>) => {
    for (const rel of rels) {
      const at = storeOf(rel)
      if (at?.store.kind !== 'trash' || !at.bundle || owners.has(at.bundle)) continue
      const record = await readRecord(join(root, at.bundle))
      owners.set(at.bundle, record ? ownerOf(record) : undefined)
    }
    return { owners, collections }
  }
  const spaces: SpaceNode[] = []
  for (const { bundlePath, record, artifactName } of await trashRoot(root)) {
    if (record.entity !== 'collection' || !artifactName) continue
    owners.set(bundlePath, record.id)
    const artifact = join(root, bundlePath, artifactName)
    const sc = await readJsonObject(sidecarPath(artifact, 'collection'))
    const at = { title: artifactName, path: relative(root, artifact) }
    const node = sc && containerNodeFrom('collection', at, sc, [], [])
    if (node?.kind === 'collection') collections.push(node)
  }
  for (const { bundlePath, record, artifactName } of await listBundles(
    root,
    { kind: 'trash' },
    CONTEXTS_DIR_REL,
  )) {
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
  return { reach, collections, spaces }
}

export type StoredNodes = Awaited<ReturnType<typeof storedNodes>>
export type StoredReach = Awaited<ReturnType<StoredNodes['reach']>>

export const everyCollection = (tree: NexusTree, stored: StoredNodes): CollectionNode[] => [
  ...tree.collections,
  ...stored.collections,
]

export async function storedPageIds(
  root: string,
  tree: NexusTree,
  dir: typeof ARCHIVE_DIR_REL | typeof TRASH_DIR,
): Promise<ReadonlyMap<string, { id?: string }>> {
  const indexed = indexReady() ? readIndexedStats(dir) : null
  if (indexed) return indexed
  const rels = await corpusFilesUnder(root, join(root, dir), scopeOf(tree.config))
  const ids = await Promise.all(rels.map((rel) => stampedIdOf(join(root, rel))))
  return new Map(rels.map((rel, i) => [rel, { id: ids[i] ?? undefined }]))
}
