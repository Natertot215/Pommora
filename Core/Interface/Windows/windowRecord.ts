import type { NavRef, NewTabSentinel } from '../../Navigation/navRef'

export interface StoredTab {
  id: string
  target: NavRef | NewTabSentinel
  navStack: NavRef[]
  navIndex: number
}

export interface GlanceSize {
  w: number
  h: number
}

export interface StoredTabSet {
  tabs: StoredTab[]
  activeTabId: string
}

/** Bare refs only — ids are session-local and re-minted at restore. */
export interface WindowSetRecord {
  tabs: { target: NavRef }[]
  activeIndex: number
}

export type WindowKind = 'page' | 'nav' | 'matrix'

export interface WindowsFile {
  navSet: WindowSetRecord | null
  origins: Record<string, WindowSetRecord>
  open: { kind: WindowKind; originId: string } | null
  navOverride?: boolean
}

export const EMPTY_WINDOWS: WindowsFile = { navSet: null, origins: {}, open: null }
