import { pushValueUndo } from '@pommora/core/Properties/valueUndo'
import { useSession } from '../../Session/store'

export interface Notification {
  message: string
  tone: 'normal' | 'error'
  action?: { label: string; run: () => void | Promise<void> }
}

const post = (n: Notification): void => useSession.getState().notify(n)

export const notifyError = (message: string): void => post({ message, tone: 'error' })

export const notifyDeleted = (title: string, undo?: () => void | Promise<void>): void => {
  const message = `Deleted “${title}”`
  if (!undo) {
    post({ message, tone: 'normal' })
    return
  }
  // The label's Undo and the undo chord are one shot between them, so a restore cannot run twice and mint a second copy.
  let fired = false
  const once = (): boolean => {
    if (fired) return false
    fired = true
    void undo()
    return true
  }
  post({ message, tone: 'normal', action: { label: 'Undo', run: () => void once() } })
  const id = useSession.getState().notification?.id
  pushValueUndo(() => {
    if (!once()) return false
    if (id !== undefined) useSession.getState().dismissNotification(id)
    return true
  })
}

export const notifyRemovedTile = (): void => post({ message: 'Removed the tile', tone: 'normal' })
