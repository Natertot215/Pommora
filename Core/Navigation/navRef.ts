export type SelectionState =
  | { kind: 'none' }
  | { kind: 'homepage' }
  /** Reserved for ContextView; member selection is `space`. */
  | { kind: 'context'; id: string }
  | { kind: 'space'; id: string }
  | { kind: 'collection'; id: string }
  /** A depth-1 Set (direct child of a Collection) — the only selectable Set; deeper Sub-Sets
   *  are expand-only. Carries `path` for rename-safe reconciliation, like a page. */
  | { kind: 'set'; id: string; path: string }
  | { kind: 'page'; id: string; path: string }

/** Every `SelectionState` except the transient `none` — the live, path-carrying targets. */
export type SelectTarget = Exclude<SelectionState, { kind: 'none' }>

/** Identity only; titles, icons, and paths resolve live. */
export type NavRef =
  | { kind: 'homepage' }
  | { kind: 'context' | 'space' | 'collection' | 'set' | 'page' | 'task' | 'event'; id: string }

/** The ONE strip between a live target and anything stored, shared by both processes so the
 *  in-memory arrays, the persist payload, and the file are one shape. */
export function toNavRef(t: NavRef | SelectTarget): NavRef {
  return t.kind === 'homepage' ? { kind: 'homepage' } : { kind: t.kind, id: t.id }
}

/** Where each key persists is the IO module's business: pinned/favorites/banner in
 *  `.nexus/navigation.json`, recents in the device-local db row. Array position IS the order;
 *  an absent key is an empty list. */
export interface NavigationState {
  pinned?: NavRef[]
  favorites?: NavRef[]
  recents?: NavRef[]
  banner?: string
}

/** A tab target that maps to NavView (the `'none'` detail branch); NOT a `SelectionState` kind,
 *  so it bypasses `select` entirely. */
export type NewTabSentinel = { kind: 'newtab' }

export type TabTarget = SelectTarget | NewTabSentinel

/** A page, or the NavWindow flavor's tab-1 sentinel — the gallery itself; no id/path, never
 *  warmed. */
export type WindowTabTarget = SelectTarget | { kind: 'navwindow' }

/** Carries its OWN Back/Forward history (`navStack`/`navIndex`). `isPinned` is never stored —
 *  it's derived from the pinned refs. Only unpinned tabs persist, as bare refs; restore hydrates
 *  them against the tree. */
export interface Tab {
  id: string
  target: TabTarget
  navStack: SelectTarget[]
  navIndex: number
}
