// The Archive's own ops: a page or Set leaves its Collection for the Collection's Archive, where every cascade still reaches it, and comes back by a plain move to its exact place, with nothing to reconcile.

import { basename, dirname, join, relative, titleFromPath } from '../Paths/posix'
import { holdsName } from '../Paths/names'
import { fail, ok } from '../Contract/result'
import { relocate } from '../Files/atomicWrite'
import { machine } from '../Platform/machine'
import { liveTreeOf, mutableTarget, NOT_HELD } from '../Nexus/liveTree'
import { containerAt, owningCollection, pageAt } from '../Nexus/treePatch'
import { dropDeparture } from '../Nexus/reorder'
import { nexusPages } from '../Nexus/heldPages'
import { departingCascade, settledIndex } from '../Nexus/settle'
import { returningCascade } from '../Nexus/arrival'
import { pageIndexOf } from '../Nexus/record'
import { liftSetAside } from '../Nexus/folderEntity'
import type { CollectionNode, NexusTree, PageNode, SetNode } from '../Nexus/tree'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest, RestoreDestination } from '../Nexus/mutateRequest'
import {
  contentPages,
  fileInto,
  originPagesOf,
  type OpenBundle,
  spendBundle,
} from '../Bundles/bundle'
import { type ArchiveStore, archiveStoreOf, originPathOf } from '../Paths/bundleLayout'
import { decodeRecord, gatherContentRecord, originOf, type RecordFile } from '../Bundles/record'
import { archiveFiling, placeRecord } from '../Bundles/placement'
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

/** An archived page or Set returns by a plain move to the place it left, or to `destination`, with nothing reconciled or refilled, since every cascade kept it current; its own links keep naming its own pages, and path links naming where it lived follow it. */
export async function restoreArchived(
  root: string,
  bundle: OpenBundle,
  destination?: RestoreDestination,
): Promise<MutateReply> {
  const { store, record: held, artifact } = bundle
  if (store.kind !== 'archive' || (held.entity !== 'page' && held.entity !== 'set') || !artifact)
    return NOT_HELD
  const tree = await liveTreeOf(root)
  const { byId } = await nexusPages(root, tree)
  const placed = await placeRecord(
    root,
    held,
    destination,
    { abs: bundle.abs, artifact },
    tree,
    byId,
  )
  if (!placed.ok) return placed
  const { record, placement, writeOrder, landedAs } = placed.value
  const { dir, finalName, finalTitle } = placement
  const targetAbs = join(root, dir, finalName)
  const back = await originPagesOf(root, await contentPages(record.entity, artifact))
  await machine().mkdir(dirname(targetAbs))
  await relocate(artifact, targetAbs)
  await writeOrder?.()
  await spendBundle(root, bundle)
  const title = finalTitle ?? finalName
  const { cascade } = await returningCascade(
    root,
    pageIndexOf(tree),
    await settledIndex(root),
    back,
    title,
    { entity: record.entity, abs: targetAbs },
  )
  await refileLanded(root, record, store.id)
  return ok({
    ...(cascade ? { cascade } : {}),
    ...(landedAs ? { landedAs } : {}),
    undo: {
      op: 'archive',
      path: relative(root, targetAbs),
      kind: held.entity,
      back: {
        at: relative(root, bundle.inner ? artifact : bundle.abs),
        name: basename(artifact),
        record: held,
      },
    },
  })
}
