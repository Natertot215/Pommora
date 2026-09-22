import { type EntityMenuAction, entityMenuItems } from '@pommora/core/Actions/entityMenu'
import { createdRequest } from '@pommora/core/Actions/createMenu'
import {
  containerCreators,
  type ContextTarget,
  type Creator,
} from '@pommora/core/Nexus/mutateRequest'
import { createSpaceLabel } from '@pommora/core/Contexts/contexts'
import { isWindowTarget } from '@pommora/core/Navigation/navRef'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import { assignValue, type ValueWriter } from '@pommora/core/Properties/assignValue'
import { fetchPageRow, schemaForPage, spaceRowOf } from '@pommora/core/Properties/pageRow'
import { spaceNodeOf } from '@pommora/core/Nexus/treeIndex'
import { contextTargetToSelect } from '../../Navigation/tabsModel'
import {
  propertyMenuBranches,
  type PropertyMenuTarget,
  runPropertyAction,
} from './propertyMenuActions'
import { host } from '../../Platform/dialer'
import { popMenu } from '../../Actions/menuActions'
import { useSession } from '../../Session/store'
import { confirmDelete } from '../Confirm/confirmations'
import { runPageSendAction } from './pageMenuActions'

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
export async function showEntityMenu(target: ContextTarget, trigger?: HTMLElement): Promise<void> {
  const creators = creatorsFor(target)
  const s = useSession.getState()
  const node = target.kind === 'space' && target.id ? spaceNodeOf(s.tree, target.id) : null
  let row: ViewRow | null = null
  if (trigger && target.id) {
    if (target.kind === 'page')
      row = await fetchPageRow(s.tree, { id: target.id, path: target.path, title: target.title })
    else if (node && s.tree) row = spaceRowOf(s.tree, node)
  }
  const schema = !row ? [] : node ? (s.tree?.registry ?? []) : schemaForPage(s.tree, target.path)
  const menuTarget: PropertyMenuTarget | null = row
    ? {
        tree: s.tree,
        schema,
        row,
        capitalize: s.personalization.capitalizeMetadata ?? false,
      }
    : null
  const shown: ContextTarget = {
    ...target,
    ...(menuTarget ? propertyMenuBranches(menuTarget) : {}),
  }
  const action = await popMenu(entityMenuItems(shown, creators))
  if (action === null) return
  if (menuTarget && trigger) {
    const commit = valueCommitFor(schema, menuTarget.row)
    if (runPropertyAction(action, { ...menuTarget, commit, trigger })) return
  }
  runEntityAction(shown, creators, action)
}

function valueCommitFor(
  schema: PropertyDefinition[],
  opened: ViewRow,
): (column: ResolvedColumn, value: PropertyValue | null) => void {
  let row = opened
  const writer: { current: ValueWriter | null } = {
    current: {
      schema,
      mutate: (req) => useSession.getState().mutate(req),
      rowOf: (id) => (id === row.id ? row : undefined),
      apply: (_, frontmatter) => {
        row = { ...row, frontmatter }
      },
    },
  }
  return (column, value) => {
    assignValue(writer, row, column, value)
  }
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
    case 'preview':
    case 'title:window': {
      const t = ref && contextTargetToSelect(ref)
      if (t && isWindowTarget(t)) s.openWindowTab(t)
      return
    }
    case 'title:newtab':
    case 'open':
      if (ref) void s.select(contextTargetToSelect(ref), { newTab: true })
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
      s.beginColor(path, target.host)
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
