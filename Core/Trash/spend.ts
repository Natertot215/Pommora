import { basename, dirname, join, relative } from '../Paths/posix'
import { contextKey } from '../Contexts/contexts'
import { spaceIdsIn, spaceSidecarsIn } from '../Contexts/spaceSidecar'
import { rekeyContext } from '../Contexts/contextCascade'
import type { MutateOutcome, MutateReply, RestoreDestination } from '../Nexus/mutateRequest'
import { errText, fail, ok, type Result, fault } from '../Contract/result'
import { mutateRegistryFile, withContextAt } from '../Contexts/contextsRegistry'
import { restoreProperty } from './restoreProperty'
import { repairLanded, scrubReturning } from './restoreScrub'
import { readLiveSetting } from '../Settings/settings'
import { sweepRootsById, unsweptLine } from '../Properties/governedSweep'
import { joinValues, landValue } from '../Files/rootValues'
import { rewriteConnections } from '../Connections/rewrite'
import { buildPageIndex } from '../Connections/pageIndex'
import { linkDefsOf } from '../Properties/propertiesRegistry'
import { refillValues } from '../Properties/assignment'
import {
  bundleArtifact,
  contentPages,
  mintBundle,
  openBundle,
  originPagesOf,
  originPathOf,
  pageIdsOf,
} from '../Bundles/bundle'
import { writeRecord } from '../Bundles/record'
import { relocate, rmwJsonStrict } from '../Files/atomicWrite'
import { dropPageMetadata } from '../Nexus/pageMetadata'
import { dropContextOrder } from '../Nexus/reorder'
import { machine } from '../Platform/machine'
import { noteOwn, recordWrite } from '../Files/writeEcho'
import { goneContainers, reachConfig, reachReport } from '../Nexus/configReach'
import { collectionArchive } from '../Archive/archive'
import { refileLanded } from '../Archive/refile'
import { frozenWorld } from '../Properties/propertyValue'
import { heldTreeOf, liveTreeOf } from '../Nexus/liveTree'
import { returningNames, settledIndex } from '../Nexus/settle'

import { pageIndexOf, pagesOf } from '../Nexus/record'
import { type NexusPages, nexusPages, shownTitle } from '../Nexus/heldPages'
import {
  deleteCascade,
  joinCascades,
  linksNotUpdated,
  renameCascade,
  type StrippedLink,
} from '../Nexus/cascade'
import { parkLinks, refillTrashed } from './holdings'
import { NO_DESTINATION, placeRecord } from '../Bundles/placement'
import { owningCollection } from '../Nexus/treePatch'
import { contextWorldOf } from '../Contexts/contextResolve'

// Artifact first: a failed bundle removal then leaves a record with no artifact, litter the listing skips, where the reverse order would orphan a live artifact.
export async function emptyBundle(
  root: string,
  bundleAbs: string,
  deps: { permanentDelete?: boolean; trashToSystem: (absPath: string) => Promise<void> },
): Promise<MutateReply> {
  const opened = await openBundle(root, bundleAbs)
  if (!opened.ok) return opened
  const { store, record } = opened.value
  if (store.kind !== 'trash') return fault('Only a trash record can be emptied.')
  const dispose = async (abs: string): Promise<void> => {
    recordWrite(abs)
    if (deps.permanentDelete === true) await machine().remove(abs)
    else await deps.trashToSystem(abs)
    await noteOwn({ event: 'unlink', absPath: abs, origin: 'own' })
  }
  if (record.entity === 'property') {
    await dispose(bundleAbs)
    return ok({})
  }
  const artifactAbs = await bundleArtifact(bundleAbs)
  if (!artifactAbs)
    return fail('not-found', "That deletion didn't finish, or something else is in with it.")
  const archive = record.entity === 'collection' ? await collectionArchive(root, record.id) : null
  const pages = await contentPages(record.entity, artifactAbs)
  const pageIds = await pageIdsOf([...pages, ...(archive?.files ?? [])])
  await dispose(artifactAbs)
  if (archive) await dispose(archive.abs)
  await dropPageMetadata(root, pageIds)
  if (record.entity === 'context') await dropContextOrder(root, record.registry.id)
  // Permanent now, a Collection's Archive with it: a Link value naming one of their pages, recorded by the delete or taken up since, names nothing any more unless another trashed page answers its key.
  const paths = [
    ...pages.map((file) => originPathOf(root, store, file)),
    ...(archive?.origins ?? []),
  ]
  const gone = paths.length ? await deleteCascade(root, artifactAbs, paths) : null
  const reach = archive?.sets.length
    ? reachReport(await reachConfig(root, goneContainers(archive.sets)))
    : null
  recordWrite(bundleAbs)
  await machine().remove(bundleAbs)
  const recorded = 'links' in record ? (record.links ?? []) : []
  await parkLinks(root, [...recorded, ...(gone?.links ?? [])])
  const cascade = gone && reach ? joinCascades(gone.cascade, reach) : (gone?.cascade ?? reach)
  return ok(cascade ? { cascade } : {})
}

type Restored = Pick<MutateOutcome, 'unrestored' | 'cascade' | 'landedAs'>

const restored = (unrestored: string[]): Restored => (unrestored.length ? { unrestored } : {})

export async function restoreArtifact(
  root: string,
  bundleAbs: string,
  destination?: RestoreDestination,
): Promise<Result<Restored>> {
  const opened = await openBundle(root, bundleAbs)
  if (!opened.ok) return opened
  const { store, record: stored } = opened.value
  if (stored.entity === 'property') {
    if (destination) return fault(NO_DESTINATION)
    const rebuilt = await restoreProperty(root, stored)
    if (!rebuilt.ok) return rebuilt
    await parkLinks(root, rebuilt.value.dropped)
    // A value that no longer fits is named rather than kept: the property is back, so its record could only ever refuse.
    recordWrite(bundleAbs)
    await machine().remove(bundleAbs)
    return ok(restored(rebuilt.value.unrestored))
  }
  const artifactAbs = await bundleArtifact(bundleAbs)
  if (!artifactAbs)
    return fail('not-found', 'That deletion never finished; there is nothing to restore.')

  const tree = await liveTreeOf(root)
  const { byId: roots, archived } = await nexusPages(root, tree)
  const placed = await placeRecord(
    root,
    stored,
    destination,
    basename(artifactAbs),
    tree,
    roots,
    relative(root, bundleAbs),
  )
  if (!placed.ok) return placed
  const { record, placement, writeOrder, landedAs, into } = placed.value
  const { dir, finalName, finalTitle } = placement
  let targetAbs = join(root, dir, finalName)
  const back = await originPagesOf(root, store, await contentPages(record.entity, artifactAbs))
  const targets = new Map(Object.entries(record.targets ?? {}))
  const world = buildPageIndex([...pagesOf(tree), ...archived, ...back])
  const frozen = frozenWorld(world, targets)
  const owner =
    record.entity === 'collection'
      ? artifactAbs
      : record.entity === 'page' || record.entity === 'set'
        ? owningCollection(tree, dir)?.path
        : undefined
  const dropped = await scrubReturning(
    root,
    tree,
    record.entity,
    artifactAbs,
    owner === undefined ? null : owner === artifactAbs ? artifactAbs : join(root, owner),
    frozen,
    record.entity === 'context' ? contextKey(record.registry.title) : undefined,
  )
  await parkLinks(root, dropped)
  // A Context's identity lives ONLY in its registry entry, so it re-enters BEFORE anything moves: a refused write leaves the bundle intact — the restore is retryable — where an entry written after the move would destroy the evidence on failure and reply ok.
  const title = finalTitle ?? finalName
  if (record.entity === 'context') {
    const committed = await mutateRegistryFile(
      root,
      withContextAt({ ...record.registry, title }, record.at),
    )
    if (!committed.ok) return committed
  }
  let minted: string | undefined
  try {
    // The Undo of a delete from the Archive lands in a bundle minted under the name its record keeps, reconciled as any Trash restore, and nothing lands in the tree.
    if (into) {
      const origin = join(root, originPathOf(root, store, artifactAbs))
      minted = await mintBundle(root, into, origin, basename(dir))
      targetAbs = join(minted, finalName)
      if (record.entity === 'page' || record.entity === 'set') {
        const { archive, links, targets, partial, ...filed } = record
        await writeRecord(minted, filed)
      }
    }
    await machine().mkdir(dirname(targetAbs))
    await relocate(artifactAbs, targetAbs)
  } catch (e) {
    // The move is the irreversible half; a Context's entry and a minted bundle are the reversible ones. Reversing them keeps the failure retryable: a ghost entry would trip the next attempt's own id-live guard, and a ghost bundle would take the name the retry asks for.
    if (minted) {
      recordWrite(minted)
      await machine().remove(minted)
    }
    if (record.entity === 'context')
      await mutateRegistryFile(root, (cur) => ({
        contexts: cur.contexts.filter((c) => !(c.id === record.registry.id && c.title === title)),
      }))
    return fault(e)
  }
  await writeOrder?.()
  const after = await settledIndex(root)
  const settled = after && heldTreeOf(root)
  const returned = after ? returningNames(pageIndexOf(tree), after, back) : null
  const own = returned?.own ?? new Map<string, string>()
  const unswept: string[] = []
  let cascade = after ? undefined : linksNotUpdated(title)
  if (after) {
    const repair = new Map<string, string>()
    for (const [key, { id, path }] of targets) {
      const q = after.byId.get(id)
      const next = q && after.respell(key, q, path)
      if (next) repair.set(key, next)
    }
    unswept.push(...(await repairLanded(root, tree, record.entity, targetAbs, repair)))
    if (returned?.names.size)
      cascade = await renameCascade(root, { names: returned.names, label: title })
  }
  const unspent: string[] = []
  const unlinked = new Set<string>()
  if (record.entity === 'context') {
    if (title !== record.registry.title) {
      const rekey = rekeyContext(record.registry.title, title)
      for (const { file } of await spaceSidecarsIn(targetAbs)) {
        const rekeyed = await rmwJsonStrict(file, (raw) => rekey(raw, file)).catch(() => null)
        if (!rekeyed?.ok) unswept.push(file)
      }
    }
    const titlesById = new Map(
      [...(await spaceIdsIn(targetAbs)).ids].map(([name, id]) => [id, name]),
    )
    const additions: Record<string, string[]> = {}
    for (const m of record.membership) {
      if (!m.root.id) continue
      const titles = m.spaces
        .map((s) => (s.id ? titlesById.get(s.id) : undefined))
        .filter((t): t is string => typeof t === 'string')
      if (titles.length) additions[m.root.id] = titles
    }
    unspent.push(...(await reapply(root, roots, contextKey(title), additions)))
  } else if (record.entity === 'space' && record.parent.kind === 'context') {
    const parentId = record.parent.id
    const group = contextWorldOf(tree.contexts).groupById.get(parentId)
    if (group) {
      const additions = Object.fromEntries(
        record.members
          .filter((m): m is typeof m & { id: string } => typeof m.id === 'string')
          .map((m) => [m.id, [title]]),
      )
      unspent.push(...(await reapply(root, roots, contextKey(group.def.title), additions)))
    }
  } else if (
    record.entity !== 'space' &&
    record.links &&
    (await readLiveSetting(root, 'restoreLinksOnDeletion'))
  ) {
    const defs = linkDefsOf(tree.config.registry)
    // Back in the Archive the page sits in no settled tree, so only the world from before the landing holds it.
    const refilled = frozenWorld(
      settled && !into ? buildPageIndex([...pagesOf(settled), ...archived]) : world,
    )
    const trashed: StrippedLink[] = []
    for (const def of defs) {
      const all = Object.fromEntries(
        record.links
          .filter((l) => l.property === def.id)
          .map((l) => [l.page, rewriteConnections(l.value, own)]),
      )
      const taken = await refillValues(root, def, roots, all, refilled)
      for (const id of Object.keys(all))
        if (roots.get(id) === undefined)
          trashed.push({ page: id, property: def.id, value: all[id] })
        else if (!taken.has(id)) unlinked.add(id)
    }
    // A page or Space in the Trash takes its value back into its trashed copy, so it returns with it.
    await refillTrashed(root, trashed, new Map(defs.map((d) => [d.id, d.key])))
  }
  if (unswept.length) {
    const left = {
      pages: [],
      hosts: [],
      warning: unsweptLine(unswept.length, `links in “${title}” across `),
    }
    cascade = cascade ? joinCascades(cascade, left) : left
  }
  // The record outlives a partial re-tag, so what didn't come back stays written down.
  if (!unspent.length) {
    recordWrite(bundleAbs)
    await machine().remove(bundleAbs)
  }
  if (stored.entity === 'set' && stored.parent.kind === 'container')
    await refileLanded(root, record, stored.trail?.[0] ?? stored.parent.id, dir).catch((e) =>
      console.error('archive: the carry failed:', errText(e)),
    )
  return ok({
    ...restored([...unspent, ...unlinked].flatMap((id) => shownTitle(tree, roots, id) ?? [])),
    ...(cascade ? { cascade } : {}),
    ...(landedAs ? { landedAs } : {}),
  })
}

/** The ids of what's still here and didn't take its tag back, one of two files claiming its id among them; a root gone since has nothing to take it. */
async function reapply(
  root: string,
  roots: NexusPages['byId'],
  key: string,
  additions: Record<string, string[]>,
): Promise<string[]> {
  const taken = await sweepRootsById(root, roots, additions, (raw, titles) =>
    landValue(raw, key, joinValues(raw[key], titles)),
  )
  return Object.keys(additions).filter((id) => roots.get(id) !== undefined && !taken.has(id))
}
