import type { ActionItem, MenuOptions } from '../Actions/menuModel'
import type { ConnPage } from '../Connections/pageIndex'
import type { ColumnStyle } from '../Properties/columnStyles'
import type { PropertyDefinition } from '../Properties/properties'
import type { PropertyValue } from '../Properties/propertyValue'
import type { ConfirmRequest } from '../Interface/Confirm/confirmations'
import type { PageStats } from '../MarkdownPM/Engine/subfieldStats'
import type { Slice } from './sessionState'

interface MenuPending extends MenuOptions {
  id: number
  items: readonly ActionItem<string>[]
  trigger: HTMLElement
  settle: (action: string | null) => void
}

export interface ValuePickRequest {
  def: PropertyDefinition
  current: PropertyValue
  holder?: ConnPage
  trigger: HTMLElement
  commit: (value: PropertyValue | null) => void
  style?: ColumnStyle
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
  pendingPick: (ValuePickRequest & { id: number }) | null
  requestPick: (req: ValuePickRequest) => void
  dismissPick: () => void
  /** The Subfield sits beside the detail rather than inside it, so whatever is mounted there publishes how many rows it resolved. */
  detailCount: number | null
  setDetailCount: (count: number | null) => void
  /** The focused editor's figures for its own highlight, so a page's counter measures the selection instead of the document. */
  editorSelection: (PageStats & { path: string }) | null
  setEditorSelection: (path: string, stats: PageStats | null) => void
  resetChrome: () => void
}

let menuSeq = 0
let pickSeq = 0

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

  pendingPick: null,
  requestPick: (req) => set({ pendingPick: { ...req, id: ++pickSeq } }),
  dismissPick: () => set({ pendingPick: null }),

  detailCount: null,
  setDetailCount: (count) => set({ detailCount: count }),

  editorSelection: null,
  // Path-guarded both ways: a blur clears only its own figures, so a rival editor's claim isn't undone by the clear that follows it.
  setEditorSelection: (path, stats) =>
    set((s) => {
      const cur = s.editorSelection
      if (!stats) return cur?.path === path ? { editorSelection: null } : {}
      return { editorSelection: { path, ...stats } }
    }),

  resetChrome: () => {
    get().pendingConfirm?.settle(false)
    get().pendingMenu?.settle(null)
    set({
      pendingConfirm: null,
      pendingMenu: null,
      pendingPick: null,
      detailCount: null,
      editorSelection: null,
    })
  },
})
