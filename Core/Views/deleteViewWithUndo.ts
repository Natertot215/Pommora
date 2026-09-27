import type { CollectionNode, SetNode } from '../Nexus/tree'
import type { SavedView } from './views'
import { askDeleteView } from '../Interface/Confirm/confirmations'
import { notifyDeleted, reportRefusal } from '../Interface/Notifications/notifications'
import { dialer } from '../Platform/dialer'

export async function deleteViewWithUndo(
  source: CollectionNode | SetNode,
  view: SavedView,
): Promise<boolean> {
  if (!(await askDeleteView())) return false
  const res = await dialer().ask('views:delete', source.path, source.kind, view.id)
  if (!reportRefusal(res)) return false
  notifyDeleted(view.name, async () => {
    reportRefusal(await dialer().ask('views:restore', source.path, source.kind, res.value))
  })
  return true
}
