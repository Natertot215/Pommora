// Every archived record stays filed in the Archive of the Collection its origin sits in now, its trail current. One carry, `refileArchived`, serves each landing that moves a Set: the settle's comparison of trees and a restore.
// The open pass, `settleArchives`, re-files each record a Set moved while Pommora was closed left misfiled, and moves an Archive whose Collection exists nowhere into the Trash, recoverable.

import { basename, join } from '../Paths/posix'
import { isPlainObject } from '../Contract/validators'
import { errText } from '../Contract/result'
import { isContainerKind } from '../Nexus/entities'
import { archiveStoreOf } from '../Paths/names'
import { removeOwn } from '../Files/atomicWrite'
import { sameItems } from '@pommora/uix/Utilities/same'
import { liveTreeOf } from '../Nexus/liveTree'
import type { CollectionNode, NexusTree, SetNode } from '../Nexus/tree'
import type { Delta } from '../Nexus/treeDelta'
import { containerTrailById, owningCollection } from '../Nexus/treePatch'
import {
  archiveOwned,
  archivedWithin,
  collectionsElsewhere,
  listBundles,
  moveIntoStore,
} from '../Bundles/bundle'
import { collectionOf, originOf, patchRecord, type RecordFile, trailAbove } from '../Bundles/record'
import { ARCHIVE_DIR_REL, archiveDirRel } from '../Paths/nexusPaths'
import { listEntries, listFilesRecursive } from '../Files/walk'

/** Writes `trail` onto an archived record, moving its bundle into `to`'s Archive when its origin now sits in another Collection; the bundle keeps its name, since its stamp is the archived time. */
async function refile(
  root: string,
  bundlePath: string,
  stored: string[],
  trail: string[],
  from: string,
  to: string,
): Promise<void> {
  const into = archiveStoreOf(to)
  if (!into) return
  const bundle = join(root, bundlePath)
  if (from !== to) await moveIntoStore(root, bundle, into, { trail }, basename(bundle))
  else if (!sameItems(stored, trail)) await patchRecord(bundle, () => ({ trail }))
}

/** Each record archived from within the Set `setId` takes the trail the Set gives it now, and `to`'s Archive when the Set now sits in another Collection. An origin the tree holds is placed by its current trail, and one it no longer holds by the ids its record stored. */
async function refileArchived(
  root: string,
  setId: string,
  from: string,
  to: string,
  tree: NexusTree,
): Promise<void> {
  const above = trailAbove(tree, setId)
  if (!above) return
  for (const { bundlePath, origin, held } of await archivedWithin(root, setId, from, tree)) {
    const below = origin.trail.slice(origin.trail.indexOf(setId) + 1)
    await refile(root, bundlePath, origin.trail, held ?? [...above, setId, ...below], from, to)
  }
}

/** A carry never fails the landing it follows: a record it leaves misfiled is re-filed by the next open's pass. */
async function carried(carry: () => Promise<void>): Promise<void> {
  try {
    await carry()
  } catch (e) {
    console.error('archive: the carry failed:', errText(e))
  }
}

/** The restores' trigger: a Set landed in `dir` carries what was archived from within it out of `from`, the Archive of the Collection it left. */
export const refileLanded = (
  root: string,
  record: RecordFile,
  from: string | null,
  dir: string,
): Promise<void> =>
  carried(async () => {
    if (record.entity !== 'set' || record.parent.kind !== 'container' || !record.id || !from) return
    const tree = await liveTreeOf(root)
    const to = owningCollection(tree, dir)?.id
    if (to) await refileArchived(root, record.id, from, to, tree)
  })

const isContainerNode = (v: unknown): v is CollectionNode | SetNode =>
  isPlainObject(v) && isContainerKind(v.kind)

/** The comparison's trigger: a Set the difference sets in place, which `prev` held under another parent, moved, and carries what was archived from within it; a container `prev` never held arrived, or held at another path was renamed or moved, and its own Sets are read the same way. A Collection is left alone, since what it holds moves inside it and trails name ids. */
export async function refileMoved(
  root: string,
  prev: NexusTree,
  next: NexusTree,
  delta: Delta,
): Promise<void> {
  const landed = async (node: CollectionNode | SetNode): Promise<void> => {
    const was = containerTrailById(prev, node.id)
    if (was?.at(-1)?.path !== node.path) for (const set of node.sets ?? []) await landed(set)
    if (!was || node.kind !== 'set') return
    if (was.at(-2)?.id === containerTrailById(next, node.id)?.at(-2)?.id) return
    const from = owningCollection(prev, was[was.length - 1])
    const to = owningCollection(next, node)
    if (from && to) await refileArchived(root, node.id, from.id, to.id, next)
  }
  const walk = async (d: Delta): Promise<void> => {
    if ('set' in d) for (const v of [d.set].flat()) if (isContainerNode(v)) await landed(v)
    if ('at' in d) for (const sub of Object.values(d.at)) await walk(sub)
  }
  await carried(() => walk(delta))
}

/** The open pass, once per open before the index seed: an Archive filed under a live Collection re-files each record whose origin the tree holds, which a Set moved while Pommora was closed leaves misfiled; one whose id names no Collection the tree holds, none in a root folder it doesn't hold, and none in the Trash is orphaned, and its bundles move into `.trash` with their records whole. A root folder whose sidecar reads unreadable could be any Collection, so while one does, that open takes no Archive for orphaned. */
export async function settleArchives(root: string, tree: NexusTree): Promise<void> {
  let elsewhere: Promise<Set<string>> | undefined
  for (const { name: id, kind } of await listEntries(join(root, ARCHIVE_DIR_REL))) {
    if (kind !== 'dir') continue
    if (tree.collections.some((c) => c.id === id)) {
      for (const { bundlePath, record } of await listBundles(root, { kind: 'archive', id })) {
        const origin = originOf(record)
        const trail = origin && trailAbove(tree, origin.parent)
        if (origin && trail)
          await refile(
            root,
            bundlePath,
            origin.trail,
            trail,
            id,
            collectionOf({ parent: origin.parent, trail }),
          )
      }
      continue
    }
    if (await archiveOwned(tree, id, () => (elsewhere ??= collectionsElsewhere(root, tree))))
      continue
    for (const { bundlePath } of await listBundles(root, { kind: 'archive', id }))
      await moveIntoStore(root, join(root, bundlePath), { kind: 'trash' }, {})
    // A bundle that won't parse stays as evidence; the folder goes once nothing is left beneath it.
    const archive = join(root, archiveDirRel(id))
    if (!(await listFilesRecursive(archive)).length) await removeOwn(archive)
  }
}
