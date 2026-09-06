// Every renderer mutation resolves its session root here and routes to the module that owns the operation. Arms carrying only a resolve and one module call stay in place.

import { setOrDrop } from '../Files/atomicWrite'
import { isReserved, resolveUnderRoot } from '../Paths/pathSafety'
import { createDisambiguated } from '../Paths/disambiguate'
import { errText, fault, ok, NO_NEXUS, type Result } from '../Contract/result'
import { emptyBundle, restoreArtifact } from '../Trash/spend'
import { deleteOp } from '../Trash/delete'
import { seedContentIndex } from '../Index/indexSeed'
import { updateSettings } from '../Settings/settings'
import { setProfileImageOp } from '../Assets/setProfileImage'
import { setCropOp } from '../Assets/setCrop'
import { setBannerOp } from '../Pages/setBanner'
import { setIconOp } from '../Pages/setIcon'
import { setHeadingIconHiddenOp } from '../Pages/setHeadingIconHidden'
import { setDisclosureLockOp } from '../Pages/setDisclosureLock'
import { setPropertyOp } from '../Properties/setProperty'
import {
  createContextGroup,
  createSpace,
  loadContextWorld,
  setContextOnPath,
  setSpaceColor,
} from '../Contexts/contextWrite'
import { renameContextOp, renameSpaceOp } from '../Contexts/contextCascade'
import { reorderContextsOp } from '../Contexts/reorderContexts'
import type { MutateReply, MutateRequest } from '../Pages/mutateRequest'
import type { TrashMode } from '../Trash/trashRow'
import { createContainerOp, createPageOp } from './create'
import { movePageOp, moveSetOp } from './move'
import { renameOp } from './rename'
import { setChildOrder, setSpaceOrder, setStateOrder } from './reorder'
import { sessionRoot } from './session'

export interface MutateDeps {
  trashMode: TrashMode
  trashToSystem: (absPath: string) => Promise<void>
  permanentDelete?: boolean
}

export interface MutateContext {
  root: string
  deps: MutateDeps
}

const done = (r: Result<unknown>): MutateReply => (r.ok ? ok({}) : r)

export async function handleMutate(req: MutateRequest, deps: MutateDeps): Promise<MutateReply> {
  const root = sessionRoot()
  if (root === null) return NO_NEXUS
  try {
    return await dispatch({ root, deps }, req)
  } catch (e) {
    return fault(errText(e))
  }
}

async function dispatch(ctx: MutateContext, req: MutateRequest): Promise<MutateReply> {
  const { root, deps } = ctx
  switch (req.op) {
    case 'createPage':
      return createPageOp(ctx, req)

    case 'createContainer':
      return createContainerOp(ctx, req)

    case 'rename':
      return renameOp(ctx, req)

    case 'delete':
      return deleteOp(ctx, req)

    case 'restore': {
      const resolved = await resolveUnderRoot(root, req.bundlePath)
      if (!resolved.ok) return resolved
      const r = await restoreArtifact(root, resolved.value, req.destination)
      if (!r.ok) return r
      await seedContentIndex(root)
      return ok({})
    }

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

    case 'setDisclosureLock':
      return setDisclosureLockOp(ctx, req)

    case 'setProperty':
      return setPropertyOp(ctx, req)

    case 'movePage':
      return movePageOp(ctx, req)

    case 'moveSet':
      return moveSetOp(ctx, req)

    case 'reorderChildren': {
      const parent = await resolveUnderRoot(root, req.parentPath)
      return parent.ok ? done(await setChildOrder(parent.value, req.key, req.order)) : parent
    }

    case 'reorderTop':
      return done(await setStateOrder(root, req.key, req.order))

    case 'createContextGroup': {
      const r = await createContextGroup(root, req.name)
      return r.ok ? ok({ created: r.value }) : r
    }

    case 'createSpace': {
      const r = await createDisambiguated(req.name, (name) =>
        createSpace(root, req.contextId, name),
      )
      return r.ok ? ok({ created: r.value }) : r
    }

    case 'setContext': {
      const resolved = await resolveUnderRoot(root, req.path)
      if (!resolved.ok) return resolved
      if (await isReserved(root, resolved.value)) return fault('That item can’t take contexts.')
      const world = await loadContextWorld(root)
      if (!world.ok) return world
      return done(
        await setContextOnPath(root, resolved.value, world.value, req.contextId, req.spaceIds),
      )
    }

    case 'setSpaceColor':
      return done(await setSpaceColor(root, req.spaceId, req.color))

    case 'renameContext':
      return done(await renameContextOp(root, req.contextId, req.newName))

    case 'renameSpace':
      return done(await renameSpaceOp(root, req.spaceId, req.newName))

    case 'reorderContexts':
      return reorderContextsOp(ctx, req)

    case 'reorderSpaces':
      return done(await setSpaceOrder(root, req.contextId, req.ids))

    default: {
      const _exhaustive: never = req
      void _exhaustive
      return fault('Unknown operation.')
    }
  }
}
