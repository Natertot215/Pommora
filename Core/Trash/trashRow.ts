import type { EntityIconKind } from '../Settings/personalization'

/** `kind` is absent on a historical crumb, which is a frozen folder name rather than a live entity. */
export interface TrashCrumb {
  kind?: EntityIconKind
  title: string
}

export interface ClearReport {
  pages: number
  sidecars: number
  refused: number
}

/** Main owns the parse: the renderer never sees a `.deleted` suffix, a folder stamp, or the record union. */
export interface TrashRow {
  bundlePath: string
  kind: EntityIconKind
  title: string
  /** Resolved live from the recorded parent id, so a renamed ancestor reads true. */
  crumbs: TrashCrumb[]
  /** Set when the recorded parent resolves to nothing and `crumbs` fell back to the frozen chain. */
  historical?: boolean
  /** Epoch milliseconds from the bundle's own stamp; null when it won't parse. */
  deletedAt: number | null
  /** False when restoring would refuse for want of a home — the signal to ask where instead. */
  homeResolves: boolean
}

/** The in-nexus `.trash` (portable, index-aware) or the macOS system Trash. Device-level since system Trash isn't portable nexus data. */
export type TrashMode = 'nexus' | 'system'

export const DEFAULT_TRASH_MODE: TrashMode = 'nexus'
