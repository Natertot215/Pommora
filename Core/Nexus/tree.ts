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
  /** Derived from the file/folder basename — never stored on disk. */
  title: string
  /** A symbol name; overrides the kind's default icon. */
  icon?: string
}

/** A node backed by a real file or folder on disk, carrying its nexus-relative POSIX path so a
 *  mutation can address it: the renderer sends `path` back and main resolves it under the
 *  session root — the renderer must never reconstruct the on-disk path itself. */
interface PathNode extends BaseNode {
  path: string
  /** Only banner-bearing owners (Collections/Sets + contexts) populate it, surfaced from the
   *  sidecar `banner` field (a page's banner rides its own frontmatter `banner` key). */
  banner?: string
  /** From the sidecar `heading_icon_hidden`. Absent/false = shown. */
  headingIconHidden?: boolean
}

export interface PageNode extends PathNode {
  kind: 'page'
  /** contextId → the member's Space ids, attached at walk assembly from the raw parenthesized
   *  keys the parse retains. Absent = no links. */
  contextValues?: Record<string, string[]>
}

/** One Space — a member of a Context, backed by `.nexus/contexts/<Context>/<Space>/`. */
export interface SpaceNode extends PathNode {
  kind: 'space'
  /** Derived from the parent folder at walk. */
  contextId: string
  /** Chip-solid palette key; absent = the neutral grey Default. */
  color?: string
  contextValues?: Record<string, string[]>
}

export interface ContextGroup {
  def: ContextDef
  spaces: SpaceNode[]
}

export interface SetNode extends PathNode {
  kind: 'set'
  /** Optional so a container read that stops short of the recursion still types; the walk
   *  populates it. */
  sets?: SetNode[]
  pages: PageNode[]
  /** Depth-1 Sets only; deeper Sub-Sets ignore them. */
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

/** Keyed by normalized basename — what a `[[Name.png]]` reference resolves against. Every path
 *  answering to a name is held, sorted, so display can take the first while a delete refuses to
 *  choose; holding only the winner would leave an unlink with nothing to promote. `version`
 *  moves on every change, so a file re-saved under an unchanged name is re-requested rather than
 *  left as a deep-equal map nothing repaints for. */
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
  /** Nexus-relative folder paths the walk, the watcher, and the content index all step around. */
  excluded: string[]
  /** Nexus-relative POSIX, defaulting to `.nexus/assets`. Outside the content corpus and the
   *  tree, and watched regardless of `excluded`. */
  assetDirectory: string
  registry: PropertyDefinition[]
  /** A present-but-unparseable sidecar, an Unknown or unreadable page. Distinct from absence,
   *  which is a missing entry; absent when empty. */
  unreadable?: { path: string }[]
}

/** `empty` = no nexus open (show the empty state, not an error); `open` = open + read OK;
 *  `error` = a nexus is open but its tree couldn't be read.*/
export type NexusState =
  | { status: 'empty' }
  | { status: 'open'; tree: NexusTree }
  | { status: 'error'; error: PommoraError }
