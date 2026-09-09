import type { ActionItem, MenuOptions } from '@pommora/core/Actions/menuModel'
import type { ConfirmRequest } from '../Interface/Confirm/confirmations'
import type { Notification } from '../Interface/Notifications/notifications'
import type { Slice } from './sessionState'

interface MenuPending extends MenuOptions {
  id: number
  items: readonly ActionItem<string>[]
  trigger: HTMLElement
  settle: (action: string | null) => void
}

export interface ChromeSlice {
  pendingConfirm: { req: ConfirmRequest; settle: (confirmed: boolean) => void } | null
  askConfirm: (req: ConfirmRequest) => Promise<boolean>
  pendingMenu: MenuPending | null
  presentMenu: (
    items: readonly ActionItem<string>[],
    trigger: HTMLElement,
    options?: MenuOptions,
  ) => Promise<string | null>
  notification: (Notification & { id: number }) | null
  notify: (n: Notification) => void
  dismissNotification: (id: number) => void
  resetChrome: () => void
}

let notificationSeq = 0
let menuSeq = 0

export const createChromeSlice: Slice<ChromeSlice> = (set, get) => ({
  pendingConfirm: null,
  askConfirm: (req) =>
    new Promise((resolve) => {
      get().pendingConfirm?.settle(false)
      // Identity-guarded: a question that was already displaced must not take down the one standing in its place.
      const settle = (confirmed: boolean): void => {
        set((s) => (s.pendingConfirm?.settle === settle ? { pendingConfirm: null } : {}))
        resolve(confirmed)
      }
      set({ pendingConfirm: { req, settle } })
    }),

  pendingMenu: null,
  presentMenu: (items, trigger, options) =>
    new Promise((resolve) => {
      get().pendingMenu?.settle(null)
      const settle = (action: string | null): void => {
        set((s) => (s.pendingMenu?.settle === settle ? { pendingMenu: null } : {}))
        resolve(action)
      }
      set({ pendingMenu: { ...options, id: ++menuSeq, items, trigger, settle } })
    }),

  notification: null,
  notify: (n) => set({ notification: { ...n, id: ++notificationSeq } }),
  dismissNotification: (id) =>
    set((s) => (s.notification?.id === id ? { notification: null } : {})),

  resetChrome: () => {
    get().pendingConfirm?.settle(false)
    get().pendingMenu?.settle(null)
    set({ pendingConfirm: null, pendingMenu: null, notification: null })
  },
})
