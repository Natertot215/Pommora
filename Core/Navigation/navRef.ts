import { isPlainObject } from '../Properties/propertyValue'

export type SelectionState =
  | { kind: 'none' }
  | { kind: 'homepage' }
  | { kind: 'matrix' }
  /** Reserved for ContextView; member selection is `space`. */
  | { kind: 'context'; id: string }
  | { kind: 'space'; id: string }
  | { kind: 'collection'; id: string }
  | { kind: 'set'; id: string; path: string }
  | { kind: 'page'; id: string; path: string }

export type SelectTarget = Exclude<SelectionState, { kind: 'none' }>

export type PageTarget = Extract<SelectTarget, { kind: 'page' }>
export type SpaceTarget = Extract<SelectTarget, { kind: 'space' }>
export const TAB_FAMILY = 'tabs'

export type NavRef =
  | { kind: 'homepage' }
  | { kind: 'matrix' }
  | { kind: 'context' | 'space' | 'collection' | 'set' | 'page' | 'task' | 'event'; id: string }

export const isSingleton = (t: { kind?: unknown }): t is { kind: 'homepage' | 'matrix' } =>
  t.kind === 'homepage' || t.kind === 'matrix'

export function toNavRef(t: NavRef | SelectTarget): NavRef {
  return isSingleton(t) ? { kind: t.kind } : { kind: t.kind, id: t.id }
}

const NAV_KINDS = new Set<string>([
  'homepage',
  'matrix',
  'context',
  'space',
  'collection',
  'set',
  'page',
  'task',
  'event',
])

export const TAB_KINDS = new Set<string>(
  [...NAV_KINDS].filter((k) => k !== 'task' && k !== 'event'),
)

export function isNavRef(v: unknown, kinds: ReadonlySet<string> = NAV_KINDS): v is NavRef {
  if (!isPlainObject(v) || typeof v.kind !== 'string' || !kinds.has(v.kind)) return false
  return isSingleton(v) ? !('id' in v) : typeof v.id === 'string' && v.id.length > 0
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

export type WindowTarget = PageTarget | SpaceTarget

export const isWindowTarget = (t: { kind: string }): t is WindowTarget =>
  t.kind === 'page' || t.kind === 'space'

export type WindowTabTarget = WindowTarget | { kind: 'navwindow' }

/** `isPinned` is never stored — it is derived from the pinned refs; only unpinned tabs persist, as bare refs. */
export interface Tab {
  id: string
  target: TabTarget
  navStack: SelectTarget[]
  navIndex: number
}

export interface StoredTab {
  id: string
  target: NavRef | NewTabSentinel
  navStack: NavRef[]
  navIndex: number
}

export interface StoredTabSet {
  tabs: StoredTab[]
  activeTabId: string
}
