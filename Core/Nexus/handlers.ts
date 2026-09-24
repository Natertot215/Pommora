import { type Handlers, type HostContext, withRoot, withWriteRoot } from '../Contract/handlers'
import { errText, fail, ok, type Result, fault } from '../Contract/result'
import { replayPendingRename } from '../Contexts/contextCascade'
import { ensureContextsRegistry } from '../Contexts/contextsRegistry'
import { seedContentIndex } from '../Index/indexSeed'
import { readHeadings } from '../Index/contentIndex'
import { isStringArray } from '../Contract/validators'
import { targetTaken } from '../Files/atomicWrite'
import { nameError } from '../Paths/names'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { basename, dirname, join, titleFromPath } from '../Paths/posix'
import { retireFileHistory, sweepFileHistory } from '../Pages/fileHistory'
import type { MutateRequest } from './mutateRequest'
import { machine } from '../Platform/machine'
import { runRepairSweep } from '../Properties/repairSweep'
import { replaySchemaCascade } from '../Properties/replaySchemaCascade'
import { startSession, stopSession } from '../Sync/Client/session'
import { stampAdopted } from './adopt'
import { renameHeadingCascade } from './cascade'
import { confirmWrite, pushAssetWrites, pushConfirmed, pushValueChanges } from './confirm'
import { ensureIdentity } from './identity'
import { dropLiveTree, getLiveTree, liveTreeOf, refreshAfterWrite, refreshTree } from './liveTree'
import { ensureConfigLayout, normalizeSavedViews } from './migrateConfig'
import { handleMutate } from './mutate'
import { confirmBy, confirmMutation } from './mutatePatch'
import { runOpenLedger } from './remintLedger'
import { openSession, sessionRoot, whileAdopting } from './session'
import type { NexusState } from './tree'
import { livePathOf } from './valuesChanged'
import { trashDeps } from '../Trash/bundle'

async function prepareOpenedNexus(path: string): Promise<string | null> {
  let nexusId: string | null = null
  try {
    nexusId = (await ensureIdentity(path)).id
    await ensureConfigLayout(path)
    await ensureContextsRegistry(path)
    await normalizeSavedViews(path)
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
): Promise<string> {
  // Re-adopting the already-open nexus is a re-point of a live session, not a genuine open.
  const priorRoot = sessionRoot()
  await stopSession(ctx)
  if (priorRoot !== null) await retireFileHistory(priorRoot)
  await openSession(path)
  // openSession canonicalized the root; every step below keys off that string.
  const root = sessionRoot() ?? path
  const nexusId = await prepareOpenedNexus(root)
  // A sync start for the old root that shared the first stop's wait began after it; this stop retires it before the new stores bind.
  await stopSession(ctx)
  ctx.openStores(root, nexusId)
  await replayPendingRename(root)
  if (root !== priorRoot) {
    void sweepFileHistory(root)
    dropLiveTree()
    if (latchRecord) {
      await runOpenLedger(root)
    } else {
      try {
        await refreshTree(root)
      } catch (e) {
        console.error('adopt: the seed walk failed; reads will retry:', errText(e))
      }
    }
    await seedContentIndex(root)
    if (await replaySchemaCascade(root))
      await refreshAfterWrite(root).catch((e) =>
        console.error('adopt: the replayed schema walk failed; reads will retry:', errText(e)),
      )
    void runRepairSweep(root).then(() => pushValueChanges(ctx, root))
  }
  if (nexusId !== null) void startSession(ctx, root, nexusId)
  return root
}

/** `latchRecord: false` is the mid-session re-point's opt-out — a re-point that latched would diff the live session against the launch baseline, reporting every change as drift. */
export async function adoptNexus(
  ctx: HostContext,
  path: string,
  latchRecord = true,
): Promise<void> {
  await whileAdopting(async () => {
    const root = await openNexusSequence(ctx, path, latchRecord)
    await ctx.adopted(root, path)
  })
}

export const nexusHandlers = {
  'nexus:state': withRoot(
    async (root): Promise<Result<NexusState>> =>
      ok({ status: 'open', tree: await liveTreeOf(root) }),
    ok({ status: 'empty' }),
  ),

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
    pushConfirmed(ctx, getLiveTree())
    return ok(null)
  }),

  'index:headings': withRoot(async (_root, _ctx, paths: unknown) =>
    ok(readHeadings(isStringArray(paths) ? paths : undefined) ?? {}),
  ),

  'connections:headingRenamed': withWriteRoot(
    async (root, _ctx, pageId, oldHeading, newHeading) => {
      const rel = livePathOf(root, pageId)
      if (!rel) return ok({ touched: [] })
      return renameHeadingCascade(root, titleFromPath(rel), oldHeading, newHeading, rel)
    },
  ),

  'path:reveal': withRoot(async (root, ctx, p: unknown) => {
    if (typeof p !== 'string') return ok(null)
    const r = await resolveUnderRoot(root, p)
    if (r.ok) ctx.reveal(r.value)
    return ok(null)
  }, ok(null)),

  mutate: withWriteRoot(async (root, ctx, req: MutateRequest) => {
    const reply = await handleMutate(root, req, await trashDeps(root, ctx), () =>
      confirmWrite(ctx, root, () => confirmBy(root, async () => 'refresh')),
    )
    if (reply.ok) {
      await confirmWrite(ctx, root, () => confirmMutation(root, req, reply.value))
      pushAssetWrites(ctx, root)
    }
    return reply
  }),
} satisfies Partial<Handlers>
