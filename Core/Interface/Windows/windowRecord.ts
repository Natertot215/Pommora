import type { NavRef } from '../../Navigation/navRef'

export interface GlanceSize {
  w: number
  h: number
}

/** Bare refs only — ids are session-local and re-minted at restore. */
export interface WindowSetRecord {
  tabs: { target: NavRef }[]
}

export type WindowKind = 'page' | 'nav' | 'matrix'

export interface WindowsFile {
  navSet: WindowSetRecord | null
  pageSet: WindowSetRecord | null
}

export const EMPTY_WINDOWS: WindowsFile = { navSet: null, pageSet: null }
