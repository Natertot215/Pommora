// The mutate IPC contract — renderer→main write requests. Paths are nexus-relative POSIX
// (main resolves them under the session root via resolveUnderRoot); entities are addressed
// by path, never by a renderer-supplied absolute path. Kept in its own shared file (not
// types.ts) so it can import the data-layer Result/error shape.

import type { Result } from './result'
import type { PageMoveContext } from './pageMenu'
import type { PropertyValue } from './propertyValue'
import type { Crop } from './schemas'
import { subSetLabel, type NexusLabels } from './types'

/** The mutate channel's reply — `created` appears only on the create ops; `renamed` only on
 *  page renames, carrying what actually landed (a from-create rename may disambiguate away
 *  from the requested name, and every consumer patches from the landed name, never the ask). */
export interface MutateOutcome {
  created?: { id: string; path: string }
  renamed?: { path: string; name: string }
  /** The `[[Name.ext]]` an image op adopted — so a re-pick's Save-hold waits for the seat's value
   *  to reach it, and a dedup (adopted === the value already set) releases at once. */
  adopted?: string
}
export type MutateReply = Result<MutateOutcome>

/** The base name a "New …" action gives a fresh entity (main disambiguates collisions). */
export const DEFAULT_NEW_NAME = 'Untitled'

/** Placeholder in a createPage `order` array for the id main is about to mint — the renderer
 *  computes the full sibling order before the id exists, so this slot marks where it lands. */
export const NEW_PAGE_SLOT = '$new-page'

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

/** Where a restore is asked to put something, in place of the parent its record names. `kind` is the
 *  sender's claim about what the id names, held against the write path's own matrix: a claim that
 *  contradicts its own id is a malformed message rather than a placement, and is refused. */
export interface RestoreDestination {
  kind: 'container' | 'context'
  id: string
}

/** Top-level order persisted in `.nexus/state.json`. Contexts carry their own order in the
 *  registry and reorder through `reorderContexts`, so only the Collections belong here. */
export type StateOrderKey = 'collection_order'
/** Within-container child-order keys carried by reorderChildren — collections on a vault, sets on a collection. */
export type ChildOrderKey = 'collection_order' | 'set_order'

/** A renderer→main write request. `parentPath: ''` targets the nexus root (new vault). */
export type MutateRequest =
  // `seeds`: property values stamped in the same write the page is born in (dead ids drop).
  // `order`: the parent's full page-id order carrying one NEW_PAGE_SLOT for the minted id.
  | {
      op: 'createPage'
      parentPath: string
      name: string
      seeds?: Record<string, PropertyValue>
      order?: string[]
    }
  | { op: 'createContainer'; parentPath: string; kind: MutableContainerKind; name: string }
  // Spaces and Contexts rename through their own ops: membership is keyed by TITLE, so their
  // renames are cascades, and a path-addressed folder rename would strip every tag silently.
  // `fromCreate` marks a just-created page's first commit: it disambiguates like a create
  // instead of rejecting a collision, and skips the link cascade a linkless page can't need.
  | {
      op: 'rename'
      path: string
      kind: Exclude<MutableKind, 'space' | 'context'>
      newName: string
      fromCreate?: true
    }
  | { op: 'delete'; path: string; kind: MutableKind }
  // Spend a deletion bundle: resolve against the CURRENT tree and put the artifact back — into
  // its parent's renamed home if it moved. `bundlePath` is nexus-relative, from the listing.
  // `destination` overrides the recorded parent, for the kinds whose home can go missing.
  | { op: 'restore'; bundlePath: string; destination?: RestoreDestination }
  // Spend a deletion bundle the other way: the artifact leaves for the operating system's trash,
  // or is erased outright when `personalization.permanentDelete` is on, and the record goes with
  // it. Destructive and unrecoverable from inside Pommora either way.
  | { op: 'emptyBundle'; bundlePath: string }
  // A CROP rather than a chosen file, so it carries bytes: they land in the asset directory
  // under the nexus icon's own name and `settings.profile_image` names it by wikilink; null ⇒
  // clear the field.
  // `source` is the absolute path of a picked file, adopted into the asset directory like a banner;
  // null clears it. The circle framing is a separate crop keyed to the adopted image.
  | { op: 'setProfileImage'; source: string | null }
  // The identity fallback when no photo is set, in `settings.profile_icon`; null ⇒ clear it.
  | { op: 'setProfileIcon'; icon: string | null }
  // Set the nexus profile subtitle (≤30 chars, enforced) in `settings.profile_subtitle`. Parked: the
  // sidebar NexusHeader that edited it is gone (ribbon rework); the field + op are retained for the
  // eventual homepage/settings surface — NOT dead code.
  | { op: 'setProfileSubtitle'; subtitle: string }
  // `source` is the absolute path of a picked file: it is adopted into the asset directory under
  // its own name — or referenced where it is, when it already sits there — and the owner's config
  // (folder sidecar, homepage.json, or a page's frontmatter `cover`) names it by wikilink.
  | { op: 'setBanner'; path: string; kind: BannerOwnerKind; source: string | null }
  // Frame a stored image — `image` is the value verbatim (wikilink, path, or web address), keyed
  // by the resolved image in `.nexus/crops.json`; `crop: null` deletes the framing.
  | { op: 'setCrop'; image: string; crop: Crop | null }
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

/** Which renderer surface hosts a rename field — the owner fence's vocabulary. */
export type RenameHost = 'detail' | 'sidebar'

/** What the renderer hands main to pop a native context menu for one sidebar entity. */
export interface ContextTarget extends PageMoveContext {
  kind: MutableKind
  /** Nexus-relative POSIX path (PathNode.path). */
  path: string
  title: string
  /** Entity id — lets the menu offer "Open New Tab" (the push-back forms a real tab target).
   *  Surfaces without one simply don't get the item. */
  id?: string
  /** Whether the entity is already open in a tab — flips the item label to "Open" (focus). */
  alreadyOpen?: boolean
  /** The surface that popped the menu — echoed into `begin-rename` so the field opens where
   *  the gesture happened; absent, the fence resolves by rank. */
  host?: RenameHost
}

/** A "New …" offer: what it reads as, and the write it performs. */
export interface Creator {
  label: string
  req: MutateRequest
}

/** What may be created inside a container, and what each is called. Both processes read this —
 *  the sidebar's native context menu and the subfield's add button offer the same pair because a
 *  container's contents are a property of the container, not of the surface asking.
 *
 *  A Set nests to any depth, so it offers what a Collection offers; only the nested container's
 *  label differs, since a Set inside a Set is a Sub-Set. Labels are per-nexus and resolved here
 *  rather than written literally, which is what keeps a renamed Set named the same in both menus. */
export function containerCreators(
  kind: MutableContainerKind,
  parentPath: string,
  labels: NexusLabels,
): Creator[] {
  const name = DEFAULT_NEW_NAME
  const nested = kind === 'collection' ? labels.pageSet.singular : subSetLabel(labels)
  return [
    { label: 'New Page', req: { op: 'createPage', parentPath, name } },
    { label: `New ${nested}`, req: { op: 'createContainer', parentPath, kind: 'set', name } },
  ]
}
