import { isPlainObject } from '../Contract/validators'
import { NODE_KINDS, type NodeKind } from '../Nexus/entities'

type NodeTarget = {
  [K in NodeKind]: K extends 'set' | 'page'
    ? { kind: K; id: string; path: string }
    : { kind: K; id: string }
}[NodeKind]

export type SelectionState =
  | { kind: 'none' }
  | { kind: 'homepage' }
  | { kind: 'matrix' }
  | NodeTarget

export type SelectTarget = Exclude<SelectionState, { kind: 'none' }>

export function selectTargetOf(t: { kind: NodeKind; id: string; path: string }): SelectTarget {
  switch (t.kind) {
    case 'page':
      return { kind: 'page', id: t.id, path: t.path }
    case 'set':
      return { kind: 'set', id: t.id, path: t.path }
    case 'collection':
      return { kind: 'collection', id: t.id }
    case 'space':
      return { kind: 'space', id: t.id }
  }
}

export type PageTarget = Extract<SelectTarget, { kind: 'page' }>
export type SpaceTarget = Extract<SelectTarget, { kind: 'space' }>

export type NavRef = { kind: 'homepage' } | { kind: 'matrix' } | { kind: NodeKind; id: string }

export const isSingleton = (t: { kind?: unknown }): t is { kind: 'homepage' | 'matrix' } =>
  t.kind === 'homepage' || t.kind === 'matrix'

export function toNavRef(t: NavRef | SelectTarget): NavRef {
  return isSingleton(t) ? { kind: t.kind } : { kind: t.kind, id: t.id }
}

export function navKey(t: NavRef | SelectTarget): string {
  return 'id' in t ? `${t.kind}:${t.id}` : t.kind
}

const NAV_KINDS: ReadonlySet<string> = new Set<NavRef['kind']>([
  'homepage',
  'matrix',
  ...NODE_KINDS,
])

export function isNavRef(v: unknown, kinds: ReadonlySet<string> = NAV_KINDS): v is NavRef {
  if (!isPlainObject(v) || typeof v.kind !== 'string' || !kinds.has(v.kind)) return false
  return isSingleton(v) ? !('id' in v) : typeof v.id === 'string' && v.id.length > 0
}

export const isForeignRef = (v: unknown): boolean =>
  isPlainObject(v) && typeof v.kind === 'string' && !NAV_KINDS.has(v.kind)

export interface NavigationState {
  pinned?: NavRef[]
  recents?: NavRef[]
  banner?: string
}

/** NOT a `SelectionState` kind, so it bypasses `select` entirely. */
export type NewTabSentinel = { kind: 'newtab' }

export type TabTarget = SelectTarget | NewTabSentinel

export type WindowTarget = PageTarget | SpaceTarget

export const isWindowTarget = (t: { kind: string }): t is WindowTarget =>
  t.kind === 'page' || t.kind === 'space'

export type WindowTabTarget = WindowTarget | { kind: 'map' }

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
