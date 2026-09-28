import { basename, dirname, join, relative, titleFromPath } from '../Paths/posix'
import { escapes, resolveUnderRoot } from '../Paths/pathSafety'
import { contextKey } from '../Contexts/contexts'
import { spaceSidecarsIn, withOrderEntry } from '../Contexts/spaceSidecar'
import { TRASH_DIR } from '../Paths/nexusPaths'
import type {
  MutateOutcome,
  MutateReply,
  MutateRequest,
  RestoreDestination,
} from '../Nexus/mutateRequest'
import { landingRefusal } from '../Nexus/folderEntity'
import type { MutateContext } from '../Nexus/mutate'
import { moveIndexPaths } from '../Index/indexSeed'
import { fail, ok, type Result, fault } from '../Contract/result'
import type { NexusTree } from '../Nexus/tree'
import { mutateRegistryFile, withContextAt } from '../Contexts/contextsRegistry'
import { restoreProperty } from './restoreProperty'
import { scrubReturning } from './restoreScrub'
import { exclusionWriteRefusal, readLiveSetting, reseatExcludedFolders } from '../Settings/settings'
import { sweepRootsById } from '../Properties/governedSweep'
import { rewriteFrontmatterConnections } from '../Connections/rewrite'
import { linkDefs } from '../Properties/propertiesRegistry'
import { refillValues } from '../Properties/assignment'
import { BUNDLE_SUFFIX } from './bundle'
import { pathExists, readJsonObject, readTextOrNull, rmwJsonStrict } from '../Files/atomicWrite'
import { dropPageMetadata } from '../Nexus/pageMetadata'
import { dropSpaceOrder } from '../Nexus/reorder'
import { machine } from '../Platform/machine'
import { stampedId } from '../Files/pageFile'
import { recordWrite } from '../Files/writeEcho'
import { frozenWorld, noteValueWrite } from '../Nexus/valuesChanged'
import { getLiveTree, liveTreeOf } from '../Nexus/liveTree'

import { projectBaseline } from '../Nexus/remintLedger'
import type { EntityRecord } from '../Nexus/record'
import { type RecordFile, readRecord, bundleArtifact } from './record'
import { deleteCascade, type StrippedLink } from '../Nexus/cascade'
import { contentPages, parkLinks, refillTrashed } from './holdings'
import { findContainerById, resolveRecord, type ArtifactRecord, type Refusal } from './resolve'

const REFUSAL_TEXT: Record<Refusal, string> = {
  'parent-gone': 'The place this belonged to no longer exists.',
  'cannot-hold': 'The place this belonged to can no longer hold it.',
  unaddressable: 'Where this belonged was never recorded.',
  'id-live': 'Something in the nexus already carries this identity.',
}

async function rekeyPassengers(
  absContextDir: string,
  oldTitle: string,
  newTitle: string,
): Promise<void> {
  const oldKey = contextKey(oldTitle)
  const newKey = contextKey(newTitle)
  const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  const rekey = (raw: Record<string, unknown>): Record<string, unknown> | null => {
    if (!(oldKey in raw)) return null
    const existing = strings(raw[newKey])
    const merged = [...existing, ...strings(raw[oldKey]).filter((v) => !existing.includes(v))]
    const next = { ...raw }
    delete next[oldKey]
    if (merged.length) next[newKey] = merged
    return next
  }
  const rekeyed = withOrderEntry(rekey, 'contexts', oldTitle, newTitle)
  for (const { file } of await spaceSidecarsIn(absContextDir))
    await rmwJsonStrict(file, (raw) => rekeyed(raw, file))
}

async function restoredSpaceTitles(absContextDir: string): Promise<Map<string, string>> {
  const titles = new Map<string, string>()
  for (const { name, file } of await spaceSidecarsIn(absContextDir)) {
    const raw = await readJsonObject(file)
    if (typeof raw?.id === 'string') titles.set(raw.id, name)
  }
  return titles
}

async function openBundle(root: string, bundleAbs: string): Promise<Result<RecordFile>> {
  const trashPrefix = `${join(root, TRASH_DIR)}/`
  if (!bundleAbs.startsWith(trashPrefix) || !bundleAbs.endsWith(BUNDLE_SUFFIX))
    return fault('Only a trash record can be spent.')
  const record = await readRecord(bundleAbs)
  return record ? ok(record) : fault('That deletion record is unreadable.')
}

async function trashedPageIds(record: ArtifactRecord, pages: string[]): Promise<string[]> {
  if (record.entity === 'page') return record.id ? [record.id] : []
  const texts = await Promise.all(pages.map(readTextOrNull))
  return texts.flatMap((text) => stampedId(text ?? '') ?? [])
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
  const pageIds = await trashedPageIds(opened.value, pages)
  recordWrite(artifactAbs)
  if (deps.permanentDelete === true) await machine().remove(artifactAbs)
  else await deps.trashToSystem(artifactAbs)
  await dropPageMetadata(root, pageIds, getLiveTree())
  if (opened.value.entity === 'context') await dropSpaceOrder(root, opened.value.registry.id)
  // Permanent now: a Link value naming one of its pages, recorded by the delete or taken up since, names nothing any more unless another bundle holds that title.
  const gone = pages.length
    ? await deleteCascade(root, artifactAbs, pages.map(titleFromPath))
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
      if (!tree.contexts.some((g) => g.def.id === destination.id))
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

type Restored = Pick<MutateOutcome, 'unrestored' | 'rescope' | 'landed'>

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
  // Records are plain user-visible JSON — shape validation is not safety validation. The final name must be a plain basename landing exactly in the resolver's chosen directory, inside the nexus and outside the trash; anything else is a recorded title steering the move.
  const targetRel = relative(root, targetAbs)
  if (
    escapes(targetRel) ||
    targetRel.split('/')[0] === TRASH_DIR ||
    dirname(targetAbs) !== join(root, dir) ||
    basename(targetAbs) !== finalName
  )
    return fault('That restore record points outside the nexus.')
  if (record.entity === 'collection' || record.entity === 'set') {
    const refused =
      (await landingRefusal(root, join(root, dir), finalName)) ??
      (await exclusionWriteRefusal(root, record.excluded ?? []))
    if (refused) return refused
  }
  // The tree is the resolver's universe; a file the walk cannot see (an Unknown squatter) could still occupy the target — refuse rather than clobber what nothing adjudicated.
  if (await pathExists(targetAbs))
    return fail('exists', 'Something already sits at the restored location.')
  const was = titleFromPath(artifactAbs)
  const landed = record.entity === 'page' ? titleFromPath(finalName) : was
  const frozen = frozenWorld(
    tree,
    record.entity === 'page'
      ? [landed]
      : (await contentPages(record.entity, artifactAbs)).map(titleFromPath),
  )
  const owner =
    record.entity === 'collection'
      ? artifactAbs
      : record.entity === 'page' || record.entity === 'set'
        ? tree.collections.find((c) => dir === c.path || dir.startsWith(`${c.path}/`))?.path
        : undefined
  const dropped = await scrubReturning(
    root,
    tree,
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
  recordWrite(artifactAbs)
  recordWrite(targetAbs)
  try {
    await machine().mkdir(dirname(targetAbs))
    await machine().rename(artifactAbs, targetAbs)
  } catch (e) {
    // The move is the irreversible half; the entry is the reversible one. Reversing it keeps the failure retryable — a ghost entry would trip the next attempt's own id-live guard.
    if (record.entity === 'context')
      await mutateRegistryFile(root, (cur) => ({
        contexts: cur.contexts.filter((c) => !(c.id === record.registry.id && c.title === title)),
      }))
    return fault(e)
  }
  await moveIndexPaths(root, artifactAbs, targetAbs)
  for (const page of await contentPages(record.entity, targetAbs)) noteValueWrite(root, page)
  const roots = projectBaseline(tree).entries
  const unspent: string[] = []
  const unlinked = new Set<string>()
  if (record.entity === 'context') {
    if (title !== record.registry.title)
      await rekeyPassengers(targetAbs, record.registry.title, title)
    const titlesById = await restoredSpaceTitles(targetAbs)
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
    const group = tree.contexts.find((g) => g.def.id === parentId)
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
    const defs = await linkDefs(root)
    const trashed: StrippedLink[] = []
    for (const def of defs) {
      const values = Object.fromEntries(
        record.links.filter((l) => l.property === def.id).map((l) => [l.page, l.value]),
      )
      const rebuilt =
        landed === was ? {} : rewriteFrontmatterConnections(values, was, { title: landed })
      const all = { ...values, ...rebuilt }
      const taken = await refillValues(root, def, roots, all, frozen)
      for (const id of Object.keys(values))
        if (!roots[id]) trashed.push({ page: id, property: def.id, value: String(all[id]) })
        else if (!taken.has(id)) unlinked.add(id)
    }
    // A page or Space in the Trash takes its value back into its trashed copy, so it returns with it.
    await refillTrashed(root, trashed, new Map(defs.map((d) => [d.id, d.name])))
  }
  // The record outlives a partial re-tag, so what didn't come back stays written down.
  if (!unspent.length) {
    recordWrite(bundleAbs)
    await machine().remove(bundleAbs)
  }
  const outcome = {
    ...restored([...unspent, ...unlinked].map((id) => roots[id].title)),
    landed: targetRel,
  }
  if (record.entity !== 'collection' && record.entity !== 'set') return ok(outcome)
  return ok({
    ...outcome,
    rescope: await reseatExcludedFolders(root, targetRel, record.excluded ?? []),
  })
}

/** The ids of what's still here and didn't take its tag back; a root gone since has nothing to take it. */
async function reapply(
  root: string,
  roots: Record<string, EntityRecord>,
  key: string,
  additions: Record<string, string[]>,
): Promise<string[]> {
  const taken = await sweepRootsById(root, roots, additions, (raw, titles) => {
    const held = Array.isArray(raw[key])
      ? raw[key].filter((v): v is string => typeof v === 'string')
      : []
    return { ...raw, [key]: [...held, ...titles.filter((t) => !held.includes(t))] }
  })
  return Object.keys(additions).filter((id) => roots[id] && !taken.has(id))
}
