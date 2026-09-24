import { type Handlers, type HostContext, withRoot, withWriteRoot } from '../Contract/handlers'
import { errText, fail, ok, type Result } from '../Contract/result'
import { replayPendingRename } from '../Contexts/contextCascade'
import { ensureContextsRegistry } from '../Contexts/contextsRegistry'
import { seedContentIndex } from '../Index/indexSeed'
import { readHeadings } from '../Index/contentIndex'
import { isStringArray } from '../Contract/validators'
import { targetTaken } from '../Files/atomicWrite'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { basename, dirname, join } from '../Paths/posix'
import { retireFileHistory, sweepFileHistory } from '../Pages/fileHistory'
import type { MutateRequest } from './mutateRequest'
import { machine } from '../Platform/machine'
import { runRepairSweep } from '../Properties/repairSweep'
import { replaySchemaCascade } from '../Properties/replaySchemaCascade'
import { readPermanentDelete } from '../Settings/settings'
import { startSession, stopSession } from '../Sync/Client/session'
import { stampAdopted } from './adopt'
import { renameHeadingCascade } from './cascade'
import { confirmWrite, pushAssetWrites, pushConfirmed, pushValueChanges } from './confirm'
import { ensureIdentity } from './identity'
import { dropLiveTree, getLiveTree, refreshAfterWrite, refreshTree } from './liveTree'
import { ensureConfigLayout, normalizeSavedViews } from './migrateConfig'
import { handleMutate, type MutateDeps } from './mutate'
import { confirmMutation } from './mutatePatch'
import { runOpenLedger } from './remintLedger'
import { openSession, sessionRoot, whileAdopting } from './session'
import type { NexusState } from './tree'
import { livePathOf } from './valuesChanged'
import { titleFromPath } from '../Connections/connections'

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
    if (await replaySchemaCascade(root)) await refreshAfterWrite(root)
    void runRepairSweep(root).then(() => pushValueChanges(ctx, root))
  }
  void startSession(ctx, root, (getLiveTree() ?? (await refreshTree(root))).nexus.id)
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

async function mutateDeps(root: string, ctx: HostContext): Promise<MutateDeps> {
  return {
    trashMode: await ctx.trashMode(),
    trashToSystem: (p) =>
      machine().trashToSystem?.(p) ?? Promise.reject(new Error('This host has no system trash.')),
    permanentDelete: await readPermanentDelete(root),
  }
}

export const nexusHandlers = {
  'nexus:state': withRoot(
    async (root): Promise<Result<NexusState>> =>
      ok({ status: 'open', tree: getLiveTree() ?? (await refreshTree(root)) }),
    ok({ status: 'empty' }),
  ),

  'nexus:choose': async (ctx) => {
    const chosen = await ctx.pick('folder', { message: 'Choose a nexus folder' })
    if (!chosen) return ok(false)
    await adoptNexus(ctx, chosen)
    return ok(true)
  },

  // The one place a renderer-origin path enters; accepted only if it's an existing directory.
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
    if (typeof newName !== 'string') return fail('operation-failed', 'A name is required.')
    const trimmed = newName.trim()
    if (trimmed.length === 0) return fail('operation-failed', 'The name can’t be empty.')
    if (trimmed.includes('/') || trimmed.includes('\\'))
      return fail('operation-failed', 'The name can’t contain a slash.')
    if (trimmed === basename(root))
      return fail('operation-failed', 'That’s already the nexus name.')
    const newRoot = join(dirname(root), trimmed)
    if (await targetTaken(root, newRoot))
      return fail('operation-failed', 'A folder with that name already exists.')
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
    const reply = await handleMutate(req, await mutateDeps(root, ctx))
    if (reply.ok) {
      await confirmWrite(ctx, root, (root) => confirmMutation(root, req, reply.value))
      pushAssetWrites(ctx)
    }
    return reply
  }),
} satisfies Partial<Handlers>
