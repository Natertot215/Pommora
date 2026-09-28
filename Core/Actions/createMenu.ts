import type { ActionItem } from './menuModel'
import { type ContextDef, createSpaceLabel } from '../Contexts/contexts'
import { DEFAULT_NEW_NAME, type MutateRequest } from '../Nexus/mutateRequest'
import type { ContainerKind } from '../Nexus/schemas'

export interface Creator {
  label: string
  req: MutateRequest
}

export function containerCreators(kind: ContainerKind, parentPath: string): Creator[] {
  const name = DEFAULT_NEW_NAME
  const nested = kind === 'collection' ? 'Set' : 'Sub-Set'
  return [
    { label: 'New Page', req: { op: 'createPage', parentPath, name } },
    {
      label: `New ${nested}`,
      req: { op: 'createContainer', parentPath, kind: 'set', name },
    },
  ]
}

export function spaceCreator(
  def: ContextDef,
): Creator & { req: Extract<MutateRequest, { op: 'createSpace' }> } {
  const label = createSpaceLabel(def)
  return { label, req: { op: 'createSpace', contextId: def.id, name: label } }
}

export type CreateMenuAction = `create:${number}`

/** Rows name an index into the list because a menu row can't carry a request object. */
export function createMenuItems(items: readonly Creator[]): ActionItem<CreateMenuAction>[] {
  return items.map((it, i) => ({ label: it.label, action: `create:${i}` }))
}

export function createdRequest(
  items: readonly Creator[],
  action: string,
): Creator['req'] | undefined {
  return action.startsWith('create:')
    ? items[Number(action.slice('create:'.length))]?.req
    : undefined
}
