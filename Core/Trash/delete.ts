import { basename, dirname, isAtOrUnder, join, relative } from '../Paths/posix'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { containerAt, pageAt, spaceAt } from '../Nexus/treePatch'
import { liveTreeOf, mutableTarget, NOT_HELD } from '../Nexus/liveTree'
import { pagesOf } from '../Nexus/record'
import { isContainer } from '../Nexus/entities'
import { archivedSetIds, type ConfigEdit, goneContainers, goneEdit } from '../Nexus/configReach'
import { isArchived } from '../Paths/nexusPaths'
import { pathExists, removeOwn } from '../Files/atomicWrite'
import { findHolders, type Holders } from '../Index/keyHolders'
import { contextKey } from '../Contexts/contexts'
import { finishEntry, leave } from '../Nexus/finishOwed'
import { containerNote, type Entry, owedDelete, runNoted } from '../Nexus/owed'
import { fail, fault, ok, type Result } from '../Contract/result'
import {
  mutateRegistryFile,
  readRegistryStrict,
  unlistContext,
  withContextAt,
} from '../Contexts/contextsRegistry'
import type { MutateContext } from '../Nexus/mutate'
import type { Departing } from '../Nexus/reorder'
import type { NexusTree } from '../Nexus/tree'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
import { contentPages, mintBundle, openBundle, spendBundle } from '../Bundles/bundle'
import { originPathOf } from '../Bundles/layout'
import { gatherContextRecord, gatherLinks, gatherLinkTargets, gatherSpaceRecord } from './gather'
import { type ContentRecord, gatherContentRecord, type RecordFile } from '../Bundles/record'
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
/** A Context's or Space's delete note: every title it still owed and the current one leave. */
const deleteNote =
  (kind: { kind: 'context' } | { kind: 'space'; contextId: string }, title: string) =>
  (e: Entry | undefined): Entry => ({ ...kind, strip: owedDelete(e ?? {}, title).strip })

/** What one kind's delete takes, gathered before anything is minted: the id its note is keyed by, its record, its note, the order entry its `leave` drops, and a Context's list step with the step that puts its entry back. */
interface DeletePlan {
  id: string
  record: RecordFile
  note: (e: Entry | undefined) => Entry
  departing?: Departing
  unlist?: () => Promise<Result<unknown>>
  relist?: () => Promise<Result<unknown>>
}

async function planOf(
  root: string,
  req: Extract<MutateRequest, { op: 'delete' }>,
  abs: string,
  before: NexusTree,
  from: { record: ContentRecord; keys: string[]; edit: ConfigEdit | null } | undefined,
  under: string[],
): Promise<Result<DeletePlan>> {
  const rel = relative(root, abs)
  // What sits under the deleted folder leaves and comes back with it, so its files are neither members to restore nor holders to strip.
  const outside = (h: Holders): Holders => ({
    ...h,
    held: h.held.filter((x) => !isAtOrUnder(x.file, abs)),
  })
  switch (req.kind) {
    case 'space': {
      const space = spaceAt(before, rel)!
      const query = {
        keys: [contextKey(basename(dirname(abs)))],
        reach: 'anywhere' as const,
        title: space.title,
      }
      const held = outside(await findHolders(root, query, 'values'))
      return ok({
        id: space.id,
        record: gatherSpaceRecord(before, space, held),
        note: deleteNote({ kind: 'space', contextId: space.contextId }, space.title),
        departing: space,
      })
    }
    case 'context': {
      const registry = await readRegistryStrict(root)
      if (!registry.ok) return registry
      const title = basename(abs)
      const at = registry.value.contexts.findIndex((c) => c.title === title)
      const entry = registry.value.contexts[at]
      if (!entry) return fail('not-found', 'Unknown Context.')
      const query = { keys: [contextKey(title)], reach: 'anywhere' as const }
      const held = outside(await findHolders(root, query, 'values'))
      return ok({
        id: entry.id,
        record: gatherContextRecord(before, entry, held),
        note: deleteNote({ kind: 'context' }, title),
        departing: { kind: 'context', id: entry.id },
        unlist: () => unlistContext(root, entry.id),
        relist: () => mutateRegistryFile(root, withContextAt(entry, at)),
      })
    }
    default: {
      const node = req.kind === 'page' ? pageAt(before, rel) : containerAt(before, rel)
      const strip = from?.keys ?? under
      const edit = from ? from.edit : goneEdit(before, req.kind, req.path)
      const record = from?.record ?? gatherContentRecord(before, node!)
      const links = await gatherLinks(root, abs, strip)
      return ok({
        // Keyed by the live item's id, or by its path for an archived one; noted before the move, so a delete cut short finishes its strip and views at the next open.
        id: node?.id ?? rel,
        record: links.length ? { ...record, links } : record,
        note: () => containerNote(rel, strip, edit),
        departing: node ?? undefined,
      })
    }
  }
}

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
  const under =
    from?.under ?? pagesOf(before).flatMap((p) => (isAtOrUnder(p.path, rel) ? p.path : []))
  const planned = await planOf(root, req, abs, before, from, under)
  if (!planned.ok) return planned
  const plan = planned.value
  const targets = await gatherLinkTargets(root, before, rel, under)
  const lifted = !from && isContainer(req) ? await liftSetAside(root, abs) : null
  if (lifted && !lifted.ok) return lifted
  let bundle: string | undefined
  // Nothing is deleted while the artifact stands where it was, so a delete refused or thrown by then takes its bundle back and puts a lifted set-aside back.
  const unmoved = async (): Promise<void> => {
    if (!(await pathExists(abs))) return
    if (bundle) await removeOwn(bundle)
    await lifted?.value.rollback()
  }
  try {
    // Write-ahead: the record lands with its bundle, holding what every strip will take, then the note, then the list step and the move; every strip runs after the artifact moves, so a failed move strips nothing, and a strip that misses a file leaves the note for Try Again.
    bundle = await mintBundle(root, { kind: 'trash' }, from?.origin ?? abs, {
      ...plan.record,
      ...(Object.keys(targets).length ? { targets } : {}),
    })
    const into = relative(root, bundle)
    const ran = await runNoted(root, plan.id, {
      note: (e) => ({ ...plan.note(e), bundle: into }),
      // A move that throws puts the list step back and refuses with nothing deleted; a Context entry that can't go back stays owed, and Try Again moves its folder.
      list: async () => {
        const unlisted = (await plan.unlist?.()) ?? ok(null)
        if (!unlisted.ok) return unlisted
        try {
          await leave(root, abs, into, plan.departing)
        } catch (e) {
          if (!(await pathExists(abs))) throw e
          return ((await plan.relist?.()) ?? ok(null)).ok ? fault(e) : ok(false)
        }
        if (from) await spendBundle(root, from.opened)
        return ok(true)
      },
      sweep: async (left) => (left ? finishEntry(root, plan.id) : { skipped: 1, hosts: [] }),
    })
    if (!ran.ok) await unmoved()
    return ran.ok ? ok({ bundled: { bundlePath: into }, cascade: ran.value.cascade }) : ran
  } catch (e) {
    await unmoved()
    throw e
  }
}
