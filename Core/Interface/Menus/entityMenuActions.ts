import { type EntityMenuAction, entityMenuItems } from '@pommora/core/Actions/entityMenu'
import { createdRequest } from '@pommora/core/Actions/createMenu'
import {
  containerCreators,
  type ContextTarget,
  type Creator,
} from '@pommora/core/Nexus/mutateRequest'
import { createSpaceLabel } from '@pommora/core/Contexts/contexts'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import { assignValue, type ValueWriter } from '@pommora/core/Properties/assignValue'
import { fetchPageRow, schemaForPage } from '@pommora/core/Properties/pageRow'
import { contextTargetToSelect } from '../../Navigation/tabsModel'
import { propertyMenuRows, runPropertyAction } from './propertyMenuActions'
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
  const row =
    trigger && target.kind === 'page' && target.id
      ? await fetchPageRow(s.tree, { id: target.id, path: target.path, title: target.title })
      : null
  const schema = row ? schemaForPage(s.tree, target.path) : []
  const properties = row
    ? propertyMenuRows({
        tree: s.tree,
        schema,
        row,
        capitalize: s.personalization.capitalizeMetadata ?? false,
      })
    : undefined
  const action = await popMenu(entityMenuItems({ ...target, properties }, creators))
  if (action === null) return
  if (row && trigger) {
    const commit = pageValueCommit(schema, row)
    if (runPropertyAction(action, { tree: s.tree, schema, row, commit, trigger })) return
  }
  runEntityAction(target, creators, action)
}

function pageValueCommit(
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
