import { type EntityMenuAction, entityMenuItems } from '@pommora/core/Actions/entityMenu'
import { createdRequest } from '@pommora/core/Actions/createMenu'
import {
  containerCreators,
  type ContextTarget,
  type Creator,
} from '@pommora/core/Pages/mutateRequest'
import { createSpaceLabel } from '@pommora/core/Properties/contexts'
import { contextTargetToSelect } from '../../Navigation/tabsModel'
import { host } from '../../Platform/dialer'
import { popRowMenu } from '../../Platform/nativeMenus'
import { useSession } from '../../Session/store'
import { confirmDelete } from '../Confirm/confirmations'
import { runPageSendAction } from '../Menus/pageMenuActions'

/** Routed through the shared rule so this menu and the subfield's add button can't drift. */
function creatorsFor(target: ContextTarget): Creator[] {
  switch (target.kind) {
    case 'collection':
    case 'set':
      return containerCreators(target.kind, target.path)
    case 'context': {
      const def = useSession.getState().tree?.contexts.find((g) => g.def.title === target.title)
      if (!def) return []
      const label = createSpaceLabel(def.def)
      return [{ label, req: { op: 'createSpace', contextId: def.def.id, name: label } }]
    }
    default:
      return []
  }
}

/** Resolves on close, before the pick runs: a surface holding a hover affordance down needs the close to release it. */
export async function showEntityMenu(target: ContextTarget): Promise<void> {
  const creators = creatorsFor(target)
  const action = await popRowMenu(entityMenuItems(target, creators))
  if (action !== null) runEntityAction(target, creators, action)
}

function runEntityAction(
  target: ContextTarget,
  creators: Creator[],
  action: EntityMenuAction,
): void {
  const s = useSession.getState()
  const { path, id, kind } = target
  const ref = id ? { kind, id, path } : undefined
  if (ref && runPageSendAction(action, ref)) return
  switch (action) {
    case 'title:window':
      if (ref) s.openWindow(ref)
      return
    case 'title:newtab':
    case 'open':
      if (ref) void s.select(contextTargetToSelect(ref), { newTab: true })
      return
    case 'title:rename':
    case 'rename':
      s.beginRename(path, false, target.host)
      return
    case 'title:icon':
      s.beginIcon(path)
      return
    case 'title:newabove':
    case 'title:newbelow':
      void s.newPageAdjacent(path, action === 'title:newabove' ? 'above' : 'below', target.host)
      return
    case 'title:reveal':
    case 'reveal':
      void host().ask('path:reveal', path)
      return
    case 'title:delete':
    case 'delete':
      void confirmDelete(target)
      return
    case 'lock':
      void s.mutate({
        op: 'setDisclosureLock',
        path,
        kind: kind as 'collection' | 'set',
        locked: !target.disclosureLocked,
      })
      return
    default: {
      const req = createdRequest(creators, action)
      if (req) void s.mutate(req, (created) => s.beginRename(created.path, true, target.host))
    }
  }
}
