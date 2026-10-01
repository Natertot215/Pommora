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
import type { ResolvedColumn, ViewRow } from '../../Views/viewRow'
import type { PropertyDefinition } from '../../Properties/properties'
import type { PropertyValue } from '../../Properties/propertyValue'
import { assignValue, type ValueWriter } from '../../Properties/assignValue'
import { fetchPageRow, spaceRowOf } from '../../Properties/pageRow'
import { containerSchema } from '../../Nexus/treePatch'
import { spaceNodeOf } from '../../Nexus/treeIndex'
import {
  propertyMenuBranches,
  type PropertyMenuTarget,
  runPropertyAction,
} from './propertyMenuActions'
import { dialer } from '../../Platform/dialer'
import { popMenu } from '../../Actions/menuActions'
import { createNamed, newPageAdjacent } from '../../Actions/createActions'
import { useSession } from '../../Session/store'
import { settingOf } from '../../Settings/personalization'
import { confirmDelete } from '../Confirm/confirmations'
import { runPageAction } from './pageMenuActions'
import { personalizationOf } from '../../Session/configSlice'

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
  const schema = !row
    ? []
    : node
      ? (s.tree?.config.registry ?? [])
      : containerSchema(s.tree, target.path)
  const propertyTarget: PropertyMenuTarget | null = row
    ? {
        tree: s.tree,
        schema,
        row,
        capitalize: settingOf(personalizationOf(s), 'capitalizeMetadata'),
      }
    : null
  const shown: EntityMenuTarget = {
    ...target,
    ...(propertyTarget ? propertyMenuBranches(propertyTarget) : {}),
  }
  const action = await popMenu(entityMenuItems(shown, creators))
  if (action === null) return
  if (propertyTarget && trigger) {
    const commit = valueCommitFor(schema, propertyTarget.row)
    if (runPropertyAction(action, { ...propertyTarget, commit, trigger })) return
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
  target: EntityMenuTarget,
  creators: Creator[],
  action: EntityMenuAction,
): void {
  const s = useSession.getState()
  const { path, id, kind } = target
  if (kind === 'page' && id && runPageAction(action, { id, path, title: target.title })) return
  const ref = id ? { kind, id, path } : undefined
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
    case 'reveal':
      void dialer().ask('path:reveal', path)
      return
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
      if (req) void createNamed(req, target.host)
    }
  }
}
