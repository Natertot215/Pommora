import {
  type EntityMenuAction,
  entityMenuItems,
  type EntityMenuTarget,
} from '../../Actions/entityMenu'
import {
  containerCreators,
  type Creator,
  createdRequest,
  spaceCreator,
} from '../../Actions/createMenu'
import { isWindowTarget, selectTargetOf } from '../../Navigation/navRef'
import type { ViewRow } from '../../Views/viewRow'
import { assignValue, oneShotWriter } from '../../Properties/assignValue'
import { fetchPageRow, spaceRowOf } from '../../Views/pageRow'
import { holderSchema, NO_SCHEMA } from '../../Nexus/treePatch'
import { spaceNodeOf } from '../../Nexus/treeIndex'
import type { ContainerKind } from '../../Nexus/entities'
import {
  propertyMenuBranches,
  type PropertyMenuTarget,
  runPropertyAction,
} from './propertyMenuActions'
import { popMenu } from '../../Actions/menuActions'
import { createNamed, newPageAdjacent } from '../../Actions/createActions'
import { useSession } from '../../Session/store'
import { confirmArchive, confirmDelete } from '../Confirm/confirmations'
import { runPageAction, runPathAction } from './pageMenuActions'

function creatorsFor(target: EntityMenuTarget): Creator[] {
  switch (target.kind) {
    case 'collection':
    case 'set':
      return containerCreators(target.kind, target.path)
    case 'context': {
      const group = useSession.getState().tree?.contexts.find((g) => g.def.title === target.title)
      return group ? [spaceCreator(group.def)] : []
    }
    default:
      return []
  }
}

/** Resolves on close, before the pick runs: a surface holding a hover affordance down needs the close to release it. */
export async function showEntityMenu(
  target: EntityMenuTarget,
  trigger?: HTMLElement,
): Promise<void> {
  const creators = creatorsFor(target)
  const s = useSession.getState()
  const node = target.kind === 'space' && target.id ? spaceNodeOf(s.tree, target.id) : null
  let row: ViewRow | null = null
  if (trigger && target.id) {
    if (target.kind === 'page')
      row = await fetchPageRow(s.tree, { id: target.id, path: target.path, title: target.title })
    else if (node && s.tree) row = spaceRowOf(s.tree, node)
  }
  const schema = row ? holderSchema(s.tree, node ?? target.path) : NO_SCHEMA
  const propertyTarget: PropertyMenuTarget | null = row ? { tree: s.tree, schema, row } : null
  const shown: EntityMenuTarget = {
    ...target,
    ...(propertyTarget ? propertyMenuBranches(propertyTarget) : {}),
  }
  const action = await popMenu(entityMenuItems(shown, creators))
  if (action === null) return
  if (propertyTarget && trigger) {
    const writer = oneShotWriter(propertyTarget.row)
    const done = runPropertyAction(action, {
      ...propertyTarget,
      commit: (column, value) => void assignValue(writer, [propertyTarget.row], column, value),
      trigger,
    })
    if (done) return
  }
  runEntityAction(shown, creators, action)
}

function runEntityAction(
  target: EntityMenuTarget,
  creators: Creator[],
  action: EntityMenuAction,
): void {
  const s = useSession.getState()
  const { path, id, kind } = target
  if (kind === 'page' && id && runPageAction(action, { id, path, title: target.title })) return
  if (runPathAction(action, path)) return
  const ref = target.id ? { kind: target.kind, id: target.id, path } : undefined
  switch (action) {
    case 'preview': {
      const t = ref && selectTargetOf(ref)
      if (t && isWindowTarget(t)) s.openWindowTab(t)
      return
    }
    case 'open':
      if (ref) void s.select(selectTargetOf(ref), { newTab: true })
      return
    case 'title:rename':
    case 'rename':
      s.beginRename(path, false, target.host)
      return
    case 'title:icon':
    case 'editIcon':
      s.beginIcon(path, target.host)
      return
    case 'changeColor':
      if (target.host) s.beginColor(path, target.host)
      return
    case 'title:newabove':
    case 'title:newbelow':
      void newPageAdjacent(path, action === 'title:newabove' ? 'above' : 'below', target.host)
      return
    case 'title:archive':
      void confirmArchive({ path, kind: 'set', title: target.title })
      return
    case 'title:delete':
      void confirmDelete(target)
      return
    case 'lock':
      void s.mutate({
        op: 'setDisclosureLock',
        path,
        kind: kind as ContainerKind,
        locked: !target.disclosureLocked,
      })
      return
    default: {
      const req = createdRequest(creators, action)
      if (req) void createNamed(req, target.host)
    }
  }
}
