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
import { isOpenInTabs } from '../../Navigation/tabsModel'
import { assignValue, oneShotWriter } from '../../Properties/assignValue'
import { fetchPageRow, spaceRowOf } from '../../Views/pageRow'
import { contextAt, holderSchema } from '../../Nexus/treePatch'
import { spaceNodeOf } from '../../Nexus/treeIndex'
import type { NexusTree } from '../../Nexus/tree'
import type { ContainerKind } from '../../Nexus/entities'
import {
  type MetadataTarget,
  metadataBranches,
  runMetadataAction,
} from '../../Actions/metadataMenu'
import { popMenu } from '../../Actions/menuActions'
import { createNamed, newPageAdjacent } from '../../Actions/createActions'
import { useSession } from '../../Session/store'
import { confirmArchive, confirmDelete } from '../Confirm/confirmations'
import { runPathAction, showPageMenu } from './pageMenuActions'
import { chooseColor, chooseIcon } from '../../Assets/IdentityChoice'

function creatorsFor(target: EntityMenuTarget): Creator[] {
  switch (target.kind) {
    case 'collection':
    case 'set':
      return containerCreators(target.kind, target.path)
    case 'context': {
      const { tree } = useSession.getState()
      const group = tree && contextAt(tree, target.path)
      return group ? [spaceCreator(group.def)] : []
    }
    default:
      return []
  }
}

const ownIconOf = (tree: NexusTree | null, target: EntityMenuTarget): string | undefined =>
  target.kind === 'context'
    ? (tree && contextAt(tree, target.path))?.def.icon
    : target.id
      ? spaceNodeOf(tree, target.id)?.icon
      : undefined

async function readTarget(
  target: EntityMenuTarget,
  trigger: HTMLElement,
): Promise<MetadataTarget | null> {
  const { tree } = useSession.getState()
  const node = target.kind === 'space' && target.id ? spaceNodeOf(tree, target.id) : null
  const row =
    node && tree
      ? spaceRowOf(tree, node)
      : target.kind === 'page'
        ? await fetchPageRow(tree, target)
        : null
  if (!row) return null
  const writer = oneShotWriter(row)
  return {
    row,
    schema: holderSchema(tree, node ?? target.path),
    rowOf: () => writer.current.rowOf(row.id),
    commit: (column, value) => void assignValue(writer, row, column, value),
    trigger,
  }
}

/** Resolves on close, before the pick runs: a surface holding a hover affordance down needs the close to release it. */
export async function showEntityMenu(
  target: EntityMenuTarget,
  trigger: HTMLElement | null = null,
): Promise<void> {
  const values = trigger && target.id ? await readTarget(target, trigger) : null
  const s = useSession.getState()
  const { path, host } = target
  if (target.kind === 'page')
    return showPageMenu(target, {
      trigger,
      rename: () => s.beginRename(path, false, host),
      // A graph holds no slot for a sibling to land in.
      newPage:
        host === 'matrix'
          ? undefined
          : { rows: 'pair', create: (where) => void newPageAdjacent(path, where, host) },
      values,
    })
  const creators = creatorsFor(target)
  const shown = {
    ...target,
    alreadyOpen:
      target.kind !== 'context' &&
      target.id !== undefined &&
      isOpenInTabs(s.tabs, s.pinned, selectTargetOf({ ...target, id: target.id })),
    metadata: values ? metadataBranches(values, s.tree) : undefined,
  }
  const action = await popMenu(entityMenuItems(shown, creators))
  if (action === null || (values && runMetadataAction(action, values))) return
  runEntityAction(shown, creators, action, trigger)
}

function runEntityAction(
  target: EntityMenuTarget,
  creators: Creator[],
  action: EntityMenuAction,
  trigger: HTMLElement | null,
): void {
  const s = useSession.getState()
  const { path, id, kind } = target
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
    case 'editIcon':
      chooseIcon(
        trigger,
        ownIconOf(s.tree, target),
        (icon) => void s.mutate({ op: 'setIcon', path, kind, icon }),
      )
      return
    case 'changeColor':
      if (id)
        chooseColor(
          trigger,
          spaceNodeOf(s.tree, id)?.color,
          (color) => void s.mutate({ op: 'setSpaceColor', spaceId: id, color }),
        )
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
