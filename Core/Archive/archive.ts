// The Archive's own op: a page or Set leaves its Collection for the Collection's Archive, where every cascade still reaches it, and comes back through the one restore both stores share (`Core/Bundles/restore.ts`).

import { basename, join, relative, titleFromPath } from '../Paths/posix'
import { holdsName } from '../Paths/names'
import { fail, ok } from '../Contract/result'
import { liveTreeOf, mutableTarget } from '../Nexus/liveTree'
import { containerAt, owningCollection, pageAt } from '../Nexus/treePatch'
import { dropDeparture } from '../Nexus/reorder'
import { departingCascade } from '../Nexus/settle'
import { liftSetAside } from '../Nexus/folderEntity'
import type { CollectionNode, NexusTree, PageNode, SetNode } from '../Nexus/tree'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
import { contentPages, fileInto, originPagesOf } from '../Bundles/bundle'
import { type ArchiveStore, archiveStoreOf, originPathOf } from '../Paths/bundleLayout'
import { decodeRecord, gatherContentRecord, originOf, type RecordFile } from '../Bundles/record'
import { archiveFiling } from '../Bundles/placement'
import { refileLanded } from './refile'

/** Link values and saved views naming what leaves stay where they are and resolve again on its restore, so nothing is stripped and no configuration pass runs; filed under another path than it stood under, what names it re-spells to that path. */
export async function archiveOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'archive' }>,
): Promise<MutateReply> {
  const resolved = await mutableTarget(root, req.path, [req.kind])
  if (!resolved.ok) return resolved
  const abs = resolved.value
  const tree = await liveTreeOf(root)
  const store = archiveStoreOf(owningCollection(tree, req.path)?.id)
  if (!store)
    return fail('invalid-path', 'Only pages and Sets inside a Collection can be archived.')
  const node = (req.kind === 'page' ? pageAt(tree, req.path) : containerAt(tree, req.path))!
  const { to, origin, record, at } = await filingOf(root, tree, req.back, node, abs, store)
  const lifted = req.kind === 'set' ? await liftSetAside(root, abs) : null
  if (lifted && !lifted.ok) return lifted
  const filed = await fileInto(root, to, origin, abs, record, at).catch(async (e) => {
    await lifted?.value.rollback()
    throw e
  })
  await dropDeparture(root, node)
  const left = at === undefined ? null : originOf(record)
  if (record.entity === 'set' && record.id && left)
    await refileLanded(root, record, store.id, [...left.trail, left.parent, record.id])
  const cascade =
    originPathOf(root, filed.landed) !== relative(root, abs)
      ? await departingCascade(
          root,
          tree,
          await originPagesOf(root, await contentPages(req.kind, filed.landed)),
          titleFromPath(origin),
        )
      : undefined
  return ok({
    ...(cascade ? { cascade } : {}),
    undo: { op: 'restore', bundlePath: filed.address },
  })
}

/** Where an archive files the item: back at the address `back` carries, as `archiveFiling` re-roots it, under the name and with the record it carries; else its own Collection's Archive from where it stands, recorded afresh. */
async function filingOf(
  root: string,
  tree: NexusTree,
  back: Extract<MutateRequest, { op: 'archive' }>['back'],
  node: PageNode | CollectionNode | SetNode,
  abs: string,
  store: ArchiveStore,
): Promise<{ to: ArchiveStore; origin: string; record: RecordFile; at?: string }> {
  const carried = back && decodeRecord(back.record)
  const filing =
    back && (carried?.entity === 'page' || carried?.entity === 'set')
      ? await archiveFiling(root, tree, carried, back.at)
      : null
  if (back && filing?.ok) {
    const { into, at, folder, record } = filing.value
    const name = holdsName(back.name) ? back.name : basename(abs)
    return { to: into, at, origin: join(root, folder, name), record }
  }
  return { to: store, origin: abs, record: gatherContentRecord(tree, node) }
}
