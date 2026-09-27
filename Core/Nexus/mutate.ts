// Every renderer mutation arrives here with the root the session gate holds and routes to the module that owns the operation. Arms carrying only a resolve and one module call stay in place.

import { setOrDrop } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { titleFromPath } from '../Paths/posix'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { contextsDir } from '../Paths/paths'
import { machine } from '../Platform/machine'
import { fault, ok } from '../Contract/result'
import { emptyBundle, restoreOp } from '../Trash/spend'
import { deleteOp } from '../Trash/delete'
import { updateSettings } from '../Settings/settings'
import { setProfileImageOp } from '../Assets/setProfileImage'
import { setCropOp } from '../Assets/setCrop'
import { setBannerOp } from '../Pages/setBanner'
import { setIconOp } from '../Pages/setIcon'
import { setHeadingIconHiddenOp } from '../Pages/setHeadingIconHidden'
import { setPropertyOp } from '../Properties/setProperty'
import {
  createContextGroup,
  setContextOp,
  setSpaceColor,
  setSpaceRowOrder,
} from '../Contexts/contextWrite'
import { renameContextOp, renameSpaceOp } from '../Contexts/contextCascade'
import { reorderContextsOp } from '../Contexts/reorderContexts'
import { done, type MutateReply, type MutateRequest } from './mutateRequest'
import { setActiveView } from '../Views/viewsFile'
import type { TrashDeps } from '../Trash/bundle'
import { createContainerOp, createPageOp, createSpaceOp } from './create'
import { movePageOp, moveSetOp } from './move'
import { writePageMeta } from './pageMetadata'
import { renameOp } from './rename'
import { renameCascade } from './cascade'
import { setChildOrder, setCollectionOrder, setPanelContextOrder, setSpaceOrder } from './reorder'
import { mutableTarget } from './liveTree'
import { CONTAINER_KINDS } from './mutateRequest'

export interface MutateContext {
  root: string
  deps: TrashDeps
}

/** A thrown write can stop partway through what it wrote, so `afterThrow` gets the chance to re-read the disk; a refusal returned as a result wrote nothing. */
export async function handleMutate(
  root: string,
  req: MutateRequest,
  deps: TrashDeps,
  afterThrow?: () => Promise<void>,
): Promise<MutateReply> {
  try {
    return await dispatch({ root, deps }, req)
  } catch (e) {
    await afterThrow?.()
    return fault(e)
  }
}

async function dispatch(ctx: MutateContext, req: MutateRequest): Promise<MutateReply> {
  const { root, deps } = ctx
  // A Space's link write decides each far half from the world it loaded, and a tag written mid-rename must land under the new key, so every Contexts write and rename runs under the folder's one lock.
  const underContexts = <T>(fn: () => Promise<T>): Promise<T> =>
    machine().lock(contextsDir(root), fn)
  switch (req.op) {
    case 'createPage':
      return Object.values(req.seeds ?? {}).some((v) => v.kind === 'context')
        ? underContexts(() => createPageOp(ctx, req))
        : createPageOp(ctx, req)

    case 'createContainer':
      return createContainerOp(ctx, req)

    case 'rename':
      return renameOp(ctx, req)

    case 'renameHeading':
      return ok({ cascade: await renameCascade(root, titleFromPath(req.path), req, req.path) })

    case 'delete':
      return deleteOp(ctx, req)

    case 'restore':
      return restoreOp(ctx, req)

    case 'emptyBundle': {
      const resolved = await resolveUnderRoot(root, req.bundlePath)
      return resolved.ok ? done(await emptyBundle(root, resolved.value, deps)) : resolved
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
      return setPropertyOp(ctx, req)

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
      const r = await createContextGroup(root, req.name)
      return r.ok ? ok({ created: r.value }) : r
    }

    case 'createSpace':
      return underContexts(() => createSpaceOp(ctx, req))

    case 'setContext':
      return underContexts(() => setContextOp(ctx, req))

    case 'setSpaceColor':
      return done(await setSpaceColor(root, req.spaceId, req.color))

    case 'renameContext':
      return done(await underContexts(() => renameContextOp(root, req.contextId, req.newName)))

    case 'renameSpace':
      return done(await underContexts(() => renameSpaceOp(root, req.spaceId, req.newName)))

    case 'reorderContexts':
      return reorderContextsOp(ctx, req)

    case 'reorderPanelContexts':
      return done(await setPanelContextOrder(root, req.ids))

    case 'reorderSpaces':
      return done(await setSpaceOrder(root, req.contextId, req.ids))

    case 'setSpaceRowOrder': {
      const resolved = await mutableTarget(root, req.path, ['space'])
      if (!resolved.ok) return resolved
      return done(await setSpaceRowOrder(resolved.value, req.contexts, req.properties))
    }

    default: {
      const _exhaustive: never = req
      void _exhaustive
      return fault('Unknown operation.')
    }
  }
}
