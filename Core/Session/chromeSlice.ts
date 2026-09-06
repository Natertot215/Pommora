import type { ConfirmRequest } from '../Interface/confirmations'
import type { Notification } from '../Interface/notifications'
import type { Slice } from './sessionState'

export interface ChromeSlice {
  pendingConfirm: { req: ConfirmRequest; settle: (confirmed: boolean) => void } | null
  askConfirm: (req: ConfirmRequest) => Promise<boolean>
  notification: (Notification & { id: number }) | null
  notify: (n: Notification) => void
  dismissNotification: (id: number) => void
  resetChrome: () => void
}

let notificationSeq = 0

export const createChromeSlice: Slice<ChromeSlice> = (set, get) => ({
  pendingConfirm: null,
  askConfirm: (req) =>
    new Promise((resolve) => {
      get().pendingConfirm?.settle(false)
      // Identity-guarded: a question that was already displaced must not take down the one
      // standing in its place.
      const settle = (confirmed: boolean): void => {
        set((s) => (s.pendingConfirm?.settle === settle ? { pendingConfirm: null } : {}))
        resolve(confirmed)
      }
      set({ pendingConfirm: { req, settle } })
    }),

  notification: null,
  notify: (n) => set({ notification: { ...n, id: ++notificationSeq } }),
  dismissNotification: (id) =>
    set((s) => (s.notification?.id === id ? { notification: null } : {})),

  resetChrome: () => {
    get().pendingConfirm?.settle(false)
    set({ pendingConfirm: null, notification: null })
  },
})
