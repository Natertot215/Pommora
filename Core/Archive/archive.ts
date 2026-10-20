// The Archive's own ops: a page or Set leaves its Collection for the Collection's Archive, where every cascade still reaches it (Reach-In), and comes back by a plain move to its exact place, with nothing to reconcile.

import { basename, dirname, join, relative } from '../Paths/posix'
import { holdsName } from '../Paths/names'
import { errText, fail, ok } from '../Contract/result'
import { pathExists, relocate } from '../Files/atomicWrite'
import { recordWrite } from '../Files/writeEcho'
import { sidecarId } from '../Files/sidecar'
import { listMarkdownFiles, sidecarsUnder } from '../Files/walk'
import { archiveDirRel } from '../Paths/nexusPaths'
import { readWatchScope } from '../Settings/settings'
import { machine } from '../Platform/machine'
import { liveTreeOf, mutableTarget, NOT_HELD } from '../Nexus/liveTree'
import { owningCollection } from '../Nexus/treePatch'
import { dropDeparture } from '../Nexus/reorder'
import { pageIndexOf } from '../Nexus/record'
import { nexusPages } from '../Nexus/heldPages'
import { linksNotUpdated, renameCascade } from '../Nexus/cascade'
import { returningNames, settledIndex } from '../Nexus/settle'
import { liftSetAside } from '../Nexus/folderEntity'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest, RestoreDestination } from '../Nexus/mutateRequest'
import {
  type BundleStore,
  bundleArtifact,
  contentPages,
  mintBundle,
  originPagesOf,
  originPathOf,
} from '../Bundles/bundle'
import { gatherContentRecord, readRecord, writeRecord } from '../Bundles/record'
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
  bundleAbs: string,
  store: Extract<BundleStore, { kind: 'archive' }>,
  destination?: RestoreDestination,
): Promise<MutateReply> {
  const held = await readRecord(bundleAbs)
  const artifactAbs = await bundleArtifact(bundleAbs)
  if ((held?.entity !== 'page' && held?.entity !== 'set') || !artifactAbs) return NOT_HELD
  const tree = await liveTreeOf(root)
  const { byId } = await nexusPages(root, tree)
  const placed = await placeRecord(
    root,
    held,
    destination,
    basename(artifactAbs),
    tree,
    byId,
    relative(root, bundleAbs),
  )
  if (!placed.ok) return placed
  const { record, placement, writeOrder, landedAs } = placed.value
  const { dir, finalName, finalTitle } = placement
  const targetAbs = join(root, dir, finalName)
  const back = await originPagesOf(root, store, await contentPages(record.entity, artifactAbs))
  await machine().mkdir(dirname(targetAbs))
  await relocate(artifactAbs, targetAbs)
  await writeOrder?.()
  recordWrite(bundleAbs)
  await machine().remove(bundleAbs)
  const title = finalTitle ?? finalName
  const after = await settledIndex(root)
  const names = after && returningNames(pageIndexOf(tree), after, back).names
  const cascade = !names
    ? linksNotUpdated(title)
    : names.size
      ? await renameCascade(root, { names, label: title })
      : undefined
  await refileLanded(root, record, store.id, dir).catch((e) =>
    console.error('archive: the carry failed:', errText(e)),
  )
  return ok({
    ...(cascade ? { cascade } : {}),
    ...(landedAs ? { landedAs } : {}),
  })
}

/** The ids of the Sets an archived folder holds, read from their sidecars, so every saved view drops them once the folder leaves for good. */
export async function archivedSetIds(root: string, abs: string): Promise<string[]> {
  const sidecars = await sidecarsUnder(root, await readWatchScope(root), abs)
  const ids = await Promise.all(sidecars.map((file) => sidecarId(dirname(file), 'set')))
  return ids.flatMap((id) => id ?? [])
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
