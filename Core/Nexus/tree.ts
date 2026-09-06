import type { PommoraError } from '../Contract/result'
import type { ContextDef } from '../Properties/contexts'
import type { PropertyDefinition } from '../Properties/properties'
import type { Personalization } from '../Settings/personalization'
import type { OpenIn, ViewButton } from '../Views/viewRow'
import type { SavedView } from '../Views/views'
import type { AccentSetting } from '@pommora/uix/Theme/colorSetting'
import type { Crop } from './schemas'

export type NodeKind = 'space' | 'collection' | 'set' | 'page'

interface BaseNode {
  id: string
  kind: NodeKind
  title: string
  icon?: string
}

/** A node backed by a real file or folder on disk, carrying its nexus-relative POSIX path so a
 *  mutation can address it: the renderer sends `path` back and main resolves it under the
 *  session root — the renderer must never reconstruct the on-disk path itself. */
interface PathNode extends BaseNode {
  path: string
  /** From the sidecar; a page's banner rides its own frontmatter key instead. */
  banner?: string
  headingIconHidden?: boolean
}

export interface PageNode extends PathNode {
  kind: 'page'
  /** contextId → Space ids, attached at walk assembly from the raw keys the parse retains. */
  contextValues?: Record<string, string[]>
}

export interface SpaceNode extends PathNode {
  kind: 'space'
  contextId: string
  color?: string
  contextValues?: Record<string, string[]>
}

export interface ContextGroup {
  def: ContextDef
  spaces: SpaceNode[]
}

export interface SetNode extends PathNode {
  kind: 'set'
  /** Optional so a container read that stops short of the recursion still types. */
  sets?: SetNode[]
  pages: PageNode[]
  views?: SavedView[]
  viewButton?: ViewButton
  disclosureLocked?: boolean
}

export interface CollectionNode extends PathNode {
  kind: 'collection'
  sets: SetNode[] // rendered before pages
  pages: PageNode[]
  properties?: PropertyDefinition[]
  views?: SavedView[]
  openIn?: OpenIn
  viewButton?: ViewButton
  disclosureLocked?: boolean
}

/** Keyed by normalized basename. Every path answering to a name is held, sorted, so display takes
 *  the first while a delete refuses to choose and an unlink has something to promote. `version`
 *  moves on every change, so a re-save under an unchanged name is re-requested. */
export interface AssetMap {
  files: Record<string, string[]>
  version: number
}

/** What both processes stand in for a map with no listing behind it — main before a nexus is
 *  open, the renderer before the first push lands. */
export const EMPTY_ASSET_MAP: AssetMap = { files: {}, version: 0 }

export interface ValueChange {
  rel: string
  pageIds: string[]
}

export type ValuesEpoch = { n: number } & (
  | { kind: 'rename'; oldKey: string; newKey: string }
  | { kind: 'container'; changes: ValueChange[] }
)

export interface NexusTree {
  /** `name` is the root folder's basename. `profileImage` names an image in the asset directory
   *  as a `[[Name.ext]]` wikilink — or, in a nexus the migration hasn't run against, a
   *  nexus-relative path. Both come from `.nexus/settings.json`. */
  nexus: {
    id: string
    rootPath: string
    name: string
    profileImage: string | null
    profileIcon?: string
    profileSubtitle: string
  }
  /** The tile doc's heavy layout and entries stay off the walk, loaded lazily by useTileDoc. */
  homepage: { banner?: string; headingIconHidden: boolean }
  crops: Record<string, Crop>
  collections: CollectionNode[]
  contexts: ContextGroup[]
  accent: AccentSetting
  personalization: Personalization
  commands: Record<string, string>
  excluded: string[]
  /** Outside the content corpus and the tree, and watched regardless of `excluded`. */
  assetDirectory: string
  registry: PropertyDefinition[]
  /** Unparseable, not missing — absence is a missing entry instead. */
  unreadable?: { path: string }[]
}

/** `empty` = no nexus open (show the empty state, not an error); `open` = open + read OK;
 *  `error` = a nexus is open but its tree couldn't be read. */
export type NexusState =
  | { status: 'empty' }
  | { status: 'open'; tree: NexusTree }
  | { status: 'error'; error: PommoraError }
