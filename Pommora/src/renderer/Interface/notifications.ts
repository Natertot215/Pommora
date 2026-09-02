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

/** A view carries no trash bundle — its configuration left the container and nothing was filed —
 *  so the undo is the object the surface still holds, saved back under its own id. */
export const restoreView = async (
  containerPath: string,
  kind: 'collection' | 'set',
  view: SavedView,
): Promise<void> => {
  const res = await window.nexus.views.save(containerPath, kind, view)
  if (!res.ok) notifyError(res.error.message)
}
