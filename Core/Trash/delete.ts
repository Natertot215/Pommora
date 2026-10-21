import { basename, dirname, isAtOrUnder, join, relative } from '../Paths/posix'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { collectionArchive } from '../Archive/archive'
import { containerAt } from '../Nexus/treePatch'
import { liveTreeOf, mutableTarget, NOT_HELD } from '../Nexus/liveTree'
import { pagesOf } from '../Nexus/record'
import { dropPageMetadata } from '../Nexus/pageMetadata'
import { isContainer } from '../Nexus/entities'
import {
  archivedSetIds,
  goneContainers,
  goneEdit,
  reachConfig,
  reachReport,
} from '../Nexus/configReach'
import { isArchived } from '../Paths/nexusPaths'
import { pathExists, relocate, removeOwn } from '../Files/atomicWrite'
import { fail, ok, valueOr } from '../Contract/result'
import { mutateRegistryFile, readRegistryStrict, withContextAt } from '../Contexts/contextsRegistry'
import { unlinkContextKey, unlinkSpaceValue } from '../Contexts/contextCascade'
import type { MutateContext } from '../Nexus/mutate'
import { dropContextOrder, dropDeparture } from '../Nexus/reorder'
import { deleteCascade, joinCascades } from '../Nexus/cascade'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
import { machine } from '../Platform/machine'
import { discardFile } from './discard'
import { contentPages, mintBundle, openBundle, originPathOf, pageIdsOf } from '../Bundles/bundle'
import {
  buildContextRecord,
  gatherContextEvidence,
  gatherLinkTargets,
  gatherSpaceRecord,
} from './gather'
import { gatherContentRecord, type RecordFile, writeRecord } from '../Bundles/record'
import { liftSetAside } from '../Nexus/folderEntity'

/** A delete naming an Archive bundle takes the item inside it to the Trash under the chain it was archived from, so a Trash restore returns it there, and its record keeps the bundle it left for the Undo. Its pages' index rows sit at their Archive paths, while Link values name them where they lived. */
async function fromArchive(root: string, req: Extract<MutateRequest, { op: 'delete' }>) {
  if (!isArchived(req.path)) return null
  const resolved = await resolveUnderRoot(root, req.path)
  const opened = resolved.ok ? await openBundle(root, resolved.value) : null
  if (!opened?.ok) return NOT_HELD
  const { abs: bundle, store, record: held, artifact: abs } = opened.value
  if (store.kind !== 'archive' || !abs) return NOT_HELD
  if ((held.entity !== 'page' && held.entity !== 'set') || held.entity !== req.kind) return NOT_HELD
  const pages = await contentPages(held.entity, abs)
  const sets = held.entity === 'set' ? await archivedSetIds(root, abs) : []
  return ok({
    bundle,
    abs,
    origin: join(root, originPathOf(root, store, abs)),
    under: pages.map((file) => relative(root, file)),
    keys: pages.map((file) => originPathOf(root, store, file)),
    edit: sets.length ? goneContainers(sets) : null,
    record: { ...held, archive: relative(root, bundle) },
  })
}

export async function deleteOp(
  { root, deps }: MutateContext,
  req: Extract<MutateRequest, { op: 'delete' }>,
): Promise<MutateReply> {
  const archived = await fromArchive(root, req)
  if (archived && !archived.ok) return archived
  const from = archived?.value
  const resolved = from ? ok(from.abs) : await mutableTarget(root, req.path, [req.kind])
  if (!resolved.ok) return resolved
  const abs = resolved.value
  const rel = relative(root, abs)
  if (!(await pathExists(abs))) return fail('not-found', 'Nothing to delete.')
  const before = await liveTreeOf(root)
  const contexts = req.kind === 'context' ? await readRegistryStrict(root) : null
  if (contexts && !contexts.ok) return contexts
  if (!from && isContainer(req)) {
    const lifted = await liftSetAside(root, abs)
    if (!lifted.ok) return lifted
  }
  // Write-ahead: the record lands before any sweep destroys what it describes; a Space or Context sweep runs before its artifact moves and refuses on failure, a content strip runs after, so a failed move strips nothing, and the artifact moves before the configuration pass, so a delete cut short leaves evidence rather than silence.
  const bundle =
    deps.trashMode === 'system'
      ? null
      : await mintBundle(root, { kind: 'trash' }, from?.origin ?? abs)
  const archive =
    !bundle && req.kind === 'collection'
      ? await collectionArchive(root, containerAt(before, req.path)?.id)
      : null
  const edit = from ? from.edit : goneEdit(before, req.kind, req.path, archive?.sets)
  // With no bundle to keep them, the pages' metadata entries leave with the delete, by the ids their files carry before the move.
  const pageIds = bundle
    ? []
    : await pageIdsOf([...(await contentPages(req.kind, abs)), ...(archive?.files ?? [])])
  const under =
    from?.under ?? pagesOf(before).flatMap((p) => (isAtOrUnder(p.path, rel) ? p.path : []))
  const targets = bundle ? await gatherLinkTargets(root, before, rel, under) : {}
  const write = bundle
    ? async (record: RecordFile | null): Promise<void> => {
        if (record)
          await writeRecord(bundle, {
            ...record,
            ...(Object.keys(targets).length ? { targets } : {}),
          })
      }
    : null
  // A refused unlink leaves nothing deleted, so its bundle goes with it.
  const unmint = async (e: unknown): Promise<never> => {
    if (bundle) await removeOwn(bundle)
    throw e
  }
  let record: RecordFile | null = null
  let paths: string[] | null = null
  if (req.kind === 'space') {
    const registry = write ? await readRegistryStrict(root) : null
    if (write) await write(await gatherSpaceRecord(before, abs, registry, null))
    const swept = await unlinkSpaceValue(root, basename(dirname(abs)), basename(abs)).catch(unmint)
    if (write) await write(await gatherSpaceRecord(before, abs, registry, valueOr(swept, null)))
  } else if (req.kind === 'context') {
    const registry = contexts!.value
    const title = basename(abs)
    const at = registry.contexts.findIndex((c) => c.title === title)
    const entry = registry.contexts[at]
    const evidence = write && entry ? await gatherContextEvidence(abs, entry, at) : null
    if (write && evidence) await write(buildContextRecord(evidence, null))
    // By id, never by title: two entries sharing a title would otherwise erase both while only one folder is trashed.
    const removed = await mutateRegistryFile(root, (cur) =>
      entry ? { contexts: cur.contexts.filter((c) => c.id !== entry.id) } : cur,
    )
    if (!removed.ok) {
      if (bundle) await removeOwn(bundle)
      return removed
    }
    const swept = await unlinkContextKey(root, title, entry?.id, abs).catch(async (e) => {
      // A sweep cut short puts the entry back where it stood, so the Context can be deleted again.
      if (entry) await mutateRegistryFile(root, withContextAt(entry, at))
      return unmint(e)
    })
    if (entry && !bundle) await dropContextOrder(root, entry.id)
    if (write && evidence) await write(buildContextRecord(evidence, valueOr(swept, null)))
  } else {
    record = write
      ? (from?.record ?? (await gatherContentRecord(root, before, req.kind, abs)))
      : null
    if (write && record) await write({ ...record, partial: true })
    paths = from?.keys ?? under
  }
  if (bundle) await relocate(abs, join(bundle, basename(abs)))
  else await machine().lock(abs, () => discardFile(root, abs, deps))
  if (archive) await machine().lock(archive.abs, () => discardFile(root, archive.abs, deps))
  if (from) {
    await removeOwn(from.bundle)
  }
  if (!from) await dropDeparture(root, before, req.kind, req.path)
  await dropPageMetadata(root, pageIds)
  const gone = paths
    ? await deleteCascade(root, abs, [...paths, ...(archive?.origins ?? [])])
    : null
  if (write && record && gone)
    await write({
      ...record,
      ...(gone.links.length ? { links: gone.links } : {}),
      ...(gone.cascade.warning ? { partial: true as const } : {}),
    })
  const reach = edit ? reachReport(await reachConfig(root, edit)) : null
  const cascade = gone && reach ? joinCascades(gone.cascade, reach) : (gone?.cascade ?? reach)
  return ok({
    ...(bundle ? { bundled: { bundlePath: relative(root, bundle) } } : {}),
    ...(cascade ? { cascade } : {}),
  })
}
