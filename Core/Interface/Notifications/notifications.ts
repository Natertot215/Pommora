import { useSession } from '../Session/store'

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
