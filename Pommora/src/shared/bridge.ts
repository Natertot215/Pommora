// The one owner of the wire — every IPC channel's name, direction, argument tuple, and reply
// type, in one map both processes derive from. The preload dials through `ask`/`tell`/`on`
// builders typed by these interfaces; main answers through `serveBridge`'s exhaustive handler
// object, so a channel with no handler, a handler with no channel, or a mismatched signature
// is a compile error, never a runtime discovery. Adding a channel is one entry here.
//
// Pure types — zero runtime values, zero runtime imports — so the sandboxed preload (whose
// bundle may require only 'electron') consumes it freely from both tsconfig projects.

import type {
  AgendaListResult,
  NavigationResult,
  NavigationState,
  NavViewModes,
  NexusState,
  NexusTree,
  OpenIn,
  PageResult,
  Personalization,
  PreviewsFile,
  PreviewsResult,
  SubfieldConfig,
  StoredTabSet,
  TabsResult,
  ThumbRect,
  ThumbResult,
  ViewButton,
  ViewStyle,
} from './types'
import type { ContextTarget, MutateRequest, MutateResult } from './mutate'
import type { Ack } from './result'
import type { FormatState } from './editorMenu'
import type { SavedView } from './views'
import type {
  BlockDocPatch,
  BlockHostRef,
  BlocksGetResult,
  BlocksSaveResult,
  EmbeddedView,
} from './blocks'
import type { PropertyDefinition, PropertyType, StatusGroup } from './properties'
import type { PageFrontmatter } from './schemas'
import type { TableMenuAction, TableMenuContext } from './tableMenu'
import type { CalloutMenuAction } from './calloutMenu'
import type { CellMenuAction, CellMenuContext } from './cellMenu'
import type { CardMenuAction, CardMenuContext } from './cardMenu'
import type { ConnMenuAction } from './connections'
import type { TabMenuAction, TabMenuContext } from './tabMenu'
import type { NavRowMenuAction, NavRowMenuContext } from './navRowMenu'
import type { PropertyMenuAction, PropertyMenuContext } from './propertyMenu'
import type { OptionMenuAction, OptionMenuContext } from './optionMenu'
import type { ColumnMenuAction, ColumnMenuContext } from './columnMenu'
import type {
  EmbedAreaMenuAction,
  EmbedTitleMenuAction,
  ViewButtonMenuAction,
  ViewItemMenuAction,
  ViewRowMenuAction,
} from './viewMenus'
import type {
  BannerMenuAction,
  IconFavoriteMenuAction,
  NexusIconAction,
  SpaceHeaderMenuAction,
  TitleMenuAction,
} from './identityMenus'

/** Request/response channels (`invoke` → `handle`). `args` labels become the derived dialer's
 *  parameter names. */
export interface Asks {
  // Nexus / session
  'nexus:state': { args: []; reply: NexusState }
  'nexus:choose': { args: []; reply: boolean }
  'nexus:openPath': { args: [path: string]; reply: boolean }
  'nexus:rename': { args: [newName: string]; reply: Ack }

  // Pages
  'page:open': { args: [relPath: string]; reply: PageResult }
  'page:updateBody': { args: [relPath: string, body: string]; reply: Ack }

  // Per-machine scopes (nexus.db rows)
  'folds:get': { args: []; reply: Record<string, string[]> }
  'folds:set': { args: [pageId: string, keys: string[]]; reply: Ack }
  'activeViews:get': { args: []; reply: Record<string, string> }
  'activeViews:set': { args: [containerId: string, viewId: string]; reply: Ack }
  'viewOrders:get': { args: []; reply: Record<string, string[]> }
  'viewOrders:set': { args: [viewId: string, order: string[]]; reply: Ack }
  'tableHeadingCols:get': { args: []; reply: Record<string, number[]> }
  'tableHeadingCols:set': { args: [pageId: string, indices: number[]]; reply: Ack }

  // Views + container config
  'views:save': {
    args: [containerPath: string, kind: 'collection' | 'set', view: SavedView]
    reply: { ok: true; id: string } | { ok: false; error: string }
  }
  'views:reorder': {
    args: [containerPath: string, kind: 'collection' | 'set', orderedIds: string[]]
    reply: Ack
  }
  'views:delete': {
    args: [containerPath: string, kind: 'collection' | 'set', viewId: string]
    reply: Ack
  }
  'container:configure': {
    args: [
      containerPath: string,
      kind: 'collection' | 'set',
      patch: { open_in?: OpenIn; view_button?: ViewButton; view_style?: ViewStyle },
    ]
    reply: Ack
  }
  'view:loadValues': { args: [containerPath: string]; reply: Record<string, PageFrontmatter> }

  // Schema (container-scoped) + registry-wide property ops
  'schema:add': {
    args: [containerPath: string, def: PropertyDefinition]
    reply: { ok: true; id: string } | { ok: false; error: string }
  }
  'schema:rename': { args: [containerPath: string, propertyId: string, newName: string]; reply: Ack }
  'schema:reorder': { args: [containerPath: string, propertyId: string, toIndex: number]; reply: Ack }
  'schema:delete': { args: [containerPath: string, propertyId: string]; reply: Ack }
  'schema:assign': { args: [containerPath: string, propertyId: string, toIndex?: number]; reply: Ack }
  'schema:changeType': {
    args: [
      containerPath: string,
      propertyId: string,
      newType: PropertyType,
      opts?: { dropConflictingValues?: boolean },
    ]
    reply: Ack
  }
  'registry:reorder': { args: [propertyId: string, toIndex: number]; reply: Ack }
  'property:delete': { args: [propertyId: string]; reply: Ack }
  'property:setOptions': {
    args: [propertyId: string, options: { value: string; label: string; color?: string }[]]
    reply: Ack
  }
  'property:setStatusGroups': { args: [propertyId: string, groups: StatusGroup[]]; reply: Ack }
  'property:setLinkConfig': {
    args: [
      propertyId: string,
      patch: { link_underline?: boolean; link_display?: 'link-url' | 'link-title'; link_color?: string },
    ]
    reply: Ack
  }
  'property:setCheckboxColor': { args: [propertyId: string, color: string | undefined]; reply: Ack }
  'property:setIcon': { args: [propertyId: string, icon: string | undefined]; reply: Ack }
  'property:setNumberFormat': {
    args: [
      propertyId: string,
      patch: {
        number_family?: 'number' | 'percent' | 'currency'
        number_currency?: string
        number_separators?: boolean
        number_decimals?: 'hidden' | number
        number_fraction?: boolean
        number_denominator?: number
      },
    ]
    reply: Ack
  }
  'property:renameOption': { args: [propertyId: string, oldValue: string, newTitle: string]; reply: Ack }
  'property:removeOption': { args: [propertyId: string, value: string]; reply: Ack }
  'property:clearOption': { args: [propertyId: string, value: string]; reply: Ack }
  'property:renameStatusOption': {
    args: [propertyId: string, oldValue: string, newTitle: string]
    reply: Ack
  }
  'property:removeStatusOption': { args: [propertyId: string, value: string]; reply: Ack }
  'property:clearStatusOption': { args: [propertyId: string, value: string]; reply: Ack }

  // Blocks
  'blocks:get': { args: [host: BlockHostRef]; reply: BlocksGetResult }
  'blocks:save': { args: [host: BlockHostRef, patch: BlockDocPatch]; reply: BlocksSaveResult }
  'blocks:createMarkdown': {
    args: [host: BlockHostRef]
    reply: { ok: true; id: string } | { ok: false; error: string }
  }
  'blocks:removeTile': { args: [host: BlockHostRef, tileId: string]; reply: BlocksSaveResult }
  'blocks:readMarkdown': {
    args: [host: BlockHostRef, tileId: string]
    reply: { ok: true; body: string } | { ok: false; error: string }
  }
  'blocks:writeMarkdown': {
    args: [host: BlockHostRef, tileId: string, body: string]
    reply: BlocksSaveResult
  }
  'blocks:convertToPage': {
    args: [host: BlockHostRef, tileId: string, pageId: string]
    reply: BlocksSaveResult
  }
  'blocks:convertToView': {
    args: [host: BlockHostRef, tileId: string, views: EmbeddedView[]]
    reply: BlocksSaveResult
  }
  'blocks:duplicateTile': {
    args: [host: BlockHostRef, tileId: string]
    reply: { ok: true; id: string } | { ok: false; error: string }
  }
  'blocks:confirmRemove': { args: []; reply: boolean }

  // Settings / personalization / theme
  'subfield:get': { args: []; reply: SubfieldConfig | null }
  'subfield:set': { args: [config: SubfieldConfig]; reply: Ack }
  'navViewModes:get': { args: []; reply: NavViewModes | null }
  'navViewModes:set': { args: [modes: NavViewModes]; reply: Ack }
  'personalization:set': {
    args: [key: keyof Personalization, value: Personalization[keyof Personalization]]
    reply: Ack
  }
  'theme:systemAccent': { args: []; reply: string | null }

  // Agenda / navigation / tabs / previews / thumbnails
  'agenda:list': { args: []; reply: AgendaListResult }
  'nav:read': { args: []; reply: NavigationResult }
  'nav:write': { args: [patch: Partial<NavigationState>]; reply: Ack }
  'tabs:load': { args: []; reply: TabsResult }
  'tabs:save': { args: [set: StoredTabSet]; reply: Ack }
  'previews:load': { args: []; reply: PreviewsResult }
  'previews:save': { args: [file: PreviewsFile]; reply: Ack }
  'capture:thumbnail': {
    args: [navKey: string, rect: ThumbRect, scaleFactor: number]
    reply: ThumbResult
  }
  'nav:evictThumbs': { args: [liveKeys: string[]]; reply: Ack }

  // The write path + dialogs + external
  mutate: { args: [req: MutateRequest]; reply: MutateResult }
  // biome-ignore lint/suspicious/noConfusingVoidType: the wire resolves nothing — void IS the reply
  'context-menu': { args: [target: ContextTarget]; reply: void }
  'create-menu': {
    args: [items: { label: string; req: MutateRequest }[]]
    reply: MutateRequest | null
  }
  // biome-ignore lint/suspicious/noConfusingVoidType: the wire resolves nothing — void IS the reply
  'error:show': { args: [message: string]; reply: void }
  // biome-ignore lint/suspicious/noConfusingVoidType: the wire resolves nothing — void IS the reply
  'link:open': { args: [url: string]; reply: void }
  'file:open': { args: [path: string]; reply: Ack }
  'linkTitles:get': { args: []; reply: Record<string, string> }
  'linkTitles:fetch': {
    args: [url: string]
    reply: { ok: true; title: string | null } | { ok: false; error: string }
  }

  // Native menus — each resolves the picked action, or null on dismiss
  'view-button-menu': {
    args: [current: { viewButton: ViewButton; viewStyle: ViewStyle }]
    reply: ViewButtonMenuAction | null
  }
  'space-header-menu': { args: []; reply: SpaceHeaderMenuAction | null }
  'view-embed-title-menu': {
    args: [arg: { iconShown: boolean; level: number }]
    reply: EmbedTitleMenuAction | null
  }
  'view-embed-area-menu': {
    args: [current: { viewButton: ViewButton; viewStyle: ViewStyle; titleShown: boolean }]
    reply: EmbedAreaMenuAction | null
  }
  'view-item-menu': { args: [canDelete: boolean]; reply: ViewItemMenuAction | null }
  'view-row-menu': { args: [canDelete: boolean]; reply: ViewRowMenuAction | null }
  'icon-favorite-menu': { args: [favorited: boolean]; reply: IconFavoriteMenuAction | null }
  'nexus:iconMenu': {
    args: [opts: { hasPhoto: boolean; hasGlyph: boolean }]
    reply: NexusIconAction | null
  }
  'nexus:pickImage': { args: []; reply: string | null }
  'nexus:bannerMenu': {
    args: [opts?: { noRemove?: boolean; noun?: string; add?: boolean }]
    reply: BannerMenuAction | null
  }
  'nexus:titleMenu': {
    args: [opts?: { toggleIcon?: boolean; iconHidden?: boolean; noEditIcon?: boolean }]
    reply: TitleMenuAction | null
  }
  'table-menu': { args: [ctx: TableMenuContext]; reply: TableMenuAction | null }
  'callout-menu': { args: []; reply: CalloutMenuAction | null }
  'column-menu': { args: [ctx: ColumnMenuContext]; reply: ColumnMenuAction | null }
  'cell-menu': { args: [ctx: CellMenuContext]; reply: CellMenuAction | null }
  'card-menu': { args: [ctx: CardMenuContext]; reply: CardMenuAction | null }
  'tab-menu': { args: [ctx: TabMenuContext]; reply: TabMenuAction | null }
  'nav-row-menu': { args: [ctx: NavRowMenuContext]; reply: NavRowMenuAction | null }
  'conn-menu': { args: []; reply: ConnMenuAction | null }
  'property-menu': { args: [ctx: PropertyMenuContext]; reply: PropertyMenuAction | null }
  'option-menu': { args: [ctx: OptionMenuContext]; reply: OptionMenuAction | null }
}

/** Fire-and-forget sends (`send` → `on`) — no reply channel. */
export interface Tells {
  'editor:format-state': [state: FormatState]
  'win:dragBy': [dx: number, dy: number]
  'win:zoom': []
  'editor:callout-grip': [on: boolean]
}

/** Main→renderer pushes — the preload derives an `on*` subscriber (returning an unsubscribe)
 *  per entry, and main sends through the typed `push` helper. */
export interface Pushes {
  'menu:action': string
  'begin-rename': string
  'open-in-new-tab': ContextTarget
  'open-in-preview': ContextTarget
  'nav:changed': Omit<NavigationState, 'recents'>
  'nexus:changed': NexusTree
}
