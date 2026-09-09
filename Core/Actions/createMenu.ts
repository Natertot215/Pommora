import type { ActionItem } from './menuModel'
import type { Creator } from '../Nexus/mutateRequest'

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
