/** The in-nexus `.trash` (portable, index-aware) or the macOS system Trash. Device-level since system Trash isn't portable nexus data. */
export type TrashMode = 'nexus' | 'system'

export const DEFAULT_TRASH_MODE: TrashMode = 'nexus'
