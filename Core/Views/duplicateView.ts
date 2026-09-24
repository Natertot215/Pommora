import { DEFAULT_VIEW_ID, type SavedView } from './views'
import { freeName } from '../Paths/names'
import { reportRefusal } from '../Interface/Notifications/notifications'
import { host } from '../Platform/dialer'

export const duplicateView = async (
  containerPath: string,
  kind: 'collection' | 'set',
  view: SavedView,
  siblings: readonly SavedView[],
): Promise<void> => {
  const res = await host().ask('views:save', containerPath, kind, {
    ...view,
    id: DEFAULT_VIEW_ID,
    name: freeName(
      view.name,
      siblings.map((v) => v.name),
    ),
  })
  if (!reportRefusal(res)) return
  // A save appends, so the copy is walked back to the seat after its original.
  const ids = siblings.map((v) => v.id).filter((id) => id !== res.value.id)
  const at = ids.indexOf(view.id)
  ids.splice(at < 0 ? ids.length : at + 1, 0, res.value.id)
  reportRefusal(await host().ask('views:reorder', containerPath, kind, ids))
}
