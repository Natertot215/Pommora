import type { NavRef, NewTabSentinel } from '../../Navigation/navRef'

/** Identity only. Paths are minted at restore; the history pointer is recomputed as dead refs
 *  prune, so nothing stored can go stale or desync. */
export interface StoredTab {
  id: string
  target: NavRef | NewTabSentinel
  navStack: NavRef[]
  navIndex: number
}

/** Device-local; every glance opens at it. */
export interface GlanceSize {
  w: number
  h: number
}

export interface StoredTabSet {
  tabs: StoredTab[]
  activeTabId: string
}

/** Bare refs only — ids are session-local and re-minted at restore; `activeIndex` points into
 *  `tabs` by strip order. The NavWindow's gallery sentinel never persists — opening the nav
 *  flavor re-seeds it as tab 1. */
export interface WindowSetRecord {
  tabs: { target: NavRef }[]
  activeIndex: number
}

/** One device-local row: the NavWindow flavor's one set, the per-origin sets keyed by origin
 *  page id (re-keyed on re-parent), and which window was open (recorded for the map; launch
 *  never auto-summons). */
export interface WindowsFile {
  navSet: WindowSetRecord | null
  origins: Record<string, WindowSetRecord>
  open: { flavor: 'page' | 'nav'; originId: string } | null
  /** "Open Preview" from NavWindow rows opens a tab in THIS window instead of the floating
   *  window. Absent = on (the default: the override wins). */
  navOverride?: boolean
}

/** Shared so main's reader and the renderer's reset can't drift into two different "empty". */
export const EMPTY_WINDOWS: WindowsFile = { navSet: null, origins: {}, open: null }
