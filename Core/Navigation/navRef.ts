import { isPlainObject } from '../Properties/propertyValue'

export type SelectionState =
  | { kind: 'none' }
  | { kind: 'homepage' }
  /** Reserved for ContextView; member selection is `space`. */
  | { kind: 'context'; id: string }
  | { kind: 'space'; id: string }
  | { kind: 'collection'; id: string }
  /** A depth-1 Set is the only selectable Set; deeper Sub-Sets are expand-only. */
  | { kind: 'set'; id: string; path: string }
  | { kind: 'page'; id: string; path: string }

export type SelectTarget = Exclude<SelectionState, { kind: 'none' }>

export type NavRef =
  | { kind: 'homepage' }
  | { kind: 'context' | 'space' | 'collection' | 'set' | 'page' | 'task' | 'event'; id: string }

export function toNavRef(t: NavRef | SelectTarget): NavRef {
  return t.kind === 'homepage' ? { kind: 'homepage' } : { kind: t.kind, id: t.id }
}

const NAV_KINDS = new Set<string>([
  'homepage',
  'context',
  'space',
  'collection',
  'set',
  'page',
  'task',
  'event',
])

/** A tab never seats an Agenda entity. */
export const TAB_KINDS = new Set<string>(
  [...NAV_KINDS].filter((k) => k !== 'task' && k !== 'event'),
)

export function isNavRef(v: unknown, kinds: ReadonlySet<string> = NAV_KINDS): v is NavRef {
  if (!isPlainObject(v) || typeof v.kind !== 'string' || !kinds.has(v.kind)) return false
  return v.kind === 'homepage' ? !('id' in v) : typeof v.id === 'string' && v.id.length > 0
}

export interface NavigationState {
  pinned?: NavRef[]
  favorites?: NavRef[]
  recents?: NavRef[]
  banner?: string
}

/** NOT a `SelectionState` kind, so it bypasses `select` entirely. */
export type NewTabSentinel = { kind: 'newtab' }

export type TabTarget = SelectTarget | NewTabSentinel

export type WindowTabTarget = SelectTarget | { kind: 'navwindow' }

/** `isPinned` is never stored — it is derived from the pinned refs; only unpinned tabs persist, as bare refs. */
export interface Tab {
  id: string
  target: TabTarget
  navStack: SelectTarget[]
  navIndex: number
}
