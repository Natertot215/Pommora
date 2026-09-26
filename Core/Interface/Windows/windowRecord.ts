import type { NavRef } from '../../Navigation/navRef'

/** Bare refs only — ids are session-local and re-minted at restore. */
export interface WindowSetRecord {
  tabs: { target: NavRef }[]
}

export type WindowKind = 'page' | 'nav' | 'matrix'

export interface WindowsFile {
  sets: Partial<Record<WindowKind, WindowSetRecord>>
}

export const EMPTY_WINDOWS: WindowsFile = { sets: {} }
