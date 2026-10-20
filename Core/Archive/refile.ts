// Every archived record stays filed in the Archive of the Collection its origin sits in now, its trail current. One carry, `refileArchived`, serves each landing that moves a Set: the settle's comparison of trees and a restore.
// The open pass is its third landing, and moves an Archive whose Collection exists nowhere into the Trash, recoverable.

import { basename, join, relDirname } from '../Paths/posix'
import { isPlainObject } from '../Contract/validators'
import { rmwJsonStrict } from '../Files/atomicWrite'
import { sameItems } from '@pommora/uix/Utilities/same'
import { liveTreeOf } from '../Nexus/liveTree'
import type { CollectionNode, NexusTree, SetNode } from '../Nexus/tree'
import type { Delta } from '../Nexus/treeDelta'
import { findContainerById, owningCollection } from '../Nexus/treePatch'
import { listBundles, moveIntoStore } from '../Bundles/bundle'
import { RECORD_FILENAME, type RecordFile, trailAbove } from '../Bundles/record'
import { ARCHIVE_DIR_REL, archiveDirRel } from '../Paths/nexusPaths'
import { rootSegs } from '../Paths/exclusion'
import { sidecarId } from '../Files/sidecar'
import { listEntries, listFilesRecursive } from '../Files/walk'
import { recordWrite } from '../Files/writeEcho'
import { machine } from '../Platform/machine'
import { readWatchScope } from '../Settings/settings'

/** The container an archived page or Set left, and the ids it stored above it. */
const originOf = (record: RecordFile): { parent: string; trail: string[] } | null =>
  (record.entity === 'page' || record.entity === 'set') && record.parent.kind === 'container'
    ? { parent: record.parent.id, trail: record.trail ?? [] }
    : null

/** Writes `trail` onto an archived record, moving its bundle into `to`'s Archive when its origin now sits in another Collection; the bundle keeps its name, since its stamp is the archived time. */
async function refile(
  root: string,
  bundlePath: string,
  stored: string[],
  trail: string[],
  from: string,
  to: string,
): Promise<void> {
  const bundle = join(root, bundlePath)
  if (from !== to)
    await moveIntoStore(root, bundle, { kind: 'archive', id: to }, { trail }, basename(bundle))
  else if (!sameItems(stored, trail))
    await rmwJsonStrict(join(bundle, RECORD_FILENAME), (raw) => ({ ...raw, trail }))
}

/** Each record in `from`'s Archive whose origin lies within the Set `setId` takes the trail the Set gives it now, and `to`'s Archive when the Set now sits in another Collection. An origin the tree holds is placed by its current trail, and one it no longer holds by the ids its record stored. */
export async function refileArchived(
  root: string,
  setId: string,
  from: string,
  to: string,
  tree: NexusTree,
): Promise<void> {
  const above = trailAbove(tree, setId)
  if (!above) return
  for (const { bundlePath, record } of await listBundles(root, { kind: 'archive', id: from })) {
    const origin = originOf(record)
    if (!origin) continue
    const held = trailAbove(tree, origin.parent)
    const at = (held ?? origin.trail).indexOf(setId)
    if (origin.parent !== setId && at === -1) continue
    const trail = held ?? [...above, setId, ...origin.trail.slice(at + 1)]
    await refile(root, bundlePath, origin.trail, trail, from, to)
  }
}

/** The restores' trigger: a Set landed in `dir` carries what was archived from within it out of `from`, the Archive of the Collection it left. */
export async function refileLanded(
  root: string,
  record: RecordFile,
  from: string,
  dir: string,
): Promise<void> {
  if (record.entity !== 'set' || !record.id) return
  const tree = await liveTreeOf(root)
  const to = owningCollection(tree, dir)?.id
  if (to) await refileArchived(root, record.id, from, to, tree)
}

const isContainerNode = (v: unknown): v is CollectionNode | SetNode =>
  isPlainObject(v) && (v.kind === 'collection' || v.kind === 'set')

/** The comparison's trigger: a Set the difference sets in place, which `prev` held under another parent, moved, and carries what was archived from within it; a container `prev` never held arrived, and its own Sets are read the same way. A Collection is left alone, since what it holds moves inside it and trails name ids. */
export async function refileMoved(
  root: string,
  prev: NexusTree,
  next: NexusTree,
  delta: Delta,
): Promise<void> {
  const landed = async (node: CollectionNode | SetNode): Promise<void> => {
    const was = findContainerById(prev, node.id)
    if (!was) for (const set of node.sets ?? []) await landed(set)
    else if (node.kind === 'set' && relDirname(was.path) !== relDirname(node.path)) {
      const from = owningCollection(prev, was)
      const to = owningCollection(next, node)
      if (from && to) await refileArchived(root, node.id, from.id, to.id, next)
    }
  }
  const walk = async (d: Delta): Promise<void> => {
    if ('set' in d) for (const v of [d.set].flat()) if (isContainerNode(v)) await landed(v)
    if ('at' in d) for (const sub of Object.values(d.at)) await walk(sub)
  }
  await walk(delta)
}

/** The open pass, once per open before the index seed: an Archive filed under a live Collection re-files each record whose origin the tree holds, which a Set moved while Pommora was closed leaves misfiled; one whose id names no live Collection, no root-level excluded folder's sidecar, and no Collection in the Trash is orphaned, and its bundles move into `.trash` with their records whole. A root folder whose sidecar reads unreadable could be any Collection, so while one does, that open takes no Archive for orphaned. */
export async function settleArchives(root: string, tree: NexusTree): Promise<void> {
  const unread = tree.unreadable?.some((u) => u.kind === 'collection') ?? false
  let excluded: Set<string | undefined> | undefined
  let trashed: Set<string | undefined> | undefined
  for (const { name: id, kind } of await listEntries(join(root, ARCHIVE_DIR_REL))) {
    if (kind !== 'dir') continue
    if (tree.collections.some((c) => c.id === id)) {
      for (const { bundlePath, record } of await listBundles(root, { kind: 'archive', id })) {
        const origin = originOf(record)
        const trail = origin && trailAbove(tree, origin.parent)
        if (origin && trail)
          await refile(root, bundlePath, origin.trail, trail, id, trail[0] ?? origin.parent)
      }
      continue
    }
    if (unread) continue
    excluded ??= new Set(
      await Promise.all(
        (await readWatchScope(root)).excluded
          .filter((entry) => rootSegs(entry).length === 1)
          .map((entry) => sidecarId(join(root, entry), 'collection')),
      ),
    )
    if (excluded.has(id)) continue
    trashed ??= new Set(
      (await listBundles(root, { kind: 'trash' })).map(({ record }) =>
        record.entity === 'collection' ? record.id : undefined,
      ),
    )
    if (trashed.has(id)) continue
    for (const { bundlePath } of await listBundles(root, { kind: 'archive', id }))
      await moveIntoStore(root, join(root, bundlePath), { kind: 'trash' }, {})
    // A bundle that won't parse stays as evidence; the folder goes once nothing is left beneath it.
    const archive = join(root, archiveDirRel(id))
    if (!(await listFilesRecursive(archive)).length) {
      recordWrite(archive)
      await machine().remove(archive)
    }
  }
}
