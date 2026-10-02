import { type Handlers, type HostContext, withRoot, withWriteRoot } from '../Contract/handlers'
import { errText, fail, ok, type Result, fault } from '../Contract/result'
import { replayPendingRename } from '../Contexts/contextCascade'
import { ensureContextsRegistry } from '../Contexts/contextsRegistry'
import { seedContentIndex } from '../Index/indexSeed'
import { readHeadings } from '../Index/contentIndex'
import { isStringArray } from '../Contract/validators'
import { forgetLastReads, targetTaken } from '../Files/atomicWrite'
import { nameError } from '../Paths/names'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { basename, dirname, join } from '../Paths/posix'
import { retireFileHistory, sweepFileHistory } from '../Pages/fileHistory'
import { mutateRequest } from './mutateRequest'
import { machine } from '../Platform/machine'
import { runRepairSweep } from '../Properties/repairSweep'
import { replaySchemaCascade } from '../Properties/replaySchemaCascade'
import { startSession, stopSession } from '../Sync/Client/session'
import { stampAdopted, stampMissing } from './adopt'
import { oweCascade } from './fileEvents'
import { ensureIdentity } from './identity'
import { dropLiveTree, liveTreeOf, seedLiveTree } from './liveTree'
import { ensureConfigLayout, normalizePropertyTypes, normalizeSavedViews } from './migrateConfig'
import { handleMutate } from './mutate'
import { dropTileHeadingLinks } from '../Tiles/tilesFile'
import { runOpenLedger } from './remintLedger'
import { openSession, sessionRoot, waitingOpen, waitOn, whileAdopting } from './session'
import { readNexus, readNexusConfig } from './readNexus'
import { asString } from './coerce'
import { settleNow, handed } from './settle'
import type { NexusState } from './tree'
import { trashDeps } from '../Trash/bundle'

async function prepareOpenedNexus(path: string): Promise<string | null> {
  let nexusId: string | null = null
  try {
    nexusId = (await ensureIdentity(path)).id
    await ensureConfigLayout(path)
    await ensureContextsRegistry(path)
    await normalizeSavedViews(path)
    await normalizePropertyTypes(path)
  } catch (e) {
    console.error('ensure config-on-open failed:', e)
  }
  try {
    await stampAdopted(path)
  } catch (e) {
    console.error('Adopt/stamp pass failed:', e)
  }
  return nexusId
}

export async function openNexusSequence(
  ctx: HostContext,
  path: string,
  latchRecord: boolean,
): Promise<void> {
  // Re-adopting the already-open nexus is a re-point of a live session, not a genuine open.
  const priorRoot = sessionRoot()
  await stopSession(ctx)
  if (priorRoot !== null) await retireFileHistory(priorRoot)
  await openSession(path)
  // openSession canonicalized the root; every step below keys off that string.
  const root = sessionRoot() ?? path
  if (root !== priorRoot) {
    forgetLastReads()
    dropLiveTree()
    dropTileHeadingLinks()
  }
  const config = await readNexusConfig(root).catch(errText)
  // A sync start for the old root that shared the first stop's wait began after it; either branch stops it again before the new stores bind.
  if (typeof config === 'string') {
    await stopSession(ctx)
    ctx.openStores(root, null)
    waitOn({ root, path, why: config })
    return
  }
  // A reopen of the open Nexus reads a damaged identity as its kept copy, where the strict ensure reads none.
  const nexusId = (await prepareOpenedNexus(root)) ?? asString(config[0]?.id) ?? null
  await stopSession(ctx)
  ctx.openStores(root, nexusId)
  await replayPendingRename(root)
  if (root !== priorRoot) {
    void sweepFileHistory(root)
    try {
      let tree = await readNexus(root)
      // Every page it lists is stamped, since no event comes for a file that predates the watcher, and read again rather than patched, since a first adoption stamps every page and one more read costs less than a patch per stamp.
      while (await stampMissing(root, tree.unreadable)) tree = await readNexus(root)
      seedLiveTree(tree)
      if (latchRecord) await runOpenLedger(root, tree)
    } catch (e) {
      console.error('adopt: the seed walk failed; reads will retry:', errText(e))
    }
    const reread = await seedContentIndex(root)
    await replaySchemaCascade(root)
    await settleNow(ctx, root)
    void runRepairSweep(root, reread).then(() => settleNow(ctx, root))
  }
  if (nexusId !== null) void startSession(ctx, root, nexusId)
}

/** `latchRecord: false` is the mid-session re-point's opt-out — a re-point that latched would diff the live session against the launch baseline, reporting every change as drift. */
export async function adoptNexus(
  ctx: HostContext,
  path: string,
  latchRecord = true,
): Promise<void> {
  await whileAdopting(async () => {
    await openNexusSequence(ctx, path, latchRecord)
    await ctx.adopted(path)
  })
}

export const nexusHandlers = {
  'nexus:state': async (): Promise<Result<NexusState>> => {
    const root = sessionRoot()
    if (root) return ok({ status: 'open', ...handed(await liveTreeOf(root)) })
    const open = waitingOpen()
    return open ? fail('operation-failed', open.why) : ok({ status: 'empty' })
  },

  'nexus:choose': async (ctx) => {
    const chosen = await ctx.pick('folder', { message: 'Choose a nexus folder' })
    if (!chosen) return ok(false)
    await adoptNexus(ctx, chosen)
    return ok(true)
  },

  // A renderer-origin path, accepted only if it's an existing directory.
  'nexus:openPath': async (ctx, p: unknown) => {
    if (typeof p !== 'string' || p.length === 0) return ok(false)
    const stat = await machine()
      .stat(p)
      .catch(() => null)
    if (!stat?.isDirectory) return ok(false)
    await adoptNexus(ctx, p)
    return ok(true)
  },

  // Not a mutate op: it re-targets the whole session, so adoptNexus re-opens the session, stores, watcher, and recents at the new path.
  'nexus:rename': withWriteRoot(async (root, ctx, newName: unknown) => {
    if (typeof newName !== 'string') return fault('A name is required.')
    const why = nameError(newName, 'directory')
    if (why) return fail('invalid-name', why)
    if (newName === basename(root)) return fault('That’s already the nexus name.')
    const newRoot = join(dirname(root), newName)
    if (await targetTaken(root, newRoot)) return fail('exists', `"${newName}" already exists.`)
    await retireFileHistory(root)
    await machine().rename(root, newRoot)
    await adoptNexus(ctx, newRoot, false)
    return ok(null)
  }),

  'index:headings': withRoot(async (_root, _ctx, paths: unknown) =>
    ok(readHeadings(isStringArray(paths) ? paths : undefined) ?? {}),
  ),

  'path:reveal': withRoot(async (root, ctx, p: unknown) => {
    if (typeof p !== 'string') return ok(null)
    const r = await resolveUnderRoot(root, p)
    if (r.ok) ctx.reveal(r.value)
    return ok(null)
  }, ok(null)),

  mutate: withWriteRoot(async (root, ctx, raw: unknown) => {
    const read = mutateRequest.safeParse(raw)
    if (!read.success) return fault('Malformed request.')
    const req = read.data
    const reply = await handleMutate(root, req, await trashDeps(root, ctx))
    if (!reply.ok) return reply
    const { cascade } = reply.value
    // A delete's or an empty's linkers changed frontmatter alone, which `values:changed` carries.
    const absorbed = req.op === 'delete' || req.op === 'emptyBundle' ? [] : (cascade?.pages ?? [])
    oweCascade(root, absorbed, cascade?.hosts ?? [])
    return reply
  }),
} satisfies Partial<Handlers>
