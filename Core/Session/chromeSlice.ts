import type { ActionItem, MenuAnchor } from '@pommora/core/Actions/menuModel'
import type { ConfirmRequest } from '../Interface/Confirm/confirmations'
import type { Notification } from '../Interface/Notifications/notifications'
import type { Slice } from './sessionState'

interface RowMenuPending {
  id: number
  items: readonly ActionItem<string>[]
  at: MenuAnchor
  settle: (action: string | null) => void
}

export interface ChromeSlice {
  pendingConfirm: { req: ConfirmRequest; settle: (confirmed: boolean) => void } | null
  askConfirm: (req: ConfirmRequest) => Promise<boolean>
  pendingRowMenu: RowMenuPending | null
  /** The in-app presenter: resolves the picked action, or null once the pane is dismissed. */
  presentRowMenu: (items: readonly ActionItem<string>[], at: MenuAnchor) => Promise<string | null>
  notification: (Notification & { id: number }) | null
  notify: (n: Notification) => void
  dismissNotification: (id: number) => void
  resetChrome: () => void
}

let notificationSeq = 0
let rowMenuSeq = 0

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

  pendingRowMenu: null,
  presentRowMenu: (items, at) =>
    new Promise((resolve) => {
      get().pendingRowMenu?.settle(null)
      const settle = (action: string | null): void => {
        set((s) => (s.pendingRowMenu?.settle === settle ? { pendingRowMenu: null } : {}))
        resolve(action)
      }
      set({ pendingRowMenu: { id: ++rowMenuSeq, items, at, settle } })
    }),

  notification: null,
  notify: (n) => set({ notification: { ...n, id: ++notificationSeq } }),
  dismissNotification: (id) =>
    set((s) => (s.notification?.id === id ? { notification: null } : {})),

  resetChrome: () => {
    get().pendingConfirm?.settle(false)
    get().pendingRowMenu?.settle(null)
    set({ pendingConfirm: null, pendingRowMenu: null, notification: null })
  },
})
