import type { NavRef } from '../../Navigation/navRef'

export interface GlanceSize {
  w: number
  h: number
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
