// Every renderer mutation arrives here with the root the session gate holds and routes to the module that owns the operation. Arms carrying only a resolve and one module call stay in place.

import { setOrDrop } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { isMarkdownFile, join, titleFromPath } from '../Paths/posix'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { contextsDir } from '../Paths/paths'
import { machine } from '../Platform/machine'
import { fault, ok, type Result } from '../Contract/result'
import { emptyBundle, restoreOp } from '../Trash/spend'
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
import { done, seedsContext, type MutateReply, type MutateRequest } from './mutateRequest'
import { CONTAINER_KINDS } from './entities'
import { setActiveView } from '../Views/viewsFile'
import type { TrashDeps } from '../Trash/bundle'
import { createContainerOp, createPageOp, createSpaceOp } from './create'
import { movePageOp, moveSetOp } from './move'
import { writePageMeta } from './pageMetadata'
import { renameOp } from './rename'
import { renameCascade } from './cascade'
import { setChildOrder, setCollectionOrder, setPanelContextOrder, setSpaceOrder } from './reorder'
import { liveTreeOf, mutableTarget } from './liveTree'
import { stampMissing, stampPage } from './adopt'
import { oweWalk } from './fileEvents'
import { reachReport } from './configReach'
import { payOwedWalk } from './settle'

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
  // renameContext, renameSpace, createSpace, setContext, setSpaceColor, setSpaceRowOrder, a Space's setProperty, restore, a Space or Context delete, and a create that seeds a Context run under the Contexts folder's one lock until the walk each owed is paid, so a tag or value written mid-rename lands under the new key. A page's setProperty runs outside it, since it resolves its world inside the page's own lock, which every sweep takes too. A write that names a Space by a path the rename has moved answers the refusal.
  const underContexts = <T>(fn: () => Promise<T>): Promise<T> =>
    machine().lock(contextsDir(root), async () => {
      try {
        return await fn()
      } finally {
        await payOwedWalk(root)
      }
    })
  switch (req.op) {
    case 'createPage':
      return seedsContext(req)
        ? underContexts(() => createPageOp(ctx, req))
        : createPageOp(ctx, req)

    case 'createContainer':
      return createContainerOp(ctx, req)

    case 'rename':
      return renameOp(ctx, req)

    case 'renameHeading':
      return ok({ cascade: await renameCascade(root, titleFromPath(req.path), req, req.path) })

    case 'delete':
      return req.kind === 'space' || req.kind === 'context'
        ? underContexts(() => deleteOp(ctx, req))
        : deleteOp(ctx, req)

    case 'restore':
      return underContexts(() => restoreOp(ctx, req))

    case 'emptyBundle': {
      const resolved = await resolveUnderRoot(root, req.bundlePath)
      return resolved.ok ? emptyBundle(root, resolved.value, deps) : resolved
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
      return isMarkdownFile(req.path)
        ? setPagePropertyOp(ctx, req)
        : underContexts(() => setSpacePropertyOp(ctx, req))

    case 'setPageMeta':
      return writePageMeta(root, req.path, req.patch)

    case 'movePage':
      return movePageOp(ctx, req)

    case 'moveSet':
      return moveSetOp(ctx, req)

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
        return done(await setSpaceRowOrder(resolved.value, req.contexts, req.properties))
      })

    case 'retryUnreadable': {
      const entry = (await liveTreeOf(root)).unreadable?.find((u) => u.path === req.path)
      if (entry?.reason === 'malformed') await stampPage(join(root, entry.path), 'page', true)
      // Try Again is the user's own gesture, so the entry is stamped without waiting for stillness.
      if (entry?.reason === 'missing') await stampMissing(root, [entry])
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
