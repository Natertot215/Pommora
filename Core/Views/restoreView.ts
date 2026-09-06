import type { SavedView } from './views'
import { notifyError } from '../Interface/notifications'

export const restoreView = async (
  containerPath: string,
  kind: 'collection' | 'set',
  view: SavedView,
  siblings: readonly SavedView[],
): Promise<void> => {
  const res = await window.nexus.views.save(containerPath, kind, view)
  if (!res.ok) return void notifyError(res.error.message)
  // A save appends what it can't find, so the seat has to be claimed back by name.
  const order = siblings.map((v) => v.id)
  if (order.at(-1) === view.id) return
  const back = await window.nexus.views.reorder(containerPath, kind, order)
  if (!back.ok) notifyError(back.error.message)
}
