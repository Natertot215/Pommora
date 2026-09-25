import type { SavedView } from './views'
import { reportRefusal } from '../Interface/Notifications/notifications'
import { dialer } from '../Platform/dialer'

export const restoreView = async (
  containerPath: string,
  kind: 'collection' | 'set',
  view: SavedView,
  siblings: readonly SavedView[],
): Promise<void> => {
  const res = await dialer().ask('views:save', containerPath, kind, view)
  if (!reportRefusal(res)) return
  // A save appends what it can't find, so the seat has to be claimed back by name.
  const order = siblings.map((v) => v.id)
  if (order.at(-1) === view.id) return
  reportRefusal(await dialer().ask('views:reorder', containerPath, kind, order))
}
