import type { ActionItem } from './menuModel'
import { type ContextDef, createSpaceLabel } from '../Contexts/contexts'
import {
  type CreateRequest,
  newContainerRequest,
  newPageRequest,
  newSpaceRequest,
} from '../Nexus/mutateRequest'
import type { ContainerKind } from '../Nexus/entities'

export interface Creator {
  label: string
  request: () => CreateRequest
}

export function containerCreators(kind: ContainerKind, parentPath: string): Creator[] {
  const nested = kind === 'collection' ? 'Set' : 'Sub-Set'
  return [
    { label: 'New Page', request: () => newPageRequest(parentPath) },
    { label: `New ${nested}`, request: () => newContainerRequest(parentPath, 'set') },
  ]
}

export function spaceCreator(def: ContextDef): Creator {
  const label = createSpaceLabel(def)
  return { label, request: () => newSpaceRequest(def.id, label) }
}

export type CreateMenuAction = `create:${number}`

/** Rows name an index into the list because a menu row can't carry a request object. */
export function createMenuItems(items: readonly Creator[]): ActionItem<CreateMenuAction>[] {
  return items.map((it, i) => ({ label: it.label, action: `create:${i}` }))
}

export function createdRequest(
  items: readonly Creator[],
  action: string,
): CreateRequest | undefined {
  return action.startsWith('create:')
    ? items[Number(action.slice('create:'.length))]?.request()
    : undefined
}
