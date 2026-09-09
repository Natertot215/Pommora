import type { Result } from '../Contract/result'
import type { PageMoveContext } from '../Actions/pageMenu'
import type { PropertyValue } from '../Properties/propertyValue'
import type { Crop } from './schemas'

/** `renamed` is what actually landed — a from-create rename may disambiguate away from the ask. */
export interface MutateOutcome {
  created?: { id: string; path: string }
  renamed?: { path: string; name: string }
  adopted?: string
  trashed?: { bundlePath: string }
}
export type MutateReply = Result<MutateOutcome>

export const DEFAULT_NEW_NAME = 'Untitled'

export const NEW_PAGE_SLOT = '$new-page'

export type MutableKind = 'page' | 'collection' | 'set' | 'space' | 'context'

export type BannerOwnerKind = 'collection' | 'set' | 'space' | 'homepage' | 'navview' | 'page'

type MutableContainerKind = 'collection' | 'set'

/** Checked against the write path's own matrix: a contradicting claim is refused as malformed. */
export interface RestoreDestination {
  kind: 'container' | 'context'
  id: string
}

export type StateOrderKey = 'collection_order'
export type ChildOrderKey = 'collection_order' | 'set_order'

export type MutateRequest =
  | {
      op: 'createPage'
      parentPath: string
      name: string
      seeds?: Record<string, PropertyValue>
      order?: string[]
    }
  | { op: 'createContainer'; parentPath: string; kind: MutableContainerKind; name: string }
  // Membership is keyed by TITLE, so Spaces and Contexts rename through their own ops. `fromCreate` marks a just-created page's first commit: disambiguates like a create, and skips the link cascade a linkless page can't need.
  | {
      op: 'rename'
      path: string
      kind: Exclude<MutableKind, 'space' | 'context'>
      newName: string
      fromCreate?: true
    }
  | { op: 'delete'; path: string; kind: MutableKind }
  | { op: 'restore'; bundlePath: string; destination?: RestoreDestination }
  | { op: 'emptyBundle'; bundlePath: string }
  | { op: 'setProfileImage'; source: string | null }
  | { op: 'setProfileIcon'; icon: string | null }
  | { op: 'setBanner'; path: string; kind: BannerOwnerKind; source: string | null }
  | { op: 'setCrop'; image: string; crop: Crop | null }
  | { op: 'setHeadingIconHidden'; path: string; kind: BannerOwnerKind; hidden: boolean }
  | { op: 'setIcon'; path: string; kind: MutableKind; icon: string | null }
  | { op: 'setDisclosureLock'; path: string; kind: MutableContainerKind; locked: boolean }
  | { op: 'setActiveView'; path: string; kind: MutableContainerKind; viewId: string }
  | { op: 'setProperty'; path: string; propertyId: string; value: PropertyValue | null }
  // Absent order = legacy append. Stale ids in a source container self-drop on the next read.
  | { op: 'movePage'; path: string; newParentPath: string; order?: string[] }
  | { op: 'moveSet'; path: string; newParentPath: string; order: string[] }
  | { op: 'reorderChildren'; parentPath: string; key: ChildOrderKey; order: string[] }
  | { op: 'reorderTop'; key: StateOrderKey; order: string[] }
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
  id?: string
  alreadyOpen?: boolean
  disclosureLocked?: boolean
  host?: RenameHost
}

export interface Creator {
  label: string
  req: MutateRequest
}

export function containerCreators(kind: MutableContainerKind, parentPath: string): Creator[] {
  const name = DEFAULT_NEW_NAME
  const nested = kind === 'collection' ? 'Set' : 'Sub-Set'
  return [
    { label: 'New Page', req: { op: 'createPage', parentPath, name } },
    { label: `New ${nested}`, req: { op: 'createContainer', parentPath, kind: 'set', name } },
  ]
}
