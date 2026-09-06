// Renderer→main write requests. Paths are nexus-relative POSIX, resolved under the session root.

import type { Result } from '../Contract/result'
import type { PageMoveContext } from '../Actions/pageMenu'
import type { PropertyValue } from '../Properties/propertyValue'
import type { Crop } from '../Nexus/schemas'

/** `renamed` is what actually landed — a from-create rename may disambiguate away from the ask. */
export interface MutateOutcome {
  created?: { id: string; path: string }
  renamed?: { path: string; name: string }
  adopted?: string
  trashed?: { bundlePath: string }
}
export type MutateReply = Result<MutateOutcome>

export const DEFAULT_NEW_NAME = 'Untitled'

/** The renderer orders siblings before the id exists, so this slot marks where it lands. */
export const NEW_PAGE_SLOT = '$new-page'

/** `context` is a registry group, not a NodeKind; the code-keyed `saved` is excluded. */
export type MutableKind = 'page' | 'collection' | 'set' | 'space' | 'context'

/** Homepage rides `homepage.json`, navview `navigation.json`, page its frontmatter `banner`;
 *  the rest are folder sidecars. */
export type BannerOwnerKind = 'collection' | 'set' | 'space' | 'homepage' | 'navview' | 'page'

/** Matches SidecarKind names exactly, so main passes them straight to createFolderEntity. */
export type MutableContainerKind = 'collection' | 'set'

/** `kind` is the sender's claim about the id, checked against the write path's own matrix: a
 *  contradicting claim is refused as malformed. */
export interface RestoreDestination {
  kind: 'container' | 'context'
  id: string
}

/** Contexts order through the registry and `reorderContexts`, so only Collections belong here. */
export type StateOrderKey = 'collection_order'
export type ChildOrderKey = 'collection_order' | 'set_order'

/** A renderer→main write request. `parentPath: ''` targets the nexus root (new vault). */
export type MutateRequest =
  // `seeds` stamp in the birth write; `order` carries one NEW_PAGE_SLOT for the minted id.
  | {
      op: 'createPage'
      parentPath: string
      name: string
      seeds?: Record<string, PropertyValue>
      order?: string[]
    }
  | { op: 'createContainer'; parentPath: string; kind: MutableContainerKind; name: string }
  // Membership is keyed by TITLE, so Spaces and Contexts rename through their own ops.
  // `fromCreate` marks a just-created page's first commit: disambiguates like a create, and
  // skips the link cascade a linkless page can't need.
  | {
      op: 'rename'
      path: string
      kind: Exclude<MutableKind, 'space' | 'context'>
      newName: string
      fromCreate?: true
    }
  | { op: 'delete'; path: string; kind: MutableKind }
  // `destination` overrides the recorded parent, for kinds whose home can go missing.
  | { op: 'restore'; bundlePath: string; destination?: RestoreDestination }
  // Unrecoverable: the OS trash, or erased outright under `personalization.permanentDelete`.
  | { op: 'emptyBundle'; bundlePath: string }
  | { op: 'setProfileImage'; source: string | null }
  | { op: 'setProfileIcon'; icon: string | null }
  // ≤30 chars, enforced. Parked: the sidebar NexusHeader that edited it is gone (ribbon rework);
  // retained for the eventual homepage/settings surface — NOT dead code.
  | { op: 'setProfileSubtitle'; subtitle: string }
  // Adopted into the asset directory, or referenced where it already sits; the owner's config
  // names it by wikilink.
  | { op: 'setBanner'; path: string; kind: BannerOwnerKind; source: string | null }
  | { op: 'setCrop'; image: string; crop: Crop | null }
  | { op: 'setHeadingIconHidden'; path: string; kind: BannerOwnerKind; hidden: boolean }
  // Frontmatter `icon` on a page, the JSON sidecar on a container or context.
  | { op: 'setIcon'; path: string; kind: MutableKind; icon: string | null }
  | { op: 'setDisclosureLock'; path: string; kind: MutableContainerKind; locked: boolean }
  // Under the wrapped key its definition's name builds; `null` clears it.
  | { op: 'setProperty'; path: string; propertyId: string; value: PropertyValue | null }
  // Absent order = legacy append. Stale ids in a source container self-drop on the next read.
  | { op: 'movePage'; path: string; newParentPath: string; order?: string[] }
  | { op: 'moveSet'; path: string; newParentPath: string; order: string[] }
  | { op: 'reorderChildren'; parentPath: string; key: ChildOrderKey; order: string[] }
  | { op: 'reorderTop'; key: StateOrderKey; order: string[] }
  // — Registry-backed Contexts & Spaces (ids in memory; main resolves titles at the write) —
  | { op: 'createContextGroup'; name: string }
  | { op: 'createSpace'; contextId: string; name: string }
  | { op: 'renameContext'; contextId: string; newName: string }
  | { op: 'renameSpace'; spaceId: string; newName: string }
  | { op: 'setContext'; path: string; contextId: string; spaceIds: string[] }
  | { op: 'setSpaceColor'; spaceId: string; color?: string }
  | { op: 'reorderContexts'; ids: string[] }
  | { op: 'reorderSpaces'; contextId: string; ids: string[] }

export type RenameHost = 'detail' | 'sidebar'

export interface ContextTarget extends PageMoveContext {
  kind: MutableKind
  path: string
  title: string
  /** Lets the menu offer "Open New Tab"; surfaces without an id simply don't get the item. */
  id?: string
  alreadyOpen?: boolean
  disclosureLocked?: boolean
  /** Echoed into `begin-rename` so the field opens where the gesture happened; absent, the
   *  fence resolves by rank. */
  host?: RenameHost
}

export interface Creator {
  label: string
  req: MutateRequest
}

/** A container's contents are a property of the container, not the surface asking, so the
 *  sidebar menu and the subfield's add button offer the same pair. */
export function containerCreators(kind: MutableContainerKind, parentPath: string): Creator[] {
  const name = DEFAULT_NEW_NAME
  const nested = kind === 'collection' ? 'Set' : 'Sub-Set'
  return [
    { label: 'New Page', req: { op: 'createPage', parentPath, name } },
    { label: `New ${nested}`, req: { op: 'createContainer', parentPath, kind: 'set', name } },
  ]
}
