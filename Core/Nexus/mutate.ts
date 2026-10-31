// Every renderer mutation arrives here with the root the session gate holds and routes to the module that owns the operation. Arms carrying only a resolve and one module call stay in place.

import { setOrDrop } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { isAtOrUnder, isMarkdownFile, relative, titleFromPath } from '../Paths/posix'
import { CONTEXTS_DIR_REL } from '../Paths/nexusPaths'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { fault, ok } from '../Contract/result'
import { addProperty, assignProperty, reorderAssignment } from '../Properties/assignment'
import { unassignProperty } from '../Properties/unassignProperty'
import {
  configureProperty,
  renameProperty,
  reorderRegistry,
  setKeyFormat,
} from '../Properties/registryProperty'
import { deleteProperty } from '../Properties/deleteProperty'
import {
  clearOption,
  deleteOption,
  editOption,
  renameOption,
  setValueFormat,
} from '../Properties/optionOps'
import { emptyBundle } from '../Trash/empty'
import { archiveOp } from '../Archive/archive'
import { restoreBundle } from '../Bundles/restore'
import { openBundle } from '../Bundles/bundle'
import { storeOf } from '../Paths/bundleLayout'
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
import {
  DEFAULT_NEW_NAME,
  done,
  seedsContext,
  type MutateReply,
  type MutateRequest,
} from './mutateRequest'
import { CONTAINER_KINDS } from './entities'
import { setActiveView } from '../Views/viewsFile'
import { createContainerOp, createPageOp, createSpaceOp, landedAs } from './create'
import { movePageOp, moveSetOp } from './move'
import { editPageAliases, writePageMeta } from './pageMetadata'
import { renameOp } from './rename'
import { type CascadeReport, joinCascades, linksNotUpdated, renameCascade } from './cascade'
import { setChildOrder, setCollectionOrder, setPanelContextOrder, setSpaceOrder } from './reorder'
import { liveTreeOf, mutableTarget } from './liveTree'
import { contextWorldOf } from '../Contexts/contextResolve'
import { oweRetry, oweWalk } from './fileEvents'
import { reachReport } from './owed'
import { finishOwed } from './finishOwed'
import { inContextsTurn, inSettleTurn, relink, settledIndex, underContexts } from './settle'
import { pageMoves } from './record'
import { putBackEntries } from './governedRoot'

export interface MutateContext {
  root: string
}

export async function handleMutate(root: string, req: MutateRequest): Promise<MutateReply> {
  try {
    return await dispatch({ root }, req)
  } catch (e) {
    return fault(e)
  }
}

async function dispatch(ctx: MutateContext, req: MutateRequest): Promise<MutateReply> {
  const { root } = ctx
  // A write that moves, adds, or removes a page, re-spells its links, or renames a Context or Space runs in the settle's turn. One that can move or add a page re-spells by the index's difference across it: a first commit's rename arrives without moving, so a stale link to the name the page was born with never follows it, and a page created under the default name is no arrival, since its first commit is where it arrives.
  const addressed = (
    req: Extract<MutateRequest, { op: 'createPage' | 'rename' | 'movePage' | 'moveSet' }>,
    fn: () => Promise<MutateReply>,
    turn: typeof inSettleTurn = inSettleTurn,
  ): Promise<MutateReply> =>
    turn(root, async () => {
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
        cascade: joinCascades(reply.value.cascade, cascade),
      })
    })
  switch (req.op) {
    case 'createPage':
      return addressed(
        req,
        () => createPageOp(ctx, req),
        seedsContext(req) ? inContextsTurn : inSettleTurn,
      )

    case 'createContainer':
      return createContainerOp(ctx, req)

    case 'rename':
      return addressed(req, () => renameOp(ctx, req))

    case 'renameHeading':
      return inSettleTurn(root, async () => {
        const { missed: _, ...cascade } = await renameCascade(root, req, true)
        return ok({ cascade })
      })

    case 'delete':
      return req.kind === 'space' || req.kind === 'context'
        ? inContextsTurn(root, () => deleteOp(ctx, req))
        : inSettleTurn(root, () => deleteOp(ctx, req))

    case 'archive':
      return inSettleTurn(root, () => archiveOp(ctx, req))

    // Only a Context's or a Space's bundle, which sits under the Trash's `.nexus/contexts` since its chain mirrors where it lived, restores something that changes which Contexts and Spaces exist, so only its restore takes the Contexts lock; every other restore writes a Space's sidecar by id alone, as a delete's strip does.
    case 'restore': {
      const resolved = await resolveUnderRoot(root, req.bundlePath)
      if (!resolved.ok) return resolved
      const restore = async (): Promise<MutateReply> => {
        const opened = await openBundle(root, resolved.value)
        return opened.ok ? restoreBundle(root, opened.value, req.destination) : opened
      }
      const origin = storeOf(relative(root, resolved.value))?.origin ?? ''
      return isAtOrUnder(origin, CONTEXTS_DIR_REL)
        ? inContextsTurn(root, restore)
        : inSettleTurn(root, restore)
    }

    case 'emptyBundle': {
      const resolved = await resolveUnderRoot(root, req.bundlePath)
      return resolved.ok ? inSettleTurn(root, () => emptyBundle(root, resolved.value)) : resolved
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
        ? setPropertyOp(ctx, req)
        : underContexts(root, () => setPropertyOp(ctx, req))

    // A put-back resolves a Context's key as a tag write does, so one reaching a Space or naming a Context holds the Contexts lock; a page property's takes only its page's lock.
    case 'putBack': {
      const { groupById } = contextWorldOf((await liveTreeOf(root)).contexts)
      const put = () => putBackEntries(root, req.entries)
      const held = req.entries.some((e) => !isMarkdownFile(e.file) || groupById.has(e.fieldId))
      const missed = await (held ? underContexts(root, put) : put())
      return ok(
        missed.length
          ? { cascade: reachReport({ skipped: missed.length, hosts: [] }), missed }
          : {},
      )
    }

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

    case 'createContextGroup':
      return underContexts(root, async () => {
        const r = await createContextGroup(root, req.name, req.id)
        return r.ok ? ok({ created: r.value, ...landedAs(req.name, r.value.path) }) : r
      })

    case 'createSpace':
      return underContexts(root, () => createSpaceOp(ctx, req))

    case 'setContext':
      return underContexts(root, () => setContextOp(ctx, req))

    case 'setSpaceColor':
      return done(await underContexts(root, () => setSpaceColor(root, req.spaceId, req.color)))

    case 'renameContext':
      return inContextsTurn(root, () => renameContextOp(root, req.contextId, req.newName))

    case 'renameSpace':
      return inContextsTurn(root, () => renameSpaceOp(root, req.spaceId, req.newName))

    case 'reorderContexts':
      return reorderContextsOp(ctx, req)

    case 'reorderPanelContexts':
      return done(await setPanelContextOrder(root, req.ids))

    case 'reorderSpaces':
      return done(await setSpaceOrder(root, req.contextId, req.ids))

    case 'setSpaceRowOrder':
      return underContexts(root, async () => {
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

    case 'addProperty': {
      const folder = await mutableTarget(root, req.containerPath, ['collection'])
      return folder.ok ? addProperty(root, folder.value, req.draft) : folder
    }

    case 'assignProperty': {
      const folder = await mutableTarget(root, req.containerPath, ['collection'])
      if (!folder.ok) return folder
      return assignProperty(root, folder.value, req.propertyId, req.toIndex)
    }

    case 'unassignProperty': {
      const folder = await mutableTarget(root, req.containerPath, ['collection'])
      return folder.ok ? unassignProperty(root, folder.value, req.propertyId) : folder
    }

    case 'reorderAssigned': {
      const folder = await mutableTarget(root, req.containerPath, ['collection'])
      if (!folder.ok) return folder
      return done(await reorderAssignment(root, folder.value, req.propertyId, req.toIndex))
    }

    case 'reorderProperty':
      return done(await reorderRegistry(root, req.propertyId, req.toIndex))

    case 'renameProperty':
      return renameProperty(root, req.propertyId, req.label)

    case 'setFormat':
      return 'key_format' in req.change
        ? setKeyFormat(root, req.propertyId, req.change.key_format)
        : setValueFormat(root, req.propertyId, req.change.value_format)

    case 'configureProperty':
      return done(await configureProperty(root, req.propertyId, req.patch))

    case 'deleteProperty':
      return deleteProperty(root, req.propertyId)

    // Outside every per-op lock: the pass takes each kind's lock itself.
    case 'finishOwed':
      return ok({ cascade: await finishOwed(root) })

    case 'editOption':
      return done(await editOption(root, req.propertyId, req.edit))

    case 'renameOption':
      return renameOption(root, req.propertyId, req.optionId, req.label)

    case 'deleteOption':
      return deleteOption(root, req.propertyId, req.optionId)

    case 'clearOption':
      return clearOption(root, req.propertyId, req.optionId)

    default: {
      const _exhaustive: never = req
      void _exhaustive
      return fault('Unknown operation.')
    }
  }
}
