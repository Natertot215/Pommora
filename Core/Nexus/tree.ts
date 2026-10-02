import type { ContextDef } from '../Contexts/contexts'
import type { PropertyDefinition } from '../Properties/properties'
import type { SettingsLeaves } from '../Settings/codec'
import type { OpenIn, ViewButton } from '../Views/viewRow'
import type { SavedView } from '../Views/views'
import type { NodeKind } from './entities'
import type { Crop, PageMeta } from './schemas'
import type { Delta } from './treeDelta'

interface BaseNode {
  id: string
  kind: NodeKind
  title: string
}

/** Carries its nexus-relative POSIX path so a mutation can address it: the renderer sends `path` back and main resolves it under the session root. */
interface PathNode extends BaseNode {
  path: string
}

interface ChromeNode extends PathNode {
  icon?: string
  banner?: string
  headingIconHidden?: boolean
}

export interface PageNode extends PathNode {
  kind: 'page'
  contextValues?: Record<string, string[]>
}

export interface SpaceNode extends ChromeNode {
  kind: 'space'
  contextId: string
  color?: string
  contextValues?: Record<string, string[]>
  values?: Record<string, unknown>
}

export interface ContextGroup {
  def: ContextDef
  spaces: SpaceNode[]
}

interface ContainerNode extends ChromeNode {
  sets?: SetNode[]
  pages: PageNode[]
  views?: SavedView[]
  viewButton?: ViewButton
  disclosureLocked?: boolean
  activeView?: string
  /** The sidecar's order lists as written, which rank a child the tree gains between walks. */
  pageOrder?: string[]
  setOrder?: string[]
}

export interface SetNode extends ContainerNode {
  kind: 'set'
}

export interface CollectionNode extends ContainerNode {
  kind: 'collection'
  sets: SetNode[]
  properties?: PropertyDefinition[]
  openIn?: OpenIn
  /** The properties a Remove cached values for, so a Link cascade opens only the sidecars that could hold one. */
  cached?: string[]
}

/** Keyed by normalized basename. Every path answering to a name is held, sorted, so display takes the first while a delete refuses to choose and an unlink has something to promote. A path's entry in `versions` moves when it's re-saved under an unchanged name, so only that file is re-requested. */
export interface AssetMap {
  files: Record<string, string[]>
  versions: Record<string, number>
}

/** What both processes stand in for a map with no listing behind it — main before a nexus is open, the renderer before the first push lands. */
export const EMPTY_ASSET_MAP: AssetMap = { files: {}, versions: {} }

export interface ValueChange {
  rel: string
  pageIds: string[]
  /** The pages whose only write was their own editor's body save, which the window already holds. */
  bodyOnly?: string[]
}

export type ValuesEpoch = { n: number } & (
  | { kind: 'rename'; oldKey: string; newKey: string }
  | { kind: 'container'; changes: ValueChange[] }
)

export interface NexusOrder {
  collections?: string[]
  /** The Properties panel's Context order, which moves independently of the registry's. */
  contexts?: string[]
  spaces: Record<string, unknown>
}

export interface NexusConfig extends SettingsLeaves {
  /** The tile doc's heavy layout and entries stay off the walk, loaded lazily by useTileDoc. */
  homepage: { banner?: string; headingIconHidden: boolean }
  crops: Record<string, Crop>
  pageMetadata: Record<string, PageMeta>
  order: NexusOrder
  registry: PropertyDefinition[]
}

export type UnreadReason = 'missing' | 'malformed' | 'contradicting' | 'unparsed'

export interface Unreadable {
  path: string
  kind: NodeKind | 'registry'
  reason: UnreadReason
}

export const byPath = (a: Unreadable, b: Unreadable): number =>
  a.path < b.path ? -1 : a.path > b.path ? 1 : 0

export interface NexusTree {
  nexus: { id: string; rootPath: string; name: string }
  collections: CollectionNode[]
  contexts: ContextGroup[]
  config: NexusConfig
  /** The files the Nexus holds and the tree doesn't: each is absent from `collections` and `contexts` until it reads. */
  unreadable?: Unreadable[]
}

export type NexusState = { status: 'empty' } | { status: 'open'; tree: NexusTree; version: number }

/** What a settle changed in the tree, as the window applies it. A window that holds any version but the one before asks for the whole tree. */
export interface NexusChange {
  version: number
  delta: Delta
}

export function entityMemo<T>(build: (tree: NexusTree) => T): (tree: NexusTree) => T {
  const held = new WeakMap<CollectionNode[], { contexts: ContextGroup[]; value: T }>()
  return (tree) => {
    const hit = held.get(tree.collections)
    if (hit?.contexts === tree.contexts) return hit.value
    const value = build(tree)
    held.set(tree.collections, { contexts: tree.contexts, value })
    return value
  }
}

export const withheldIn =
  (listed: readonly Unreadable[] = []) =>
  (path: string): boolean =>
    listed.some((u) => u.kind !== 'page' && (path === u.path || path.startsWith(`${u.path}/`)))

export const damagedFolders = (listed: readonly Unreadable[] = []): Unreadable[] =>
  listed.filter((u) => u.reason === 'unparsed' && (u.kind === 'collection' || u.kind === 'set'))
