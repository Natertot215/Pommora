import { basename, dirname, isAtOrUnder, join, relative } from '../Paths/posix'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { containerAt, pageAt, spaceAt } from '../Nexus/treePatch'
import { liveTreeOf, mutableTarget, NOT_HELD } from '../Nexus/liveTree'
import { pagesOf } from '../Nexus/record'
import { isContainer } from '../Nexus/entities'
import { archivedSetIds, goneContainers, goneEdit } from '../Nexus/configReach'
import { isArchived } from '../Paths/nexusPaths'
import { pathExists, relocate, removeOwn } from '../Files/atomicWrite'
import { findHolders, type Holders } from '../Index/keyHolders'
import { contextKey } from '../Contexts/contexts'
import { finishEntry } from '../Nexus/finishOwed'
import { distinct, type Entry, owedDelete, runNoted } from '../Nexus/owed'
import { fail, fault, ok, type Result } from '../Contract/result'
import {
  mutateRegistryFile,
  readRegistryStrict,
  unlistContext,
  withContextAt,
} from '../Contexts/contextsRegistry'
import type { MutateContext } from '../Nexus/mutate'
import { dropDeparture } from '../Nexus/reorder'
import type { CascadeReport } from '../Nexus/cascade'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
import { contentPages, mintBundle, openBundle, spendBundle } from '../Bundles/bundle'
import { originPathOf } from '../Bundles/layout'
import {
  buildContextRecord,
  gatherContextEvidence,
  gatherLinkTargets,
  gatherSpaceRecord,
} from './gather'
import { gatherContentRecord, type RecordFile, writeRecord } from '../Bundles/record'
import { liftSetAside } from '../Nexus/folderEntity'

/** A delete naming an Archive bundle, or an inner item of one, takes it to the Trash under the chain it was archived from, so a Trash restore returns it there, and its record keeps the address it left for the Undo. Its pages' index rows sit at their Archive paths, while Link values name them where they lived. */
async function fromArchive(root: string, req: Extract<MutateRequest, { op: 'delete' }>) {
  if (!isArchived(req.path)) return null
  const resolved = await resolveUnderRoot(root, req.path)
  if (!resolved.ok) return NOT_HELD
  const opened = await openBundle(root, resolved.value)
  if (!opened.ok) return NOT_HELD
  const { store, record: held, artifact: abs } = opened.value
  if (store.kind !== 'archive' || !abs) return NOT_HELD
  if ((held.entity !== 'page' && held.entity !== 'set') || held.entity !== req.kind) return NOT_HELD
  const pages = await contentPages(held.entity, abs)
  const sets = held.entity === 'set' ? await archivedSetIds(root, abs) : []
  return ok({
    opened: opened.value,
    abs,
    origin: join(root, originPathOf(root, store, abs)),
    under: pages.map((file) => relative(root, file)),
    keys: pages.map((file) => originPathOf(root, store, file)),
    edit: sets.length ? goneContainers(sets) : null,
    record: { ...held, archive: relative(root, resolved.value) },
  })
}
/** A Context's or Space's delete note: every title it still owed and the current one leave, with the bundle a finish moves the folder into. */
const deleteNote =
  (
    root: string,
    kind: { kind: 'context' } | { kind: 'space'; contextId: string },
    title: string,
    bundle: string,
  ) =>
  (e: Entry | undefined): Entry => ({
    ...kind,
    strip: owedDelete(e ?? {}, title).strip,
    bundle: relative(root, bundle),
  })

export async function deleteOp(
  { root }: MutateContext,
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
  const lifted = !from && isContainer(req) ? await liftSetAside(root, abs) : null
  if (lifted && !lifted.ok) return lifted
  let moved = false
  try {
    // Write-ahead: the record lands before anything moves, a Space's or Context's built from what its holders held up front, then its note; every strip runs after the artifact moves, so a failed move strips nothing, and a strip that misses a file leaves the note for Try Again.
    const bundle = await mintBundle(root, { kind: 'trash' }, from?.origin ?? abs)
    const edit = from ? from.edit : goneEdit(before, req.kind, req.path)
    const under =
      from?.under ?? pagesOf(before).flatMap((p) => (isAtOrUnder(p.path, rel) ? p.path : []))
    const targets = await gatherLinkTargets(root, before, rel, under)
    const write = async (record: RecordFile | null): Promise<void> => {
      if (record)
        await writeRecord(bundle, {
          ...record,
          ...(Object.keys(targets).length ? { targets } : {}),
        })
    }
    // A refused note or list step leaves nothing deleted, so its bundle goes and a lifted set-aside comes back.
    const unminted = async <R extends { ok: false }>(r: R): Promise<R> => {
      await removeOwn(bundle)
      await lifted?.value.rollback()
      return r
    }
    // What sits under the deleted folder leaves and comes back with it, so its files are neither members to restore nor holders to strip.
    const outside = (h: Holders): Holders => ({
      ...h,
      held: h.held.filter((x) => !isAtOrUnder(x.file, abs)),
    })
    // The artifact moves, then what leaves with it.
    const leave = async (): Promise<void> => {
      await relocate(abs, join(bundle, basename(abs)))
      moved = true
      if (from) await spendBundle(root, from.opened)
      else await dropDeparture(root, before, req.kind, req.path)
    }
    // A delete in the one order: its note, its list step and the move, then the finish's own arm. A move that throws puts the list step back and refuses with nothing deleted; a Context entry that can't go back stays owed, and Try Again moves its folder.
    const deleted = (
      id: string,
      note: (e: Entry | undefined) => Entry,
      unlist = async (): Promise<Result<unknown>> => ok(null),
      relist = unlist,
    ) =>
      runNoted(root, id, {
        note,
        list: async () => {
          const unlisted = await unlist()
          if (!unlisted.ok) return unlisted
          return leave().then(
            () => ok(true),
            async (e) => {
              if (moved) throw e
              return (await relist()).ok ? fault(e) : ok(false)
            },
          )
        },
        sweep: async (left) => (left ? finishEntry(root, id) : { skipped: 1, hosts: [] }),
      })
    let stripped: CascadeReport | null = null
    if (req.kind === 'space') {
      const registry = await readRegistryStrict(root)
      const space = spaceAt(before, rel)
      if (!space) return fail('not-found', 'Unknown Space.')
      const query = {
        keys: [contextKey(basename(dirname(abs)))],
        reach: 'anywhere' as const,
        title: space.title,
      }
      await write(
        await gatherSpaceRecord(
          before,
          abs,
          registry,
          outside(await findHolders(root, query, 'values')),
        ),
      )
      const ran = await deleted(
        space.id,
        deleteNote(root, { kind: 'space', contextId: space.contextId }, space.title, bundle),
      )
      if (!ran.ok) return unminted(ran)
      stripped = ran.value.cascade
    } else if (req.kind === 'context') {
      const registry = contexts!.value
      const title = basename(abs)
      const at = registry.contexts.findIndex((c) => c.title === title)
      const entry = registry.contexts[at]
      if (!entry) return fail('not-found', 'Unknown Context.')
      const evidence = await gatherContextEvidence(abs, entry, at)
      const query = { keys: [contextKey(title)], reach: 'anywhere' as const }
      await write(buildContextRecord(evidence, outside(await findHolders(root, query, 'values'))))
      const ran = await deleted(
        entry.id,
        deleteNote(root, { kind: 'context' }, title, bundle),
        () => unlistContext(root, entry.id),
        () => mutateRegistryFile(root, withContextAt(entry, at)),
      )
      if (!ran.ok) return unminted(ran)
      stripped = ran.value.cascade
    } else {
      await write(from?.record ?? (await gatherContentRecord(root, before, req.kind, abs)))
      // Keyed by the live item's id, or by its path for an archived one; noted before the move, so a delete cut short finishes its strip and views at the next open.
      const id = (req.kind === 'page' ? pageAt(before, rel) : containerAt(before, rel))?.id ?? rel
      const ran = await deleted(id, () => ({
        kind: 'container',
        at: rel,
        strip: distinct(from?.keys ?? under),
        ...(edit ? { edit } : {}),
        bundle: relative(root, bundle),
      }))
      if (!ran.ok) return unminted(ran)
      stripped = ran.value.cascade
    }
    return ok({
      bundled: { bundlePath: relative(root, bundle) },
      ...(stripped ? { cascade: stripped } : {}),
    })
  } catch (e) {
    if (!moved) await lifted?.value.rollback()
    throw e
  }
}
