// Every renderer mutation arrives here with the root the session gate holds and routes to the module that owns the operation. Arms carrying only a resolve and one module call stay in place.

import { setOrDrop } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { isMarkdownFile, titleFromPath } from '../Paths/posix'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { contextsDir } from '../Paths/paths'
import { machine } from '../Platform/machine'
import { fault, ok, type Result } from '../Contract/result'
import { emptyBundle, restoreArtifact } from '../Trash/spend'
import { archiveOp, restoreArchived } from '../Archive/archive'
import { openBundle, storeOf } from '../Bundles/bundle'
import { deleteOp } from '../Trash/delete'
import { updateSettings } from '../Settings/settings'
import { setProfileImageOp } from '../Assets/setProfileImage'
import { setCropOp } from '../Assets/setCrop'
import { setBannerOp } from '../Pages/setBanner'
import { setIconOp } from '../Pages/setIcon'
import { setHeadingIconHiddenOp } from '../Pages/setHeadingIconHidden'
import { setPagePropertyOp, setSpacePropertyOp } from '../Properties/setProperty'
import {
  createContextGroup,
  setContextOp,
  setSpaceColor,
  setSpaceRowOrder,
} from '../Contexts/contextWrite'
import { renameContextOp, renameSpaceOp, type Unswept } from '../Contexts/contextCascade'
import { reorderContextsOp } from '../Contexts/reorderContexts'
import {
  DEFAULT_NEW_NAME,
  done,
  seedsContext,
  type MutateReply,
  type MutateRequest,
} from './mutateRequest'
import { CONTAINER_KINDS } from './entities'
import { setActiveView } from '../Views/viewsFile'
import type { TrashDeps } from '../Trash/discard'
import { createContainerOp, createPageOp, createSpaceOp } from './create'
import { movePageOp, moveSetOp } from './move'
import { editPageAliases, writePageMeta } from './pageMetadata'
import { renameOp } from './rename'
import { type CascadeReport, joinCascades, linksNotUpdated, renameCascade } from './cascade'
import { setChildOrder, setCollectionOrder, setPanelContextOrder, setSpaceOrder } from './reorder'
import { liveTreeOf, mutableTarget } from './liveTree'
import { oweRetry, oweWalk } from './fileEvents'
import { reachReport } from './configReach'
import { inSettleTurn, payOwedWalk, relink, settledIndex } from './settle'
import { pageMoves } from './record'

export interface MutateContext {
  root: string
  deps: TrashDeps
}

export async function handleMutate(
  root: string,
  req: MutateRequest,
  deps: TrashDeps,
): Promise<MutateReply> {
  try {
    return await dispatch({ root, deps }, req)
  } catch (e) {
    return fault(e)
  }
}

// A rename's Try Again is the request again with the title it left, whether the journal took the rename or its slot refused it, since a refused one has no record to replay and a later rename displaces a taken one's; a property cascade's replays its record through `property:replay`.
function renamed(
  req: Extract<MutateRequest, { op: 'renameContext' | 'renameSpace' }>,
  r: Result<Unswept | null>,
): MutateReply {
  if (!r.ok) return r
  if (!r.value) return ok({})
  const { skipped, from } = r.value
  return ok({ cascade: reachReport({ skipped, hosts: [] }), retry: { ...req, from } })
}

async function dispatch(ctx: MutateContext, req: MutateRequest): Promise<MutateReply> {
  const { root, deps } = ctx
  // A write sent here changes which Contexts and Spaces exist or what they're titled, or resolves a Space by title or path to write a tag or the Space's sidecar, so it holds the Contexts folder's one lock until the walk it owed is paid and resolves against a world no rename or delete is moving: a tag or Space value written mid-rename lands under the new key, and one naming a Space by a path the rename moved answers the refusal. A page's value write runs outside it, since it takes the page's own lock, which every sweep takes too, and never shrinks or drops a key it can't resolve (`reconcileGovernedRoot` in `contextResolve.ts`), so it lands right whether it comes before or after a sweep reaches the page.
  const underContexts = <T>(fn: () => Promise<T>): Promise<T> =>
    machine().lock(contextsDir(root), async () => {
      try {
        return await fn()
      } finally {
        await payOwedWalk(root)
      }
    })
  // A write that moves, adds, sweeps, or removes a page runs in the settle's turn, nested inside `underContexts` rather than around it, since that lock's `finally` takes a turn of its own. One that can move or add a page re-spells by the index's difference across it: a first commit's rename arrives without moving, so a stale link to the name the page was born with never follows it, and a page created under the default name is no arrival, since its first commit is where it arrives.
  const addressed = (
    req: Extract<MutateRequest, { op: 'createPage' | 'rename' | 'movePage' | 'moveSet' }>,
    fn: () => Promise<MutateReply>,
  ): Promise<MutateReply> =>
    inSettleTurn(root, async () => {
      const before = await settledIndex(root)
      const reply = await fn()
      if (!reply.ok) return reply
      const after = await settledIndex(root)
      const firstCommit = req.op === 'rename' && req.fromCreate === true
      const label =
        req.op === 'createPage' ? req.name : firstCommit ? req.newName : titleFromPath(req.path)
      let cascade: CascadeReport | undefined = linksNotUpdated(label)
      if (before && after) {
        const { moved, arrived } = pageMoves(before.byId, after.byId)
        const arrivals = req.op === 'createPage' && req.name === DEFAULT_NEW_NAME ? [] : arrived
        const stayed = firstCommit ? [] : moved
        cascade = await relink(root, before, after, label, stayed, [...moved, ...arrivals])
      }
      if (!cascade) return reply
      return ok({
        ...reply.value,
        cascade: reply.value.cascade ? joinCascades(reply.value.cascade, cascade) : cascade,
      })
    })
  switch (req.op) {
    case 'createPage':
      return seedsContext(req)
        ? underContexts(() => addressed(req, () => createPageOp(ctx, req)))
        : addressed(req, () => createPageOp(ctx, req))

    case 'createContainer':
      return createContainerOp(ctx, req)

    case 'rename':
      return addressed(req, () => renameOp(ctx, req))

    case 'renameHeading':
      return inSettleTurn(root, async () => ok({ cascade: await renameCascade(root, req, true) }))

    case 'delete':
      return req.kind === 'space' || req.kind === 'context'
        ? underContexts(() => inSettleTurn(root, () => deleteOp(ctx, req)))
        : inSettleTurn(root, () => deleteOp(ctx, req))

    case 'archive':
      return inSettleTurn(root, () => archiveOp(ctx, req))

    // An Archive bundle holds a page or Set alone, so its restore changes no Context and takes no Contexts lock.
    case 'restore': {
      const resolved = await resolveUnderRoot(root, req.bundlePath)
      if (!resolved.ok) return resolved
      const restore = async (): Promise<MutateReply> => {
        const opened = await openBundle(root, resolved.value)
        if (!opened.ok) return opened
        const { store } = opened.value
        return store.kind === 'archive'
          ? restoreArchived(root, opened.value, store, req.destination)
          : restoreArtifact(root, opened.value, req.destination)
      }
      return storeOf(root, resolved.value)?.kind === 'archive'
        ? inSettleTurn(root, restore)
        : underContexts(() => inSettleTurn(root, restore))
    }

    case 'emptyBundle': {
      const resolved = await resolveUnderRoot(root, req.bundlePath)
      return resolved.ok
        ? inSettleTurn(root, () => emptyBundle(root, resolved.value, deps))
        : resolved
    }

    case 'setProfileImage':
      return setProfileImageOp(ctx, req)

    case 'setProfileIcon': {
      await updateSettings(root, (cur) => setOrDrop(cur, 'profile_icon', req.icon))
      return ok({})
    }

    case 'setCrop':
      return setCropOp(ctx, req)

    case 'setBanner':
      return setBannerOp(ctx, req)

    case 'setHeadingIconHidden':
      return setHeadingIconHiddenOp(ctx, req)

    case 'setIcon':
      return setIconOp(ctx, req)

    case 'setDisclosureLock': {
      const folder = await mutableTarget(root, req.path, [req.kind])
      if (!folder.ok) return folder
      return done(
        await patchSidecar(folder.value, req.kind, (cur) =>
          setOrDrop(cur, 'disclosure_locked', req.locked),
        ),
      )
    }

    case 'setActiveView': {
      const folder = await mutableTarget(root, req.path, [req.kind])
      if (!folder.ok) return folder
      return done(await setActiveView(folder.value, req.kind, req.viewId))
    }

    case 'setProperty':
    case 'restoreValue':
      return isMarkdownFile(req.path)
        ? setPagePropertyOp(ctx, req)
        : underContexts(() => setSpacePropertyOp(ctx, req))

    case 'setPageMeta':
      return writePageMeta(root, req.path, req.patch)

    case 'editAliases':
      return editPageAliases(root, req.path, req.edit)

    case 'movePage':
      return addressed(req, () => movePageOp(ctx, req))

    case 'moveSet':
      return addressed(req, () => moveSetOp(ctx, req))

    case 'reorderChildren': {
      const parent = await mutableTarget(root, req.parentPath, CONTAINER_KINDS)
      return parent.ok ? done(await setChildOrder(parent.value, req.key, req.order)) : parent
    }

    case 'reorderTop':
      return done(await setCollectionOrder(root, req.order))

    case 'createContextGroup': {
      const r = await createContextGroup(root, req.name, req.id)
      return r.ok ? ok({ created: r.value }) : r
    }

    case 'createSpace':
      return underContexts(() => createSpaceOp(ctx, req))

    case 'setContext':
      return underContexts(() => setContextOp(ctx, req))

    case 'setSpaceColor':
      return done(await underContexts(() => setSpaceColor(root, req.spaceId, req.color)))

    case 'renameContext':
      return renamed(
        req,
        await underContexts(() => renameContextOp(root, req.contextId, req.newName, req.from)),
      )

    case 'renameSpace':
      return renamed(
        req,
        await underContexts(() => renameSpaceOp(root, req.spaceId, req.newName, req.from)),
      )

    case 'reorderContexts':
      return reorderContextsOp(ctx, req)

    case 'reorderPanelContexts':
      return done(await setPanelContextOrder(root, req.ids))

    case 'reorderSpaces':
      return done(await setSpaceOrder(root, req.contextId, req.ids))

    case 'setSpaceRowOrder':
      return underContexts(async () => {
        const resolved = await mutableTarget(root, req.path, ['space'])
        if (!resolved.ok) return resolved
        return done(await setSpaceRowOrder(resolved.value, req.ids))
      })

    case 'retryUnreadable': {
      const entry = (await liveTreeOf(root)).unreadable?.find((u) => u.path === req.path)
      if (entry?.reason === 'missing' || entry?.reason === 'malformed') oweRetry(root, entry)
      oweWalk(root)
      return ok({})
    }

    default: {
      const _exhaustive: never = req
      void _exhaustive
      return fault('Unknown operation.')
    }
  }
}
