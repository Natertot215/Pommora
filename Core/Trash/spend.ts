import { basename, dirname, join, relative } from '../Paths/posix'
import { contextKey } from '../Contexts/contexts'
import { spaceIdsIn } from '../Contexts/spaceSidecar'
import type { MutateOutcome, MutateReply, RestoreDestination } from '../Nexus/mutateRequest'
import { fail, ok, type Result, fault } from '../Contract/result'
import { mutateRegistryFile, withContextAt } from '../Contexts/contextsRegistry'
import { restoreProperty } from './restoreProperty'
import { scrubReturning } from './restoreScrub'
import { readLiveSetting } from '../Settings/settings'
import { refillValues, sweepRootsById } from '../Nexus/governedSweep'
import { joinValues, landValue } from '../Files/rootValues'
import { rewriteConnections } from '../Connections/rewrite'
import { linkDefsOf, serializeSchemaOp } from '../Properties/propertiesRegistry'
import { asString } from '../Nexus/coerce'
import {
  contentPages,
  fileInto,
  openBundle,
  type OpenBundle,
  originPagesOf,
  originPathOf,
  pageIdsOf,
} from '../Bundles/bundle'
import { collectionOf, originOf, recordedPartly } from '../Bundles/record'
import { readJsonObject, relocate, removeOwn } from '../Files/atomicWrite'
import { dropPageMetadata } from '../Nexus/pageMetadata'
import { dropContextOrder } from '../Nexus/reorder'
import { machine } from '../Platform/machine'
import { noteOwn, recordWrite } from '../Files/writeEcho'
import { goneContainers } from '../Nexus/configReach'
import { collectionArchive } from '../Archive/archive'
import { refileLanded } from '../Archive/refile'
import { heldTreeOf, liveTreeOf } from '../Nexus/liveTree'
import { returningCascade } from '../Nexus/settle'
import { linkWorld, type NexusPages, nexusPages, shownTitle } from '../Nexus/heldPages'
import { joinCascades, type StrippedLink, withUnswept } from '../Nexus/cascade'
import { frozenWorld, parkLinks, refillTrashed } from './trashedCopies'
import type { TrashDeps } from './discard'
import { NO_DESTINATION, placeRecord } from '../Bundles/placement'
import { containerSchema, schemaOf } from '../Nexus/treePatch'
import { assignedIds } from '../Nexus/containerFields'
import { sidecarPath } from '../Paths/paths'
import { contextWorldOf } from '../Contexts/contextResolve'
import {
  distinct,
  editNote,
  OWED,
  owedName,
  owedReport,
  oweWorked,
  propertyNote,
  readNotes,
  restoreNote,
  type Worked,
} from '../Nexus/owed'
import { finishEntry } from '../Nexus/finishOwed'

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
    // Gone for good once its bundle goes, so its delete's finish reaches the Trash too; what it misses stays owed, so Try Again reaches it.
    const key = asString(record.def.key)
    const noted = await editNote(root, record.id, (e) => ({
      ...propertyNote(e),
      strip: distinct(propertyNote(e).strip, key ? [key] : []),
    }))
    if (!noted.ok) return noted
    await dispose(bundleAbs)
    return ok({
      cascade: owedReport(await serializeSchemaOp(root, () => finishEntry(root, record.id, deps))),
    })
  }
  if (!artifactAbs)
    return fail('not-found', "That deletion didn't finish, or something else is in with it.")
  const archive = record.entity === 'collection' ? await collectionArchive(root, record.id) : null
  const pages = await contentPages(record.entity, artifactAbs)
  const pageIds = await pageIdsOf([...pages, ...(archive?.files ?? [])])
  // Permanent now, a Collection's Archive with it: a Link value naming one of their pages, recorded by the delete or taken up since, names nothing any more unless another trashed page answers its key. Noted first, keyed by the bundle, so what the strip misses is owed and parked as a finish strips it.
  const id = relative(root, bundleAbs)
  const noted = await editNote(root, id, () => ({
    kind: 'container',
    at: relative(root, artifactAbs),
    strip: distinct(
      pages.map((file) => originPathOf(root, store, file)),
      archive?.origins,
    ),
    ...(archive?.sets.length ? { edit: goneContainers(archive.sets) } : {}),
    park: true,
  }))
  if (!noted.ok) return noted
  await dispose(artifactAbs)
  if (archive) await dispose(archive.abs)
  await dropPageMetadata(root, pageIds)
  if (record.entity === 'context') await dropContextOrder(root, record.registry.id)
  await removeOwn(bundleAbs)
  const recorded = 'links' in record ? (record.links ?? []) : []
  await parkLinks(root, recorded)
  return ok({ cascade: owedReport(await finishEntry(root, id, deps)) })
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
    const { unrestored, dropped, ...said } = rebuilt.value
    await parkLinks(root, dropped)
    // A value that no longer fits is named rather than kept: the property is back, so its record could only ever refuse.
    await removeOwn(bundleAbs)
    return ok({ ...restored(unrestored), ...said })
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
  const scrubbed = await scrubReturning(
    root,
    tree,
    record.entity,
    artifactAbs,
    schema,
    frozen,
    record.entity === 'context' ? contextKey(record.registry.title) : undefined,
  )
  await parkLinks(root, scrubbed.dropped)
  // A Context's identity lives ONLY in its registry entry, so it re-enters BEFORE anything moves: a refused write leaves the bundle intact — the restore is retryable — where an entry written after the move would destroy the evidence on failure and reply ok.
  const title = finalTitle ?? finalName
  // A Context's or Space's own owed titles never refuse it; another's do, since the work still due would land on it. Placement lands a Space only under the live Context its record's `parent` names.
  const landing =
    record.entity === 'context'
      ? { owner: { kind: 'context' as const }, name: title, except: record.registry.id }
      : record.entity === 'space' && record.parent.kind === 'context'
        ? {
            owner: { kind: 'space' as const, contextId: record.parent.id },
            name: title,
            except: record.id,
          }
        : null
  if (landing && owedName(await readNotes(root), landing)) return OWED
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
  // A conversion that can't land leaves the item live with its delete still owed: the next finish moves it back into its bundle, and the restore can be repeated (H-4).
  if (landing) {
    const converted = await restoreNote(root, landing.except)
    if (!converted.ok) return converted
  }
  await writeOrder?.()
  const arrived = await returningCascade(root, tree, back, title, {
    entity: record.entity,
    abs: targetAbs,
    rekey:
      record.entity === 'context' && title !== record.registry.title
        ? [record.registry.title, title]
        : undefined,
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
  const { after, own } = arrived
  const worked: Worked = {}
  // What the scrub worked out for a returning file it couldn't write follows the file to where it landed.
  for (const [file, values] of Object.entries(scrubbed.worked))
    worked[relative(root, join(targetAbs, file))] = values
  const settled = after && heldTreeOf(root)
  const unspent: string[] = []
  const unlinked = new Set<string>()
  if (record.entity === 'context') {
    const titlesById = new Map(
      [...(await spaceIdsIn(targetAbs)).ids].map(([name, id]) => [id, name]),
    )
    const additions: Record<string, string[]> = {}
    const above: Record<string, string | undefined> = {}
    for (const m of record.membership) {
      if (!m.root.id) continue
      const titles = m.spaces
        .map((s) => (s.id ? titlesById.get(s.id) : undefined))
        .filter((t): t is string => typeof t === 'string')
      if (titles.length) additions[m.root.id] = titles
      above[m.root.id] = m.root.above
    }
    unspent.push(...(await reapply(root, roots, contextKey(title), additions, above)))
  } else if (record.entity === 'space' && record.parent.kind === 'context') {
    const parentId = record.parent.id
    const group = contextWorldOf(tree.contexts).groupById.get(parentId)
    if (group) {
      const members = record.members.filter(
        (m): m is typeof m & { id: string } => typeof m.id === 'string',
      )
      const additions = Object.fromEntries(members.map((m) => [m.id, [title]]))
      const above = Object.fromEntries(members.map((m) => [m.id, m.above]))
      unspent.push(...(await reapply(root, roots, contextKey(group.def.title), additions, above)))
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
      const stripped = record.links.filter((l) => l.property === def.id)
      const all = Object.fromEntries(
        stripped.map((l) => [l.page, rewriteConnections(l.value, own)]),
      )
      const above = Object.fromEntries(stripped.map((l) => [l.page, l.above]))
      const { taken } = await refillValues(root, def, roots, all, refilled, above)
      for (const id of Object.keys(all))
        if (roots.get(id) === undefined)
          trashed.push({ page: id, property: def.id, value: all[id], above: above[id] })
        else if (!taken.has(id)) unlinked.add(id)
    }
    // A page or Space in the Trash takes its value back into its trashed copy, so it returns with it.
    Object.assign(worked, await refillTrashed(root, trashed, defs, refilled))
  }
  const owed = await oweWorked(root, relative(root, targetAbs), title, worked)
  const cascade = joinCascades(
    withUnswept(joinCascades(arrived.cascade, owed), title, scrubbed.unread),
    recordedPartly(stored, title),
  )
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

/** The ids of what's still here and didn't take its tag back, one of two files claiming its id among them; a root gone since has nothing to take it. A root that no longer holds the key takes it back above the key `above` names for it. */
async function reapply(
  root: string,
  roots: NexusPages['byId'],
  key: string,
  additions: Record<string, string[]>,
  above: Record<string, string | undefined>,
): Promise<string[]> {
  const { taken } = await sweepRootsById(root, roots, additions, above, (raw, titles) =>
    landValue(raw, key, joinValues(raw[key], titles)),
  )
  return Object.keys(additions).filter((id) => roots.get(id) !== undefined && !taken.has(id))
}
