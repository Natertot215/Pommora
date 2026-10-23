import { basename, dirname, join } from '../Paths/posix'
import { contextKey } from '../Contexts/contexts'
import { spaceIdsIn, spaceSidecarsIn } from '../Contexts/spaceSidecar'
import { rekeyContext } from '../Contexts/contextCascade'
import type { MutateOutcome, MutateReply, RestoreDestination } from '../Nexus/mutateRequest'
import { fail, ok, type Result, fault } from '../Contract/result'
import { mutateRegistryFile, withContextAt } from '../Contexts/contextsRegistry'
import { restoreProperty } from './restoreProperty'
import { scrubReturning } from './restoreScrub'
import { readLiveSetting } from '../Settings/settings'
import { sweepRootsById } from '../Nexus/governedSweep'
import { joinValues, landValue } from '../Files/rootValues'
import { rewriteConnections } from '../Connections/rewrite'
import { linkDefsOf } from '../Properties/propertiesRegistry'
import { refillValues } from '../Properties/assignment'
import {
  contentPages,
  fileInto,
  openBundle,
  type OpenBundle,
  originPagesOf,
  originPathOf,
  pageIdsOf,
} from '../Bundles/bundle'
import { collectionOf, originOf } from '../Bundles/record'
import { readJsonObject, relocate, removeOwn, rmwJsonStrict } from '../Files/atomicWrite'
import { dropPageMetadata } from '../Nexus/pageMetadata'
import { dropContextOrder } from '../Nexus/reorder'
import { machine } from '../Platform/machine'
import { noteOwn, recordWrite } from '../Files/writeEcho'
import { goneContainers, reachConfig, reachReport } from '../Nexus/configReach'
import { collectionArchive } from '../Archive/archive'
import { refileLanded } from '../Archive/refile'
import { heldTreeOf, liveTreeOf } from '../Nexus/liveTree'
import { returningCascade } from '../Nexus/settle'
import { linkWorld, type NexusPages, nexusPages, shownTitle } from '../Nexus/heldPages'
import { deleteCascade, joinCascades, type StrippedLink, withUnswept } from '../Nexus/cascade'
import { frozenWorld, parkLinks, refillTrashed } from './holdings'
import type { TrashDeps } from './discard'
import { NO_DESTINATION, placeRecord } from '../Bundles/placement'
import { containerSchema, schemaOf } from '../Nexus/treePatch'
import { assignedIds } from '../Nexus/containerFields'
import { sidecarPath } from '../Paths/paths'
import { contextWorldOf } from '../Contexts/contextResolve'

// Artifact first: a failed bundle removal then leaves a record with no artifact, litter the listing skips, where the reverse order would orphan a live artifact.
export async function emptyBundle(
  root: string,
  bundleAbs: string,
  deps: TrashDeps,
): Promise<MutateReply> {
  const opened = await openBundle(root, bundleAbs)
  if (!opened.ok) return opened
  const { store, record, artifact: artifactAbs } = opened.value
  if (store.kind !== 'trash') return fault('Only a trash record can be emptied.')
  const permanent = await readLiveSetting(root, 'permanentDelete')
  const dispose = async (abs: string): Promise<void> => {
    recordWrite(abs)
    if (permanent) await machine().remove(abs)
    else await deps.trashToSystem(abs)
    await noteOwn({ event: 'unlink', absPath: abs, origin: 'own' })
  }
  if (record.entity === 'property') {
    await dispose(bundleAbs)
    return ok({})
  }
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
  await removeOwn(bundleAbs)
  const recorded = 'links' in record ? (record.links ?? []) : []
  await parkLinks(root, [...recorded, ...(gone?.links ?? [])])
  const cascade = joinCascades(gone?.cascade, reach)
  return ok(cascade ? { cascade } : {})
}

type Restored = Pick<MutateOutcome, 'unrestored' | 'cascade' | 'landedAs'>

const restored = (unrestored: string[]): Restored => (unrestored.length ? { unrestored } : {})

export async function restoreTrashed(
  root: string,
  bundle: OpenBundle,
  destination?: RestoreDestination,
): Promise<Result<Restored>> {
  const { abs: bundleAbs, store, record: stored, artifact: artifactAbs } = bundle
  if (stored.entity === 'property') {
    if (destination) return fault(NO_DESTINATION)
    const rebuilt = await restoreProperty(root, stored)
    if (!rebuilt.ok) return rebuilt
    const { unrestored, dropped, landedAs } = rebuilt.value
    await parkLinks(root, dropped)
    // A value that no longer fits is named rather than kept: the property is back, so its record could only ever refuse.
    await removeOwn(bundleAbs)
    return ok({ ...restored(unrestored), ...(landedAs ? { landedAs } : {}) })
  }
  if (!artifactAbs)
    return fail('not-found', 'That deletion never finished; there is nothing to restore.')

  const tree = await liveTreeOf(root)
  const { byId: roots, archived } = await nexusPages(root, tree)
  const placed = await placeRecord(
    root,
    stored,
    destination,
    { abs: bundleAbs, artifact: artifactAbs },
    tree,
    roots,
  )
  if (!placed.ok) return placed
  const { record, placement, writeOrder, landedAs, into } = placed.value
  const { dir, finalName, finalTitle } = placement
  let targetAbs = join(root, dir, finalName)
  const back = await originPagesOf(root, store, await contentPages(record.entity, artifactAbs))
  const targets = new Map(Object.entries(record.targets ?? {}))
  const world = linkWorld(tree, archived, back)
  const frozen = frozenWorld(world, targets)
  // A returning Collection sits in the Trash, outside the tree, so its own sidecar names its schema; a page or Set takes its destination's, and nothing under `.nexus/contexts` has one.
  const schema =
    record.entity === 'collection'
      ? schemaOf(tree, assignedIds(await readJsonObject(sidecarPath(artifactAbs, 'collection'))))
      : containerSchema(tree, dir)
  const dropped = await scrubReturning(
    root,
    tree,
    record.entity,
    artifactAbs,
    schema,
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
  try {
    // The Undo of a delete from the Archive lands in a bundle minted under the name its record keeps, reconciled as any Trash restore, and nothing lands in the tree.
    if (into && (record.entity === 'page' || record.entity === 'set')) {
      const origin = join(root, originPathOf(root, store, artifactAbs))
      const { archive, links, targets, partial, ...filed } = record
      targetAbs = join(
        await fileInto(root, into, origin, artifactAbs, filed, basename(dir)),
        finalName,
      )
    } else {
      await machine().mkdir(dirname(targetAbs))
      await relocate(artifactAbs, targetAbs)
    }
  } catch (e) {
    // The move is the irreversible half and a Context's entry the reversible one. Reversing it keeps the failure retryable: a ghost entry would trip the next attempt's own id-live guard.
    if (record.entity === 'context')
      await mutateRegistryFile(root, (cur) => ({
        contexts: cur.contexts.filter((c) => !(c.id === record.registry.id && c.title === title)),
      }))
    return fault(e)
  }
  await writeOrder?.()
  const arrived = await returningCascade(root, tree, back, title, {
    entity: record.entity,
    abs: targetAbs,
    repair: (after) => {
      const repair = new Map<string, string>()
      for (const [key, { id, path }] of targets) {
        const q = after.byId.get(id)
        const next = q && after.respell(key, q, path)
        if (next) repair.set(key, next)
      }
      return repair
    },
  })
  const { after, own, unswept } = arrived
  const settled = after && heldTreeOf(root)
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
    const refilled = frozenWorld(settled && !into ? linkWorld(settled, archived) : world)
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
  const cascade = withUnswept(arrived.cascade, title, unswept)
  // The record outlives a partial re-tag, so what didn't come back stays written down.
  if (!unspent.length) await removeOwn(bundleAbs)
  const left = originOf(stored)
  if (!into) await refileLanded(root, record, left && collectionOf(left), dir)
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
