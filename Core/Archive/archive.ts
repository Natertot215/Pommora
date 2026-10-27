// The Archive's own ops: a page or Set leaves its Collection for the Collection's Archive, where every cascade still reaches it, and comes back by a plain move to its exact place, with nothing to reconcile.

import { basename, dirname, isMarkdownFile, join, relative, titleFromPath } from '../Paths/posix'
import { archiveStoreOf, holdsName } from '../Paths/names'
import { hiddenName } from '../Paths/exclusion'
import { fail, ok } from '../Contract/result'
import { pathExists, relocate } from '../Files/atomicWrite'
import { listMarkdownFiles } from '../Files/walk'
import { archiveDirRel } from '../Paths/nexusPaths'
import { machine } from '../Platform/machine'
import { liveTreeOf, mutableTarget, NOT_HELD } from '../Nexus/liveTree'
import { owningCollection } from '../Nexus/treePatch'
import { dropDeparture } from '../Nexus/reorder'
import { archivedSetIds } from '../Nexus/configReach'
import { nexusPages } from '../Nexus/heldPages'
import { departingCascade, returningCascade } from '../Nexus/settle'
import { liftSetAside } from '../Nexus/folderEntity'
import type { NexusTree } from '../Nexus/tree'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest, RestoreDestination } from '../Nexus/mutateRequest'
import {
  contentPages,
  fileInto,
  originPagesOf,
  type OpenBundle,
  spendBundle,
} from '../Bundles/bundle'
import { type BundleStore, bundleAddressOf, originPathOf } from '../Bundles/layout'
import {
  archivedRecord,
  decodeRecord,
  gatherContentRecord,
  type RecordFile,
} from '../Bundles/record'
import { archiveFiling, placeRecord } from '../Bundles/placement'
import { refileFiled, refileLanded } from './refile'

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
  const { to, origin, record, at } = await filingOf(root, tree, req, abs, store)
  const lifted = req.kind === 'set' ? await liftSetAside(root, abs) : null
  if (lifted && !lifted.ok) return lifted
  const filed = await fileInto(root, to, origin, abs, record, at).catch(async (e) => {
    await lifted?.value.rollback()
    throw e
  })
  await dropDeparture(root, tree, req.kind, req.path)
  if (req.kind === 'set' && req.at !== undefined) await refileFiled(root, filed.address, store.id)
  const into = bundleAddressOf(root, join(root, filed.address))?.store
  const cascade =
    into && originPathOf(root, into, filed.landed) !== relative(root, abs)
      ? await departingCascade(
          root,
          tree,
          await originPagesOf(root, into, await contentPages(req.kind, filed.landed)),
          titleFromPath(origin),
        )
      : undefined
  return ok({ ...(cascade ? { cascade } : {}), bundled: { bundlePath: filed.address } })
}

/** Where an archive files the item: back at the Archive address `at` names, as `archiveFiling` re-roots it, with the record the request carries, when it's of the item's kind; else its own Collection's Archive from where it stands, recorded afresh. Under `name` when it's one its kind may take, by the walk's rule rather than `nameError`'s, since it's a name the item already held on disk. */
async function filingOf(
  root: string,
  tree: NexusTree,
  req: Extract<MutateRequest, { op: 'archive' }>,
  abs: string,
  store: BundleStore,
): Promise<{ to: BundleStore; origin: string; record: RecordFile; at?: string }> {
  const name =
    req.name !== undefined &&
    holdsName(req.name) &&
    !hiddenName(req.name) &&
    isMarkdownFile(req.name) === (req.kind === 'page')
      ? req.name
      : basename(abs)
  const carried = req.record === undefined ? null : decodeRecord(req.record)
  const filing =
    req.at !== undefined &&
    (carried?.entity === 'page' || carried?.entity === 'set') &&
    carried.entity === req.kind
      ? await archiveFiling(root, tree, carried, req.at)
      : null
  if (filing?.ok) {
    const { into, at, folder, record } = filing.value
    return {
      to: into,
      at,
      origin: join(root, folder, name),
      record: await archivedRecord(record, abs),
    }
  }
  return {
    to: store,
    at: req.at,
    origin: join(dirname(abs), name),
    record: await gatherContentRecord(root, tree, req.kind, abs),
  }
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
  const back = await originPagesOf(root, store, await contentPages(record.entity, artifact))
  await machine().mkdir(dirname(targetAbs))
  await relocate(artifact, targetAbs)
  await writeOrder?.()
  await spendBundle(root, bundle)
  const title = finalTitle ?? finalName
  const { cascade } = await returningCascade(root, tree, back, title, {
    entity: record.entity,
    abs: targetAbs,
  })
  await refileLanded(root, record, store.id, dir)
  return ok({
    ...(cascade ? { cascade } : {}),
    ...(landedAs ? { landedAs } : {}),
    undo: {
      op: 'archive',
      path: relative(root, targetAbs),
      kind: held.entity,
      at: relative(root, bundle.inner ? artifact : bundle.abs),
      name: basename(artifact),
      ...(bundle.inner ? {} : { record: held }),
    },
  })
}

/** A Collection's Archive, its pages at the paths they lived, and its Sets, which leave with the Collection once it leaves for good; null when it has none. */
export async function collectionArchive(
  root: string,
  id: string | undefined,
): Promise<{ abs: string; files: string[]; origins: string[]; sets: string[] } | null> {
  const store = archiveStoreOf(id)
  if (!store) return null
  const abs = join(root, archiveDirRel(store.id))
  if (!(await pathExists(abs))) return null
  const files = await listMarkdownFiles(abs)
  return {
    abs,
    files,
    origins: files.map((f) => originPathOf(root, store, f)),
    sets: await archivedSetIds(root, abs),
  }
}
