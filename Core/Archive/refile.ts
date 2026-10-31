// Every archived record stays filed in the Archive of the Collection its origin sits in now, its trail current. One carry, `refileArchived`, serves each landing that moves a Set: the settle's comparison of trees, a restore, and an Undo filing a Set back into the Archive.
// The open pass, `settleArchives`, re-files each record a container moved while Pommora was closed left misfiled, and moves an Archive whose Collection exists nowhere into the Trash, recoverable.

import { join } from '../Paths/posix'
import { isPlainObject } from '../Contract/validators'
import { errText } from '../Contract/result'
import { isContainerKind } from '../Nexus/entities'
import { removeOwn } from '../Files/atomicWrite'
import { sameItems } from '@pommora/uix/Utilities/same'
import { liveTreeOf } from '../Nexus/liveTree'
import type { CollectionNode, NexusTree, SetNode } from '../Nexus/tree'
import type { Delta } from '../Nexus/treeDelta'
import { containerTrailById, owningCollection } from '../Nexus/treePatch'
import { archivedWithin, listBundles, moveIntoStore, ownedArchives } from '../Bundles/bundle'
import {
  collectionOf,
  currentOrigin,
  originOf,
  patchRecord,
  type RecordFile,
  retrailed,
} from '../Bundles/record'
import { archiveDirRel, archiveStoreOf } from '../Paths/bundleLayout'
import { holdsOnlyHidden } from '../Files/walk'

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
  if (from !== to) await moveIntoStore(root, bundle, into, { trail })
  else if (!sameItems(stored, trail)) await patchRecord(bundle, () => ({ trail }))
}

/** Each record archived from within the Set `setId`, out of `from`'s Archive where it sits, follows the Set to `chain`, its ids Collection first down to the Set: onto the trail that gives it, the ids its record stored below the Set kept, and into the Archive of the Collection the chain starts in. */
async function refileArchived(
  root: string,
  setId: string,
  chain: string[],
  from: string,
  tree: NexusTree,
): Promise<void> {
  for (const { bundlePath, origin } of await archivedWithin(root, setId, from, tree))
    await refile(root, bundlePath, origin.trail, retrailed(origin, chain), from, chain[0])
}

/** A carry never fails the landing it follows: a record it leaves misfiled is re-filed by the next open's pass. */
async function carried(carry: () => Promise<void>): Promise<void> {
  try {
    await carry()
  } catch (e) {
    console.error('archive: the carry failed:', errText(e))
  }
}

/** A Set that landed, in the tree by a restore or back in the Archive by an Undo, carries what was archived from within it out of `from`, the Archive those records sit in, along `chain`: an Undo's from the record it was filed with, since the tree may still hold the Set at its old place until the settle, and a restore's read from the tree. */
export const refileLanded = (
  root: string,
  record: RecordFile,
  from: string,
  chain?: string[],
): Promise<void> =>
  carried(async () => {
    if (record.entity !== 'set' || !record.id) return
    const tree = await liveTreeOf(root)
    const along = chain ?? containerTrailById(tree, record.id)?.map((n) => n.id)
    if (along) await refileArchived(root, record.id, along, from, tree)
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
    const now = containerTrailById(next, node.id)?.map((n) => n.id)
    if (was.at(-2)?.id === now?.at(-2)) return
    const from = owningCollection(prev, was[was.length - 1])
    if (from && now) await refileArchived(root, node.id, now, from.id, next)
  }
  const walk = async (d: Delta): Promise<void> => {
    if ('set' in d) for (const v of [d.set].flat()) if (isContainerNode(v)) await landed(v)
    if ('at' in d) for (const sub of Object.values(d.at)) await walk(sub)
  }
  await carried(() => walk(delta))
}

export async function refileArchive(root: string, tree: NexusTree, id: string): Promise<void> {
  for (const { bundlePath, record } of await listBundles(root, { kind: 'archive', id })) {
    const origin = originOf(record)
    const now = origin && currentOrigin(tree, origin)
    if (origin && now)
      await refile(root, bundlePath, origin.trail, now.trail, id, collectionOf(now))
  }
}

/** The open pass, once per open before the index seed: an Archive whose Collection still answers for it, live, outside the tree, or in the Trash, re-files its records, which a container moved while Pommora was closed, or a Set taken out of a trashed Collection by any path, leaves misfiled; one whose id names no Collection the tree holds, none in a root folder it doesn't hold, and none in the Trash is orphaned, and its bundles move into `.trash` with their records whole. A root folder whose sidecar reads unreadable could be any Collection, so while one does, that open takes no Archive for orphaned. */
export async function settleArchives(root: string, tree: NexusTree): Promise<void> {
  for (const { id, owned } of await ownedArchives(root, tree)) {
    if (owned) {
      await refileArchive(root, tree, id)
      continue
    }
    for (const { bundlePath } of await listBundles(root, { kind: 'archive', id }))
      await moveIntoStore(root, join(root, bundlePath), { kind: 'trash' }, {})
    // A bundle that won't parse stays as evidence; the folder goes once it holds nothing but hidden entries.
    const archive = join(root, archiveDirRel(id))
    if (await holdsOnlyHidden(archive)) await removeOwn(archive)
  }
}
