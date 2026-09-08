import { type Handlers, type HostContext, withRoot } from '../Contract/handlers'
import { errText, fail, ok, type Result } from '../Contract/result'
import { replayPendingRename } from '../Contexts/contextCascade'
import { ensureContextsRegistry } from '../Contexts/contextsRegistry'
import { seedContentIndex } from '../Index/indexSeed'
import { pathExists } from '../Files/atomicWrite'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { basename, dirname, join } from '../Paths/posix'
import { retireFileHistory, sweepFileHistory } from '../Pages/fileHistory'
import type { MutateRequest } from '../Pages/mutateRequest'
import { machine } from '../Platform/machine'
import { runRepairSweep } from '../Properties/repairSweep'
import { replaySchemaCascade } from '../Properties/replaySchemaCascade'
import { readPermanentDelete } from '../Settings/settings'
import { stampAdopted } from './adopt'
import { confirmWrite, pushAssetWrites, pushConfirmed, pushValueChanges } from './confirm'
import { ensureIdentity } from './identity'
import { importPlacedState } from './importPlacedState'
import { dropLiveTree, getLiveTree, refreshAfterWrite, refreshTree } from './liveTree'
import { handleMutate, type MutateDeps } from './mutate'
import { confirmMutation } from './mutatePatch'
import { runOpenLedger } from './remintLedger'
import { openSession, sessionRoot } from './session'
import type { NexusState } from './tree'

// Renderer-initiated sidecar saves are dropped while the session root swaps, so a mid-adopt save can't land in the NEW nexus's sidecars. A count: the open path runs more than one pass.
let adoptingDepth = 0
export const adopting = (): boolean => adoptingDepth > 0

async function prepareOpenedNexus(path: string): Promise<void> {
  try {
    await ensureIdentity(path)
    await ensureContextsRegistry(path)
  } catch (e) {
    console.error('ensure config-on-open failed:', e)
  }
  try {
    await stampAdopted(path)
  } catch (e) {
    console.error('Adopt/stamp pass failed:', e)
  }
}

export async function openNexusSequence(
  ctx: HostContext,
  path: string,
  latchRecord: boolean,
): Promise<string> {
  // Re-adopting the already-open nexus is a re-point of a live session, not a genuine open.
  const priorRoot = sessionRoot()
  if (priorRoot !== null) await retireFileHistory(priorRoot)
  await openSession(path)
  // openSession canonicalized the root; every step below keys off that string.
  const root = sessionRoot() ?? path
  await prepareOpenedNexus(root)
  await replayPendingRename(root)
  ctx.openStores(root)
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
    if (await importPlacedState(root)) await refreshAfterWrite(root)
    void runRepairSweep(root).then(() => pushValueChanges(ctx, root))
  }
  return root
}

/** `latchRecord: false` is the mid-session re-point's opt-out — a re-point that latched would diff the live session against the launch baseline, reporting every change as drift. */
export async function adoptNexus(
  ctx: HostContext,
  path: string,
  latchRecord = true,
): Promise<void> {
  adoptingDepth++
  try {
    const root = await openNexusSequence(ctx, path, latchRecord)
    await ctx.adopted(root, path)
  } finally {
    adoptingDepth--
  }
}

async function mutateDeps(ctx: HostContext): Promise<MutateDeps> {
  const root = sessionRoot()
  return {
    trashMode: await ctx.trashMode(),
    trashToSystem: (p) =>
      machine().trashToSystem?.(p) ?? Promise.reject(new Error('This host has no system trash.')),
    permanentDelete: root === null ? false : await readPermanentDelete(root),
  }
}

export const nexusHandlers = {
  'nexus:state': async (): Promise<Result<NexusState>> => {
    const root = sessionRoot()
    if (root === null) return ok({ status: 'empty' })
    const tree = getLiveTree() ?? (await refreshTree(root))
    return ok({ status: 'open', tree })
  },

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
  'nexus:rename': withRoot(async (root, ctx, newName: unknown) => {
    if (typeof newName !== 'string') return fail('operation-failed', 'A name is required.')
    const trimmed = newName.trim()
    if (trimmed.length === 0) return fail('operation-failed', 'The name can’t be empty.')
    if (trimmed.includes('/') || trimmed.includes('\\'))
      return fail('operation-failed', 'The name can’t contain a slash.')
    if (trimmed === basename(root))
      return fail('operation-failed', 'That’s already the nexus name.')
    const newRoot = join(dirname(root), trimmed)
    if (await pathExists(newRoot))
      return fail('operation-failed', 'A folder with that name already exists.')
    await retireFileHistory(root)
    await machine().rename(root, newRoot)
    await adoptNexus(ctx, newRoot, false)
    pushConfirmed(ctx, getLiveTree())
    return ok(null)
  }),

  'path:reveal': async (ctx, p: unknown) => {
    const root = sessionRoot()
    if (root === null || typeof p !== 'string') return ok(null)
    const r = await resolveUnderRoot(root, p)
    if (r.ok) ctx.reveal(r.value)
    return ok(null)
  },

  mutate: async (ctx, req: MutateRequest) => {
    const reply = await handleMutate(req, await mutateDeps(ctx))
    if (reply.ok) {
      await confirmWrite(ctx, (root) => confirmMutation(root, req, reply.value))
      pushAssetWrites(ctx)
    }
    return reply
  },
} satisfies Partial<Handlers>
