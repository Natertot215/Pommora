// The mutate IPC contract — renderer→main write requests. Paths are nexus-relative POSIX (main
// resolves them under the session root); entities are addressed by path, never by a
// renderer-supplied absolute path. Kept out of types.ts so it can import the data-layer shape.

import type { Result } from './result'
import type { PageMoveContext } from './pageMenu'
import type { PropertyValue } from './propertyValue'
import type { Crop } from './schemas'

/** `renamed` carries what actually landed — a from-create rename may disambiguate away from the
 *  requested name, and every consumer patches from the landed name, never the ask. */
export interface MutateOutcome {
  created?: { id: string; path: string }
  renamed?: { path: string; name: string }
  /** A re-pick's Save-hold waits for the seat's value to reach it; a dedup (adopted === the
   *  value already set) releases at once. */
  adopted?: string
  /** Where a delete's artifact landed, nexus-relative — the reference `restore` takes, and so the
   *  whole of what Undo needs. Absent in system-trash mode, where the artifact leaves the nexus
   *  and nothing can bring it back. */
  trashed?: { bundlePath: string }
}
export type MutateReply = Result<MutateOutcome>

export const DEFAULT_NEW_NAME = 'Untitled'

/** The renderer computes the full sibling order before the id exists, so this slot marks where
 *  it lands. */
export const NEW_PAGE_SLOT = '$new-page'

/** Every NodeKind except the code-keyed `saved`, plus `context` (a registry group, not a
 *  NodeKind). */
export type MutableKind = 'page' | 'collection' | 'set' | 'space' | 'context'

/** Homepage rides `.nexus/homepage.json`; navview rides `navigation.json`; page rides its
 *  frontmatter `banner`; the rest are folder sidecars. */
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
/** Carried by reorderChildren — collections on a vault, sets on a collection. */
export type ChildOrderKey = 'collection_order' | 'set_order'

/** A renderer→main write request. `parentPath: ''` targets the nexus root (new vault). */
export type MutateRequest =
  // `seeds`: stamped in the same write the page is born in (dead ids drop). `order`: the
  // parent's full page-id order carrying one NEW_PAGE_SLOT for the minted id.
  | {
      op: 'createPage'
      parentPath: string
      name: string
      seeds?: Record<string, PropertyValue>
      order?: string[]
    }
  | { op: 'createContainer'; parentPath: string; kind: MutableContainerKind; name: string }
  // Spaces and Contexts rename through their own ops: membership is keyed by TITLE, so a
  // path-addressed folder rename would strip every tag silently. `fromCreate` marks a
  // just-created page's first commit — disambiguates like a create, and skips the link cascade
  // a linkless page can't need.
  | {
      op: 'rename'
      path: string
      kind: Exclude<MutableKind, 'space' | 'context'>
      newName: string
      fromCreate?: true
    }
  | { op: 'delete'; path: string; kind: MutableKind }
  // Resolves against the CURRENT tree; `destination` overrides the recorded parent, for kinds
  // whose home can go missing.
  | { op: 'restore'; bundlePath: string; destination?: RestoreDestination }
  // Leaves for the OS trash, or is erased outright when `personalization.permanentDelete` is on.
  // Unrecoverable either way.
  | { op: 'emptyBundle'; bundlePath: string }
  // Adopted into the asset directory like a banner; null clears it. The circle framing is a
  // separate crop keyed to the adopted image.
  | { op: 'setProfileImage'; source: string | null }
  | { op: 'setProfileIcon'; icon: string | null }
  // ≤30 chars, enforced. Parked: the sidebar NexusHeader that edited it is gone (ribbon rework);
  // retained for the eventual homepage/settings surface — NOT dead code.
  | { op: 'setProfileSubtitle'; subtitle: string }
  // Adopted into the asset directory, or referenced where it already sits; the owner's config
  // names it by wikilink.
  | { op: 'setBanner'; path: string; kind: BannerOwnerKind; source: string | null }
  // `image` is the value verbatim, keyed by the resolved image in `.nexus/crops.json`;
  // `crop: null` deletes the framing.
  | { op: 'setCrop'; image: string; crop: Crop | null }
  | { op: 'setHeadingIconHidden'; path: string; kind: BannerOwnerKind; hidden: boolean }
  // A page carries it in frontmatter `icon`; a container/context in its JSON sidecar. Property
  // and view icons ride their own writers.
  | { op: 'setIcon'; path: string; kind: MutableKind; icon: string | null }
  | { op: 'setDisclosureLock'; path: string; kind: MutableContainerKind; locked: boolean }
  // Under the wrapped key its definition's name builds; `null` clears it.
  | { op: 'setProperty'; path: string; propertyId: string; value: PropertyValue | null }
  // Absent order = legacy append. Stale ids in a source container self-drop on the next read.
  | { op: 'movePage'; path: string; newParentPath: string; order?: string[] }
  // movePage's shape, one level up: renames the set folder into `newParentPath`, then writes
  // the destination collection's `set_order`.
  | { op: 'moveSet'; path: string; newParentPath: string; order: string[] }
  | { op: 'reorderChildren'; parentPath: string; key: ChildOrderKey; order: string[] }
  | { op: 'reorderTop'; key: StateOrderKey; order: string[] }
  // — Registry-backed Contexts & Spaces (ids in memory; main resolves titles at the write) —
  | { op: 'createContextGroup'; name: string }
  | { op: 'createSpace'; contextId: string; name: string }
  // The journaled title cascade over every context-bearing root plus the registry/folder rename.
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
  /** Lets the menu offer "Open New Tab" (the push-back forms a real tab target). Surfaces
   *  without an id simply don't get the item. */
  id?: string
  /** Flips the item label to "Open" (focus) when already open in a tab. */
  alreadyOpen?: boolean
  /** A container's current disclosure-lock state — flips the item to "Unlock Folder". */
  disclosureLocked?: boolean
  /** Echoed into `begin-rename` so the field opens where the gesture happened; absent, the
   *  fence resolves by rank. */
  host?: RenameHost
}

export interface Creator {
  label: string
  req: MutateRequest
}

/** The sidebar's context menu and the subfield's add button offer the same pair, since a
 *  container's contents are a property of the container, not the surface asking. A Set nests to
 *  any depth, so it offers what a Collection offers; only the nested label differs, since a Set
 *  inside a Set is a Sub-Set. */
export function containerCreators(kind: MutableContainerKind, parentPath: string): Creator[] {
  const name = DEFAULT_NEW_NAME
  const nested = kind === 'collection' ? 'Set' : 'Sub-Set'
  return [
    { label: 'New Page', req: { op: 'createPage', parentPath, name } },
    { label: `New ${nested}`, req: { op: 'createContainer', parentPath, kind: 'set', name } },
  ]
}
