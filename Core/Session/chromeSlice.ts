import type { ActionItem, MenuOptions } from '../Actions/menuModel'
import type { MetadataTarget } from '../Actions/metadataMenu'
import type { ColumnStyle } from '../Properties/columnStyles'
import type { ConfirmRequest } from '../Interface/Confirm/confirmations'
import type { PageStats } from '../MarkdownPM/Engine/subfieldStats'
import type { Slice } from './sessionState'
import type { ResolvedColumn } from '../Properties/properties'

interface MenuPending extends MenuOptions {
  id: number
  items: readonly ActionItem<string>[]
  trigger: HTMLElement
  settle: (action: string | null) => void
}

type ValuePickRequest = Pick<MetadataTarget, 'rowOf' | 'commit' | 'trigger'> & {
  column: ResolvedColumn
  style?: ColumnStyle
}

type ChoiceRequest = { trigger: Element; value?: string } & (
  | { of: 'icon'; onPick: (icon: string) => void }
  | { of: 'color'; onPick: (color: string | undefined) => void; greyscale?: boolean }
)

export interface ChromeSlice {
  pendingConfirm: { req: ConfirmRequest; settle: (confirmed: boolean) => void } | null
  askConfirm: (req: ConfirmRequest) => Promise<boolean>
  pendingMenu: MenuPending | null
  presentMenu: (
    items: readonly ActionItem<string>[],
    trigger: HTMLElement,
    options?: MenuOptions,
  ) => Promise<string | null>
  pendingPick: ValuePickRequest | null
  requestPick: (req: ValuePickRequest) => void
  dismissPick: () => void
  pendingChoice: ChoiceRequest | null
  requestChoice: (req: ChoiceRequest) => void
  dismissChoice: () => void
  /** The Subfield sits beside the detail rather than inside it, so whatever is mounted there publishes how many rows it resolved. */
  detailCount: number | null
  setDetailCount: (count: number | null) => void
  /** The focused editor's figures for its own highlight, so a page's counter measures the selection instead of the document. */
  editorSelection: (PageStats & { path: string }) | null
  setEditorSelection: (path: string, stats: PageStats | null) => void
  resetChrome: () => void
}

export const pickOpen = (s: Pick<ChromeSlice, 'pendingPick' | 'pendingChoice'>): boolean =>
  s.pendingPick !== null || s.pendingChoice !== null

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

  pendingPick: null,
  requestPick: (req) => set({ pendingPick: req }),
  dismissPick: () => set({ pendingPick: null }),

  pendingChoice: null,
  requestChoice: (req) => set({ pendingChoice: req }),
  dismissChoice: () => set({ pendingChoice: null }),

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
      pendingChoice: null,
      detailCount: null,
      editorSelection: null,
    })
  },
})
