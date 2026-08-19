// The one owner of the wire — every IPC channel's name, direction, argument tuple, and reply
// type, in one map both processes derive from. The preload dials through `ask`/`tell`/`on`
// builders typed by these interfaces; main answers through `serveBridge`'s exhaustive handler
// object, so a channel with no handler, a handler with no channel, or a mismatched signature
// is a compile error, never a runtime discovery. Adding a channel is one entry here.
//
// Pure types — zero runtime values, zero runtime imports — so the sandboxed preload (whose
// bundle may require only 'electron') consumes it freely from both tsconfig projects.

import type {
  NavigationState,
  NavViewModes,
  NexusState,
  NexusTree,
  OpenIn,
  PageDetail,
  Personalization,
  HoverCardSize,
  PreviewsFile,
  SubfieldConfig,
  StoredTabSet,
  ThumbRect,
  TrashRow,
  ViewButton,
  ViewStyle,
} from './types'
import type { ContextTarget, Creator, MutateReply, MutateRequest, RenameHost } from './mutate'
import type { Result } from './result'
import type { FormatState } from './editorMenu'
import type { SavedView } from './views'
import type { BlockDoc, BlockDocPatch, BlockHostRef, EmbeddedView } from './blocks'
import type {
  LinkConfig,
  NumberConfig,
  PropertyDefinition,
  PropertyType,
  StatusGroup,
} from './properties'
import type { PageFrontmatter } from './schemas'
import type { TableMenuAction, TableMenuContext } from './tableMenu'
import type { GripMenuAction, GripMenuContext } from './gripMenu'
import type { CellMenuAction, CellMenuContext } from './cellMenu'
import type { RowGripMenuAction, RowGripMenuContext } from './rowGripMenu'
import type { PageMetaAction } from './pageMenu'
import type { CardMenuAction, CardMenuContext } from './cardMenu'
import type { ConnMenuAction, ConnMenuContext } from './connections'
import type { TabMenuAction, TabMenuContext } from './tabMenu'
import type {
  TrashColumnAction,
  TrashColumnContext,
  TrashMenuAction,
  TrashMenuContext,
} from './trashMenu'
import type { NavRowMenuAction, NavRowMenuContext } from './navRowMenu'
import type { PropertyMenuAction, PropertyMenuContext } from './propertyMenu'
import type { OptionMenuAction, OptionMenuContext } from './optionMenu'
import type { RowMenuRequest } from './menuModel'
import type { DevicePrefs } from './devicePrefs'
import type { ColumnMenuAction, ColumnMenuContext } from './columnMenu'
import type { EmbedAreaMenuAction, EmbedTitleMenuAction, ViewButtonMenuAction } from './viewMenus'
import type { ViewRowAction, ViewRowMenuContext } from './viewRowMenu'
import type {
  BannerMenuAction,
  IconFavoriteMenuAction,
  NexusIconAction,
  TitleMenuAction,
} from './identityMenus'

/** Request/response channels (`invoke` → `handle`). `args` labels become the derived dialer's
 *  parameter names. */
export interface Asks {
  // Nexus / session
  'nexus:state': { args: []; reply: NexusState }
  'nexus:choose': { args: []; reply: Result<boolean> }
  'nexus:openPath': { args: [path: string]; reply: Result<boolean> }
  'nexus:rename': { args: [newName: string]; reply: Result<null> }
  // Two small services a page action needs from main: the system clipboard, and revealing a
  // nexus-relative path in the file manager (validated against the root before it resolves).
  'clipboard:write': { args: [text: string]; reply: undefined }
  // Read is the keyboard's door to what a paste event carries for free: a chord matched on keydown
  // has no `clipboardData` of its own.
  'clipboard:read': { args: []; reply: string }
  'path:reveal': { args: [nexusRelativePath: string]; reply: undefined }

  // Pages
  'page:open': { args: [relPath: string]; reply: Result<PageDetail> }
  'page:updateBody': { args: [relPath: string, body: string]; reply: Result<null> }

  // Per-machine scopes (nexus.db rows)
  'folds:get': { args: []; reply: Record<string, string[]> }
  'folds:set': { args: [pageId: string, keys: string[]]; reply: Result<null> }
  'activeViews:get': { args: []; reply: Record<string, string> }
  'activeViews:set': { args: [containerId: string, viewId: string]; reply: Result<null> }
  'viewOrders:get': { args: []; reply: Record<string, string[]> }
  'viewOrders:set': { args: [viewId: string, order: string[]]; reply: Result<null> }
  'embedHeights:get': { args: []; reply: Record<string, Record<string, number>> }
  'embedHeights:set': {
    args: [pageId: string, heights: Record<string, number>]
    reply: Result<null>
  }
  'tableHeadingCols:get': { args: []; reply: Record<string, number[]> }
  'tableHeadingCols:set': { args: [pageId: string, indices: number[]]; reply: Result<null> }
  'headingIcon:get': { args: []; reply: Record<string, boolean> }
  'headingIcon:set': { args: [pageId: string, hidden: boolean]; reply: Result<null> }
  'aliases:get': { args: []; reply: Record<string, string[]> }
  'aliases:set': { args: [pageId: string, aliases: string[]]; reply: Result<null> }

  // Views + container config
  'views:save': {
    args: [containerPath: string, kind: 'collection' | 'set', view: SavedView]
    reply: Result<{ id: string }>
  }
  'views:reorder': {
    args: [containerPath: string, kind: 'collection' | 'set', orderedIds: string[]]
    reply: Result<null>
  }
  'views:delete': {
    args: [containerPath: string, kind: 'collection' | 'set', viewId: string]
    reply: Result<null>
  }
  'container:configure': {
    args: [
      containerPath: string,
      kind: 'collection' | 'set',
      patch: { open_in?: OpenIn; view_button?: ViewButton; view_style?: ViewStyle },
    ]
    reply: Result<null>
  }
  'view:loadValues': { args: [containerPath: string]; reply: Record<string, PageFrontmatter> }

  // Schema (container-scoped) + registry-wide property ops
  'schema:add': {
    args: [containerPath: string, def: PropertyDefinition]
    reply: Result<{ id: string }>
  }
  'schema:rename': {
    args: [containerPath: string, propertyId: string, newName: string]
    reply: Result<null>
  }
  'schema:reorder': {
    args: [containerPath: string, propertyId: string, toIndex: number]
    reply: Result<null>
  }
  'schema:delete': { args: [containerPath: string, propertyId: string]; reply: Result<null> }
  'schema:assign': {
    args: [containerPath: string, propertyId: string, toIndex?: number]
    reply: Result<null>
  }
  'schema:changeType': {
    args: [
      containerPath: string,
      propertyId: string,
      newType: PropertyType,
      opts?: { dropConflictingValues?: boolean },
    ]
    reply: Result<null>
  }
  'registry:reorder': { args: [propertyId: string, toIndex: number]; reply: Result<null> }
  'property:delete': { args: [propertyId: string]; reply: Result<null> }
  'property:setOptions': {
    args: [propertyId: string, options: { value: string; label: string; color?: string }[]]
    reply: Result<null>
  }
  'property:setStatusGroups': {
    args: [propertyId: string, groups: StatusGroup[]]
    reply: Result<null>
  }
  'property:setLinkConfig': {
    args: [propertyId: string, patch: LinkConfig]
    reply: Result<null>
  }
  'property:setCheckboxColor': {
    args: [propertyId: string, color: string | undefined]
    reply: Result<null>
  }
  'property:setIcon': { args: [propertyId: string, icon: string | undefined]; reply: Result<null> }
  'property:setNumberFormat': {
    args: [propertyId: string, patch: NumberConfig]
    reply: Result<null>
  }
  'property:renameOption': {
    args: [propertyId: string, oldValue: string, newTitle: string]
    reply: Result<null>
  }
  'property:removeOption': { args: [propertyId: string, value: string]; reply: Result<null> }
  'property:clearOption': { args: [propertyId: string, value: string]; reply: Result<null> }
  'property:renameStatusOption': {
    args: [propertyId: string, oldValue: string, newTitle: string]
    reply: Result<null>
  }
  'property:removeStatusOption': { args: [propertyId: string, value: string]; reply: Result<null> }
  'property:clearStatusOption': { args: [propertyId: string, value: string]; reply: Result<null> }

  // Blocks
  'blocks:get': { args: [host: BlockHostRef]; reply: Result<BlockDoc> }
  'blocks:save': { args: [host: BlockHostRef, patch: BlockDocPatch]; reply: Result<null> }
  'blocks:createMarkdown': { args: [host: BlockHostRef]; reply: Result<{ id: string }> }
  'blocks:removeTile': { args: [host: BlockHostRef, tileId: string]; reply: Result<null> }
  'blocks:readMarkdown': {
    args: [host: BlockHostRef, tileId: string]
    reply: Result<{ body: string }>
  }
  'blocks:writeMarkdown': {
    args: [host: BlockHostRef, tileId: string, body: string]
    reply: Result<null>
  }
  'blocks:convertToPage': {
    args: [host: BlockHostRef, tileId: string, pageId: string]
    reply: Result<null>
  }
  'blocks:convertToView': {
    args: [host: BlockHostRef, tileId: string, views: EmbeddedView[]]
    reply: Result<null>
  }
  'blocks:duplicateTile': {
    args: [host: BlockHostRef, tileId: string]
    reply: Result<{ id: string }>
  }
  'blocks:confirmRemove': { args: []; reply: boolean }

  // Settings / personalization / theme
  'subfield:get': { args: []; reply: SubfieldConfig | null }
  'subfield:set': { args: [config: SubfieldConfig]; reply: Result<null> }
  'navViewModes:get': { args: []; reply: NavViewModes | null }
  'navViewModes:set': { args: [modes: NavViewModes]; reply: Result<null> }
  'personalization:set': {
    args: [key: keyof Personalization, value: Personalization[keyof Personalization]]
    reply: Result<null>
  }
  'theme:systemAccent': { args: []; reply: string | null }

  // Navigation / tabs / previews / thumbnails
  'nav:read': { args: []; reply: Result<NavigationState> }
  'nav:write': { args: [patch: Partial<NavigationState>]; reply: Result<null> }
  'tabs:load': { args: []; reply: Result<StoredTabSet | null> }
  'tabs:save': { args: [set: StoredTabSet]; reply: Result<null> }
  'previews:load': { args: []; reply: Result<PreviewsFile> }
  'previews:save': { args: [file: PreviewsFile]; reply: Result<null> }
  // The hover card's universal size — one device-local db row.
  'hoverCard:load': { args: []; reply: Result<HoverCardSize | null> }
  'hoverCard:save': { args: [size: HoverCardSize]; reply: Result<null> }
  'devicePrefs:load': { args: []; reply: Result<DevicePrefs | null> }
  'devicePrefs:save': { args: [prefs: DevicePrefs]; reply: Result<null> }

  'capture:thumbnail': {
    args: [navKey: string, rect: ThumbRect, scaleFactor: number]
    reply: Result<{ url: string }>
  }
  'nav:evictThumbs': { args: [liveKeys: string[]]; reply: Result<null> }

  // The trash's read side. `.trash` is excluded from the watcher, so nothing is ever pushed —
  // the browser asks, and asks again after every action it takes.
  'trash:list': { args: []; reply: Result<TrashRow[]> }
  'trash:menu': { args: [ctx: TrashMenuContext]; reply: TrashMenuAction | null }
  'trash:columnMenu': { args: [ctx: TrashColumnContext]; reply: TrashColumnAction | null }
  // Main owns the confirm's wording because main owns the switch that decides what Delete means —
  // the renderer supplies only how many rows are going.
  'trash:confirmEmpty': { args: [count: number]; reply: boolean }
  // biome-ignore lint/suspicious/noConfusingVoidType: the wire resolves nothing — void IS the reply
  'trash:report': { args: [message: string, detail: string]; reply: void }

  // The write path + dialogs + external
  mutate: { args: [req: MutateRequest]; reply: MutateReply }
  // biome-ignore lint/suspicious/noConfusingVoidType: the wire resolves nothing — void IS the reply
  'context-menu': { args: [target: ContextTarget]; reply: void }
  'create-menu': {
    args: [items: Creator[]]
    reply: MutateRequest | null
  }
  // biome-ignore lint/suspicious/noConfusingVoidType: the wire resolves nothing — void IS the reply
  'error:show': { args: [message: string]; reply: void }
  // biome-ignore lint/suspicious/noConfusingVoidType: the wire resolves nothing — void IS the reply
  'link:open': { args: [url: string]; reply: void }
  'file:open': { args: [path: string]; reply: Result<null> }
  'linkTitles:get': { args: []; reply: Record<string, string> }
  'linkTitles:fetch': { args: [url: string]; reply: Result<{ title: string | null }> }

  // Native menus — each resolves the picked action, or null on dismiss
  'view-button-menu': {
    args: [current: { viewButton: ViewButton; viewStyle: ViewStyle }]
    reply: ViewButtonMenuAction | null
  }
  'view-row-menu': { args: [ctx: ViewRowMenuContext]; reply: ViewRowAction | null }
  'view-embed-title-menu': {
    args: [arg: { iconShown: boolean; level: number }]
    reply: EmbedTitleMenuAction | null
  }
  'view-embed-area-menu': {
    args: [current: { viewStyle: ViewStyle; titleShown: boolean }]
    reply: EmbedAreaMenuAction | null
  }
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
  'grip-menu': { args: [ctx: GripMenuContext]; reply: GripMenuAction | null }
  'column-menu': { args: [ctx: ColumnMenuContext]; reply: ColumnMenuAction | null }
  'cell-menu': { args: [ctx: CellMenuContext]; reply: CellMenuAction | null }
  'row-grip-menu': { args: [ctx: RowGripMenuContext]; reply: RowGripMenuAction | null }
  'page-actions-menu': {
    args: [ctx: { actions: PageMetaAction[]; alreadyOpen?: boolean }]
    reply: PageMetaAction | null
  }
  'card-menu': { args: [ctx: CardMenuContext]; reply: CardMenuAction | null }
  'tab-menu': { args: [ctx: TabMenuContext]; reply: TabMenuAction | null }
  'nav-row-menu': { args: [ctx: NavRowMenuContext]; reply: NavRowMenuAction | null }
  'conn-menu': { args: [ctx: ConnMenuContext]; reply: ConnMenuAction | null }
  'property-menu': { args: [ctx: PropertyMenuContext]; reply: PropertyMenuAction | null }
  'option-menu': { args: [ctx: OptionMenuContext]; reply: OptionMenuAction | null }
  /** The generic list menu — any surface whose menu is plain rows. Replies with the chosen row's
   *  action, or null on dismissal. */
  'row-menu': { args: [req: RowMenuRequest]; reply: string | null }
}

/** Fire-and-forget sends (`send` → `on`) — no reply channel. */
export interface Tells {
  'editor:format-state': [state: FormatState]
  'win:dragBy': [dx: number, dy: number]
  'win:zoom': []
  'editor:grip-hot': [on: boolean]
  // A wheel over a surface that holds the pointer on the host's behalf, handed to the guest it
  // covers — the only way a host-owned pointer can still scroll the page beneath it.
  'web:wheel': [guestId: number, x: number, y: number, deltaX: number, deltaY: number]
}

/** Main→renderer pushes — the preload derives an `on*` subscriber (returning an unsubscribe)
 *  per entry, and main sends through the typed `push` helper. */
export interface Pushes {
  'menu:action': string
  // `create` marks a just-created entity's naming session — the field opens empty and the
  // first commit rides the create (disambiguating, cascade-free).
  'begin-rename': { path: string; create?: boolean; host?: RenameHost }
  'new-page-adjacent': { path: string; where: 'above' | 'below'; host?: RenameHost }
  // Change Icon, like Rename, is a renderer affordance a native menu can only ask for: the picker
  // anchors to the row the gesture happened on, which only the renderer can find.
  'begin-icon': { path: string; host?: RenameHost }
  'open-in-new-tab': ContextTarget
  'open-in-preview': ContextTarget
  'nav:changed': Omit<NavigationState, 'recents'>
  'nexus:changed': NexusTree
  // A guest webview's window.open, denied main-side and handed to the renderer's one open-link
  // adjudicator — popups and link clicks can never route differently.
  'web:popup': string
}
