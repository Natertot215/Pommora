// The mutate IPC contract — renderer→main write requests. Paths are nexus-relative POSIX
// (main resolves them under the session root via resolveUnderRoot); entities are addressed
// by path, never by a renderer-supplied absolute path. Kept in its own shared file (not
// types.ts) so it can import the data-layer Result/error shape.

import type { Result } from './result'
import type { PropertyValue } from './propertyValue'

/** The mutate channel's reply — `created` appears only on the create ops. */
export type MutateReply = Result<{ created?: { id: string; path: string } }>

/** The base name a "New …" action gives a fresh entity (main disambiguates collisions). */
export const DEFAULT_NEW_NAME = 'Untitled'

/** Entity kinds a mutation can target — every NodeKind except the code-keyed `saved`,
 *  plus `context` (a registry group — folder + registry entry, not a NodeKind). */
export type MutableKind = 'page' | 'collection' | 'set' | 'space' | 'context'

/** The entities that can own a banner image: Collections + Sets + Spaces (folder sidecars),
 *  the homepage singleton (`.nexus/homepage.json`), the NavView (its banner rides `navigation.json`), and a
 *  page (whose banner is the `cover` field in its `.md` frontmatter). */
export type BannerOwnerKind = 'collection' | 'set' | 'space' | 'homepage' | 'navview' | 'page'

/** A folder container a page or sub-container can be created inside. These match their
 *  SidecarKind names exactly, so main passes them straight to createFolderEntity. */
export type MutableContainerKind = 'collection' | 'set'

/** Top-level order persisted in `.nexus/state.json`. Contexts carry their own order in the
 *  registry and reorder through `reorderContexts`, so only the Collections belong here. */
export type StateOrderKey = 'collection_order'
/** Within-container child-order keys carried by reorderChildren — collections on a vault, sets on a collection. */
export type ChildOrderKey = 'collection_order' | 'set_order'

/** A renderer→main write request. `parentPath: ''` targets the nexus root (new vault). */
export type MutateRequest =
  | { op: 'createPage'; parentPath: string; name: string }
  | { op: 'createContainer'; parentPath: string; kind: MutableContainerKind; name: string }
  // Spaces and Contexts rename through their own ops: membership is keyed by TITLE, so their
  // renames are cascades, and a path-addressed folder rename would strip every tag silently.
  | { op: 'rename'; path: string; kind: Exclude<MutableKind, 'space' | 'context'>; newName: string }
  | { op: 'delete'; path: string; kind: MutableKind }
  // dataUrl set ⇒ decode + copy into `.nexus/assets/<nexusID>/profile-<token>.<ext>` + record
  // the rel path in `settings.profile_image`; null ⇒ clear the field + delete the file.
  | { op: 'setProfileImage'; dataUrl: string | null }
  // The identity fallback when no photo is set, in `settings.profile_icon`; null ⇒ clear it.
  | { op: 'setProfileIcon'; icon: string | null }
  // Set the nexus profile subtitle (≤30 chars, enforced) in `settings.profile_subtitle`. Parked: the
  // sidebar NexusHeader that edited it is gone (ribbon rework); the field + op are retained for the
  // eventual homepage/settings surface — NOT dead code.
  | { op: 'setProfileSubtitle'; subtitle: string }
  // dataUrl set ⇒ decode + copy into `.nexus/assets/<key>/banner.<ext>` + record that path in
  // the owner's config (folder sidecar, homepage.json, or — for a page — frontmatter `cover`).
  | { op: 'setBanner'; path: string; kind: BannerOwnerKind; dataUrl: string | null }
  // Hide or show an entity's banner-heading icon — a `heading_icon_hidden` boolean in the
  // owner's config (folder sidecar or homepage.json; absent = shown). `true` hides, `false` clears it.
  | { op: 'setHeadingIconHidden'; path: string; kind: BannerOwnerKind; hidden: boolean }
  // A page carries it in `.md` frontmatter `icon`; a container/context in its JSON sidecar.
  // `null` clears it. Property + view icons ride their own writers, not this op.
  | { op: 'setIcon'; path: string; kind: MutableKind; icon: string | null }
  // One property on a page's `.md` frontmatter root, under the wrapped key its definition's
  // name builds; `null` clears it. Drives table cross-group reassignment + inline edits.
  | { op: 'setProperty'; path: string; propertyId: string; value: PropertyValue | null }
  // `order`: the destination container's full page-id order after the drop (renderer-computed).
  // Absent = legacy append. Stale ids in a source container self-drop on the next read.
  | { op: 'movePage'; path: string; newParentPath: string; order?: string[] }
  // Move a set between collections (within its vault) or reorder it among a collection's sets:
  // `fs.rename` the set folder into `newParentPath` (a no-op when that's its current collection),
  // then write the destination collection's `set_order`. movePage's shape, one level up.
  | { op: 'moveSet'; path: string; newParentPath: string; order: string[] }
  // Reorder a folder's child containers in place: `collection_order` on a vault, `set_order`
  // on a collection. `order` is the full ordered id list (renderer-computed). No file move.
  | { op: 'reorderChildren'; parentPath: string; key: ChildOrderKey; order: string[] }
  // Reorder a top-level group (held in `.nexus/state.json`): top Collections or a Context.
  | { op: 'reorderTop'; key: StateOrderKey; order: string[] }
  // — Registry-backed Contexts & Spaces (ids in memory; main resolves titles at the write) —
  // Append a new Context to `.nexus/contexts.json` (ULID id) + mkdir its folder.
  | { op: 'createContextGroup'; name: string }
  // Create a Space folder + `_space.json` under its Context, seeded with the 2×2 block doc.
  | { op: 'createSpace'; contextId: string; name: string }
  // Rename a Context/Space — the journaled title cascade over every context-bearing root
  // (page frontmatter, `_space.json`) plus the registry/folder rename.
  | { op: 'renameContext'; contextId: string; newName: string }
  | { op: 'renameSpace'; spaceId: string; newName: string }
  // Set an entity's links for ONE Context: the full Space-id list (empty = key removed).
  | { op: 'setContext'; path: string; contextId: string; spaceIds: string[] }
  // Chip-solid palette key on the Space's `_space.json`; absent clears to the neutral Default.
  | { op: 'setSpaceColor'; spaceId: string; color?: string }
  // Registry array order IS the display order; `space_orders[contextId]` lives in state.json.
  | { op: 'reorderContexts'; ids: string[] }
  | { op: 'reorderSpaces'; contextId: string; ids: string[] }

/** What the renderer hands main to pop a native context menu for one sidebar entity. */
export interface ContextTarget {
  kind: MutableKind
  /** Nexus-relative POSIX path (PathNode.path). */
  path: string
  title: string
  /** Entity id — lets the menu offer "Open in New Tab" (the push-back forms a real tab target).
   *  Surfaces without one simply don't get the item. */
  id?: string
  /** Whether the entity is already open in a tab — flips the item label to "Open" (focus). */
  alreadyOpen?: boolean
}
