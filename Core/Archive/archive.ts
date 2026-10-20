// The Archive's own ops: a page or Set leaves its Collection for the Collection's Archive, where every cascade still reaches it (Reach-In), and comes back by a plain move to its exact place, with nothing to reconcile.

import { basename, dirname, join, relative } from '../Paths/posix'
import { holdsName } from '../Paths/names'
import { fail, ok } from '../Contract/result'
import { pathExists, relocate } from '../Files/atomicWrite'
import { recordWrite } from '../Files/writeEcho'
import { listMarkdownFiles } from '../Files/walk'
import { archiveDirRel } from '../Paths/nexusPaths'
import { machine } from '../Platform/machine'
import { liveTreeOf, mutableTarget, NOT_HELD } from '../Nexus/liveTree'
import { owningCollection } from '../Nexus/treePatch'
import { dropDeparture } from '../Nexus/reorder'
import { archivedSetIds } from '../Nexus/configReach'
import { pageIndexOf } from '../Nexus/record'
import { nexusPages } from '../Nexus/heldPages'
import { linksNotUpdated, renameCascade } from '../Nexus/cascade'
import { returningNames, settledIndex } from '../Nexus/settle'
import { liftSetAside } from '../Nexus/folderEntity'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest, RestoreDestination } from '../Nexus/mutateRequest'
import {
  type BundleStore,
  contentPages,
  mintBundle,
  originPagesOf,
  originPathOf,
  type OpenBundle,
} from '../Bundles/bundle'
import { gatherContentRecord, writeRecord } from '../Bundles/record'
import { placeRecord } from '../Bundles/placement'
import { refileLanded } from './refile'

/** Link values and saved views naming what leaves stay where they are and resolve again on its restore, so nothing is stripped and no configuration pass runs. */
export async function archiveOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'archive' }>,
): Promise<MutateReply> {
  const resolved = await mutableTarget(root, req.path, [req.kind])
  if (!resolved.ok) return resolved
  const abs = resolved.value
  const tree = await liveTreeOf(root)
  const id = owningCollection(tree, req.path)?.id
  // The id names the Archive's folder, and a sidecar can carry any string as its id.
  if (!id || !holdsName(id))
    return fail('invalid-path', 'Only pages and Sets inside a Collection can be archived.')
  if (req.kind === 'set') {
    const lifted = await liftSetAside(root, abs)
    if (!lifted.ok) return lifted
  }
  const record = await gatherContentRecord(root, tree, req.kind, abs)
  const bundle = await mintBundle(root, { kind: 'archive', id }, abs)
  await writeRecord(bundle, record)
  await relocate(abs, join(bundle, basename(abs)))
  await dropDeparture(root, tree, req.kind, req.path)
  return ok({ bundled: { bundlePath: relative(root, bundle) } })
}

/** An archived page or Set returns by a plain move to the place it left, or to `destination`, with nothing reconciled, repaired, or refilled, since every cascade kept it current; path links naming where it lived follow it. */
export async function restoreArchived(
  root: string,
  bundle: OpenBundle,
  store: Extract<BundleStore, { kind: 'archive' }>,
  destination?: RestoreDestination,
): Promise<MutateReply> {
  const { record: held, artifact } = bundle
  if ((held.entity !== 'page' && held.entity !== 'set') || !artifact) return NOT_HELD
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
  recordWrite(bundle.abs)
  await machine().remove(bundle.abs)
  const title = finalTitle ?? finalName
  const after = await settledIndex(root)
  const returned = after ? returningNames(pageIndexOf(tree), after, back) : null
  const cascade = !returned
    ? linksNotUpdated(title)
    : returned.names.size
      ? await renameCascade(root, { names: returned.names, label: title })
      : undefined
  await refileLanded(root, record, store.id, dir)
  return ok({
    ...(cascade ? { cascade } : {}),
    ...(landedAs ? { landedAs } : {}),
  })
}

/** A Collection's Archive, its pages at the paths they lived, and its Sets, which leave with the Collection once it leaves for good; null when it has none. The id names a folder, and a sidecar can carry any string. */
export async function collectionArchive(
  root: string,
  id: string | undefined,
): Promise<{ abs: string; files: string[]; origins: string[]; sets: string[] } | null> {
  if (!id || !holdsName(id)) return null
  const abs = join(root, archiveDirRel(id))
  if (!(await pathExists(abs))) return null
  const files = await listMarkdownFiles(abs)
  return {
    abs,
    files,
    origins: files.map((f) => originPathOf(root, { kind: 'archive', id }, f)),
    sets: await archivedSetIds(root, abs),
  }
}
