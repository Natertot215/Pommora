import { basename, dirname, join } from '../Paths/posix'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { contextKey } from '../Contexts/contexts'
import { spaceIdsIn, spaceSidecarsIn } from '../Contexts/spaceSidecar'
import { rekeyContext } from '../Contexts/contextCascade'
import { TRASH_DIR } from '../Paths/nexusPaths'
import type {
  MutateOutcome,
  MutateReply,
  MutateRequest,
  RestoreDestination,
} from '../Nexus/mutateRequest'
import { landingRefusal } from '../Nexus/folderEntity'
import type { MutateContext } from '../Nexus/mutate'
import { fail, ok, type Result, fault } from '../Contract/result'
import type { NexusTree } from '../Nexus/tree'
import { mutateRegistryFile, withContextAt } from '../Contexts/contextsRegistry'
import { restoreProperty } from './restoreProperty'
import { repairLanded, scrubReturning } from './restoreScrub'
import { readLiveSetting } from '../Settings/settings'
import { sweepRootsById, unsweptLine } from '../Properties/governedSweep'
import { joinValues, landValue } from '../Files/rootValues'
import { respellings, rewriteConnections } from '../Connections/rewrite'
import { buildPageIndex } from '../Connections/pageIndex'
import { linkDefsOf } from '../Properties/propertiesRegistry'
import { refillValues } from '../Properties/assignment'
import { BUNDLE_SUFFIX, deletedPathOf } from './bundle'
import { pathExists, relocate, rmwJsonStrict } from '../Files/atomicWrite'
import { dropPageMetadata } from '../Nexus/pageMetadata'
import { dropSpaceOrder } from '../Nexus/reorder'
import { machine } from '../Platform/machine'
import { recordWrite } from '../Files/writeEcho'
import { frozenWorld } from '../Properties/propertyValue'
import { liveTreeOf } from '../Nexus/liveTree'
import { settledIndex } from '../Nexus/settle'

import { type EntityRecord, pageIndexOf, pagesOf, recordById } from '../Nexus/record'
import { type RecordFile, readRecord, bundleArtifact } from './record'
import {
  deleteCascade,
  joinCascades,
  linksNotUpdated,
  renameCascade,
  type StrippedLink,
} from '../Nexus/cascade'
import { contentPages, pageIdsOf, parkLinks, refillTrashed, trashedPagesOf } from './holdings'
import { findContainerById, resolveRecord, type ArtifactRecord, type Refusal } from './resolve'
import { owningCollection } from '../Nexus/treePatch'
import { contextWorldOf } from '../Contexts/contextResolve'

const REFUSAL_TEXT: Record<Refusal, string> = {
  'parent-gone': 'The place this belonged to no longer exists.',
  'cannot-hold': 'The place this belonged to can no longer hold it.',
  unaddressable: 'Where this belonged was never recorded.',
  'id-live': 'Something in the nexus already carries this identity.',
}

async function openBundle(root: string, bundleAbs: string): Promise<Result<RecordFile>> {
  const trashPrefix = `${join(root, TRASH_DIR)}/`
  if (!bundleAbs.startsWith(trashPrefix) || !bundleAbs.endsWith(BUNDLE_SUFFIX))
    return fault('Only a trash record can be spent.')
  const record = await readRecord(bundleAbs)
  return record ? ok(record) : fault('That deletion record is unreadable.')
}

// Artifact first: a failed bundle removal then leaves a record with no artifact, litter the listing skips, where the reverse order would orphan a live artifact.
export async function emptyBundle(
  root: string,
  bundleAbs: string,
  deps: { permanentDelete?: boolean; trashToSystem: (absPath: string) => Promise<void> },
): Promise<MutateReply> {
  const opened = await openBundle(root, bundleAbs)
  if (!opened.ok) return opened
  if (opened.value.entity === 'property') {
    recordWrite(bundleAbs)
    if (deps.permanentDelete === true) await machine().remove(bundleAbs)
    else await deps.trashToSystem(bundleAbs)
    return ok({})
  }
  const artifactAbs = await bundleArtifact(bundleAbs)
  if (!artifactAbs)
    return fail('not-found', "That deletion didn't finish, or something else is in with it.")
  const pages = await contentPages(opened.value.entity, artifactAbs)
  const pageIds = await pageIdsOf(pages)
  recordWrite(artifactAbs)
  if (deps.permanentDelete === true) await machine().remove(artifactAbs)
  else await deps.trashToSystem(artifactAbs)
  await dropPageMetadata(root, pageIds)
  if (opened.value.entity === 'context') await dropSpaceOrder(root, opened.value.registry.id)
  // Permanent now: a Link value naming one of its pages, recorded by the delete or taken up since, names nothing any more unless another trashed page answers its key.
  const gone = pages.length
    ? await deleteCascade(
        root,
        artifactAbs,
        pages.map((file) => deletedPathOf(root, bundleAbs, file)),
      )
    : null
  recordWrite(bundleAbs)
  await machine().remove(bundleAbs)
  const recorded = 'links' in opened.value ? (opened.value.links ?? []) : []
  await parkLinks(root, [...recorded, ...(gone?.links ?? [])])
  return ok(gone ? { cascade: gone.cascade } : {})
}

const NO_DESTINATION = 'That kind cannot be given a destination.'

function withDestination(
  record: ArtifactRecord,
  destination: RestoreDestination,
  tree: NexusTree,
): Result<ArtifactRecord> {
  switch (record.entity) {
    case 'space':
      if (destination.kind !== 'context') return fail('invalid-path', 'A Space lives in a Context.')
      if (!contextWorldOf(tree.contexts).groupById.has(destination.id))
        return fail('not-found', 'That Context no longer exists.')
      return ok({ ...record, parent: { kind: 'context', id: destination.id } })
    case 'page':
    case 'set':
      if (destination.kind !== 'container')
        return fail('invalid-path', 'Pages and Sets live in Collections and Sets.')
      if (!findContainerById(tree, destination.id))
        return fail('not-found', 'That place no longer exists.')
      return ok({ ...record, parent: { kind: 'container', id: destination.id } })
    default:
      return fault(NO_DESTINATION)
  }
}

type Restored = Pick<MutateOutcome, 'unrestored' | 'cascade'>

const restored = (unrestored: string[]): Restored => (unrestored.length ? { unrestored } : {})

export async function restoreOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'restore' }>,
): Promise<MutateReply> {
  const resolved = await resolveUnderRoot(root, req.bundlePath)
  if (!resolved.ok) return resolved
  return restoreArtifact(root, resolved.value, req.destination)
}

async function restoreArtifact(
  root: string,
  bundleAbs: string,
  destination?: RestoreDestination,
): Promise<Result<Restored>> {
  const opened = await openBundle(root, bundleAbs)
  if (!opened.ok) return opened
  if (opened.value.entity === 'property') {
    if (destination) return fault(NO_DESTINATION)
    const rebuilt = await restoreProperty(root, opened.value)
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
  const rehomed = destination ? withDestination(opened.value, destination, tree) : ok(opened.value)
  if (!rehomed.ok) return rehomed
  const record = rehomed.value
  const resolution = resolveRecord(record, basename(artifactAbs), tree)
  if ('refuse' in resolution) return fault(REFUSAL_TEXT[resolution.refuse])
  const { dir, finalName, finalTitle } = resolution.place

  const targetAbs = join(root, dir, finalName)
  if (record.entity === 'collection' || record.entity === 'set') {
    const refused = await landingRefusal(root, join(root, dir), finalName)
    if (refused) return refused
  }
  // The tree is the resolver's universe; a file the walk cannot see (an Unknown squatter) could still occupy the target — refuse rather than clobber what nothing adjudicated.
  if (await pathExists(targetAbs))
    return fail('exists', 'Something already sits at the restored location.')
  const back = await trashedPagesOf(root, bundleAbs, await contentPages(record.entity, artifactAbs))
  const targets = new Map(Object.entries(record.targets ?? {}))
  const world = buildPageIndex([...pagesOf(tree), ...back])
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
  try {
    await machine().mkdir(dirname(targetAbs))
    await relocate(artifactAbs, targetAbs)
  } catch (e) {
    // The move is the irreversible half; the entry is the reversible one. Reversing it keeps the failure retryable — a ghost entry would trip the next attempt's own id-live guard.
    if (record.entity === 'context')
      await mutateRegistryFile(root, (cur) => ({
        contexts: cur.contexts.filter((c) => !(c.id === record.registry.id && c.title === title)),
      }))
    return fault(e)
  }
  // Two maps rather than one `relink`: the arrival's collisions read against the live world alone, since beside the returning pages a twin's bare link reads ambiguous and a returning `Notes/Alpha` would take `notes/alpha` from a live `X/Notes/Alpha`. `backNames` reads the returning pages' own keys against themselves, feeding the refill whole and the cascade only where the live world names nothing.
  const after = await settledIndex(root)
  const ids = back.map((p) => p.id)
  const backNames = after
    ? respellings(buildPageIndex(back), after, ids, [])
    : new Map<string, string>()
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
    const live = pageIndexOf(tree)
    const names = respellings(live, after, [], ids)
    for (const [k, v] of backNames) if (live.resolve(k).status === 'phantom') names.set(k, v)
    if (names.size) cascade = await renameCascade(root, { names, label: title })
  }
  const roots = recordById(tree)
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
    const refilled = frozenWorld(after ?? world)
    const trashed: StrippedLink[] = []
    for (const def of defs) {
      const all = Object.fromEntries(
        record.links
          .filter((l) => l.property === def.id)
          .map((l) => [l.page, rewriteConnections(l.value, backNames)]),
      )
      const taken = await refillValues(root, def, roots, all, refilled)
      for (const id of Object.keys(all))
        if (!roots[id]) trashed.push({ page: id, property: def.id, value: all[id] })
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
  return ok({
    ...restored([...unspent, ...unlinked].map((id) => roots[id].title)),
    ...(cascade ? { cascade } : {}),
  })
}

/** The ids of what's still here and didn't take its tag back; a root gone since has nothing to take it. */
async function reapply(
  root: string,
  roots: Record<string, EntityRecord>,
  key: string,
  additions: Record<string, string[]>,
): Promise<string[]> {
  const taken = await sweepRootsById(root, roots, additions, (raw, titles) =>
    landValue(raw, key, joinValues(raw[key], titles)),
  )
  return Object.keys(additions).filter((id) => roots[id] && !taken.has(id))
}
