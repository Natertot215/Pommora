import type { SavedView } from '@shared/views'
import { useSession } from '@renderer/store'

export interface Notification {
  message: string
  tone: 'normal' | 'error'
  action?: { label: string; run: () => void | Promise<void> }
}

const post = (n: Notification): void => useSession.getState().notify(n)

export const notifyError = (message: string): void => post({ message, tone: 'error' })

export const notifyDeleted = (title: string, undo?: () => void | Promise<void>): void =>
  post({
    message: `Deleted “${title}”`,
    tone: 'normal',
    ...(undo ? { action: { label: 'Undo', run: undo } } : {}),
  })

export const notifyRemovedTile = (): void => post({ message: 'Removed the tile', tone: 'normal' })

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
