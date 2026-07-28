import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type {
  AgendaListResult,
  NavChanged,
  NavFavorite,
  NavStateResult,
  NavTarget,
  NavViewModes,
  NexusState,
  NexusTree,
  OpenIn,
  PageResult,
  Personalization,
  PinEntry,
  PinsResult,
  PreviewsFile,
  PreviewsResult,
  RecentEntry,
  SubfieldConfig,
  TabSet,
  TabsResult,
  ThumbRect,
  ThumbResult,
  ViewButton,
  ViewStyle,
} from '@shared/types'
import type { MutateRequest, MutateResult, ContextTarget } from '@shared/mutate'
import type { Ack } from '@shared/result'
import type { FormatState } from '@shared/editorMenu'
import type { TableMenuAction, TableMenuContext } from '@shared/tableMenu'
import type { CalloutMenuAction } from '@shared/calloutMenu'
import type { CellMenuAction, CellMenuContext } from '@shared/cellMenu'
import type { CardMenuAction, CardMenuContext } from '@shared/cardMenu'
import type { ConnMenuAction } from '@shared/connections'
import type { TabMenuAction, TabMenuContext } from '@shared/tabMenu'
import type { NavRowMenuAction, NavRowMenuContext } from '@shared/navRowMenu'
import type { PropertyMenuAction, PropertyMenuContext } from '@shared/propertyMenu'
import type { OptionMenuAction, OptionMenuContext } from '@shared/optionMenu'
import type { ColumnMenuAction, ColumnMenuContext } from '@shared/columnMenu'
import type { SavedView } from '@shared/views'
import type {
  BlockDocPatch,
  BlockHostRef,
  BlocksGetResult,
  BlocksSaveResult,
  EmbeddedView,
} from '@shared/blocks'
import type { StatusGroup } from '@shared/properties'
import type { PageFrontmatter } from '@shared/schemas'
import type { PropertyDefinition, PropertyType } from '@shared/properties'

// The ONLY API the renderer can see. Narrow read surface; no fs, no Node.
const api = {
  state: (): Promise<NexusState> => ipcRenderer.invoke('nexus:state'),
  choose: (): Promise<boolean> => ipcRenderer.invoke('nexus:choose'),
  // Resolve a dropped folder's path here (the renderer can't) and send only the
  // path to main — the absolute path never enters web content.
  openDropped: (file: File): Promise<boolean> =>
    ipcRenderer.invoke('nexus:openPath', webUtils.getPathForFile(file)),
  openPage: (relPath: string): Promise<PageResult> => ipcRenderer.invoke('page:open', relPath),
  // Debounced editor body write (relative path); main resolves under the session root + preserves frontmatter.
  updatePageBody: (relPath: string, body: string): Promise<Ack> =>
    ipcRenderer.invoke('page:updateBody', relPath, body),
  // Heading-fold UI state — local `.nexus/folds.json`, keyed by page id (per-machine, not frontmatter).
  folds: {
    get: (): Promise<Record<string, string[]>> => ipcRenderer.invoke('folds:get'),
    set: (pageId: string, keys: string[]): Promise<Ack> =>
      ipcRenderer.invoke('folds:set', pageId, keys),
  },
  // Active-view pointer — local `.nexus/activeViews.json`, container id → active view id (per-machine).
  activeViews: {
    get: (): Promise<Record<string, string>> => ipcRenderer.invoke('activeViews:get'),
    set: (containerId: string, viewId: string): Promise<Ack> =>
      ipcRenderer.invoke('activeViews:set', containerId, viewId),
  },
  // Sorted-view manual order — local `.nexus/viewOrders.json`, view id → page-id tiebreaker (per-machine).
  viewOrders: {
    get: (): Promise<Record<string, string[]>> => ipcRenderer.invoke('viewOrders:get'),
    set: (viewId: string, order: string[]): Promise<Ack> =>
      ipcRenderer.invoke('viewOrders:set', viewId, order),
  },
  // View persistence — save / reorder / delete a SavedView in a Collection/Set sidecar's views[].
  views: {
    save: (
      containerPath: string,
      kind: 'collection' | 'set',
      view: SavedView,
    ): Promise<{ ok: true; id: string } | { ok: false; error: string }> =>
      ipcRenderer.invoke('views:save', containerPath, kind, view),
    reorder: (
      containerPath: string,
      kind: 'collection' | 'set',
      orderedIds: string[],
    ): Promise<Ack> => ipcRenderer.invoke('views:reorder', containerPath, kind, orderedIds),
    delete: (containerPath: string, kind: 'collection' | 'set', viewId: string): Promise<Ack> =>
      ipcRenderer.invoke('views:delete', containerPath, kind, viewId),
  },
  // Per-container non-view settings (open_in is collection-only; view_button / view_style either level).
  container: {
    configure: (
      containerPath: string,
      kind: 'collection' | 'set',
      patch: { open_in?: OpenIn; view_button?: ViewButton; view_style?: ViewStyle },
    ): Promise<Ack> => ipcRenderer.invoke('container:configure', containerPath, kind, patch),
  },
  // The ViewDropdown right-click menu — resolves the picked action (or null on dismiss).
  viewButtonMenu: (current: {
    viewButton: ViewButton
    viewStyle: ViewStyle
  }): Promise<'toggle-title' | 'style-dropdown' | 'style-toolbar' | null> =>
    ipcRenderer.invoke('view-button-menu', current),
  // The Space settings pane's (Icon)(Title) row right-click menu.
  spaceHeaderMenu: (): Promise<'change-color' | null> => ipcRenderer.invoke('space-header-menu'),
  // The view embed's title-row right-click menu (Hide/Show Icon · Title Size · Hide Title).
  viewEmbedTitleMenu: (arg: {
    iconShown: boolean
    level: number
  }): Promise<'toggle-icon' | 'hide-title' | `size-${number}` | null> =>
    ipcRenderer.invoke('view-embed-title-menu', arg),
  // The view embed switcher area's right-click menu (Hide/Show Titles · New View · Style).
  viewEmbedAreaMenu: (current: {
    viewButton: ViewButton
    viewStyle: ViewStyle
    titleShown: boolean
  }): Promise<
    'toggle-pill-titles' | 'show-title' | 'new-view' | 'style-dropdown' | 'style-toolbar' | null
  > => ipcRenderer.invoke('view-embed-area-menu', current),
  // The ViewSettings ⋮ menu (Duplicate / Delete); Delete disabled when the view can't be removed.
  viewItemMenu: (canDelete: boolean): Promise<'view:duplicate' | 'view:delete' | null> =>
    ipcRenderer.invoke('view-item-menu', canDelete),
  // A ViewPane view row's right-click menu (Rename / Edit Icon / Delete); Delete disabled on the last view.
  viewRowMenu: (
    canDelete: boolean,
  ): Promise<'view:rename' | 'view:edit-icon' | 'view:delete' | null> =>
    ipcRenderer.invoke('view-row-menu', canDelete),
  // The icon picker's right-click Favorite/Remove menu — resolves 'toggle' on click, null on dismiss.
  iconFavoriteMenu: (favorited: boolean): Promise<'toggle' | null> =>
    ipcRenderer.invoke('icon-favorite-menu', favorited),
  // Property schema CRUD on a Collection's page schema. containerPath is the schema-owning
  // Collection's folder (a Set inherits, so the renderer passes its ancestor Collection's path).
  schema: {
    add: (
      containerPath: string,
      def: PropertyDefinition,
    ): Promise<{ ok: true; id: string } | { ok: false; error: string }> =>
      ipcRenderer.invoke('schema:add', containerPath, def),
    rename: (containerPath: string, propertyId: string, newName: string): Promise<Ack> =>
      ipcRenderer.invoke('schema:rename', containerPath, propertyId, newName),
    reorder: (containerPath: string, propertyId: string, toIndex: number): Promise<Ack> =>
      ipcRenderer.invoke('schema:reorder', containerPath, propertyId, toIndex),
    delete: (containerPath: string, propertyId: string): Promise<Ack> =>
      ipcRenderer.invoke('schema:delete', containerPath, propertyId),
    assign: (containerPath: string, propertyId: string, toIndex?: number): Promise<Ack> =>
      ipcRenderer.invoke('schema:assign', containerPath, propertyId, toIndex),
    changeType: (
      containerPath: string,
      propertyId: string,
      newType: PropertyType,
      opts?: { dropConflictingValues?: boolean },
    ): Promise<Ack> =>
      ipcRenderer.invoke('schema:changeType', containerPath, propertyId, newType, opts),
  },
  // Nexus-wide property ops (registry-level, no container scope). `property.delete` is the
  // global destructive op (snapshot, scrub every collection, purge caches, drop the def);
  // `schema.delete` above is the per-Collection Remove (strip + cache restorably).
  property: {
    delete: (propertyId: string): Promise<Ack> => ipcRenderer.invoke('property:delete', propertyId),
    setOptions: (
      propertyId: string,
      options: { value: string; label: string; color?: string }[],
    ): Promise<Ack> => ipcRenderer.invoke('property:setOptions', propertyId, options),
    setStatusGroups: (propertyId: string, groups: StatusGroup[]): Promise<Ack> =>
      ipcRenderer.invoke('property:setStatusGroups', propertyId, groups),
    // Registry-only display config for a URL / Link property (underline, full-url ⇄ title, color).
    setLinkConfig: (
      propertyId: string,
      patch: {
        link_underline?: boolean
        link_display?: 'link-url' | 'link-title'
        link_color?: string
      },
    ): Promise<Ack> => ipcRenderer.invoke('property:setLinkConfig', propertyId, patch),
    // Registry-only display config for a Checkbox property: its property-wide color (undefined = Default).
    setCheckboxColor: (propertyId: string, color: string | undefined): Promise<Ack> =>
      ipcRenderer.invoke('property:setCheckboxColor', propertyId, color),
    // Registry-only: a property's icon (a symbol id; undefined = the type's default glyph).
    setIcon: (propertyId: string, icon: string | undefined): Promise<Ack> =>
      ipcRenderer.invoke('property:setIcon', propertyId, icon),
    // Registry-only display config for a Number property: its property-wide format fields.
    setNumberFormat: (
      propertyId: string,
      patch: {
        number_family?: 'number' | 'percent' | 'currency'
        number_currency?: string
        number_separators?: boolean
        number_decimals?: 'hidden' | number
        number_fraction?: boolean
        number_denominator?: number
      },
    ): Promise<Ack> => ipcRenderer.invoke('property:setNumberFormat', propertyId, patch),
    renameOption: (propertyId: string, oldValue: string, newTitle: string): Promise<Ack> =>
      ipcRenderer.invoke('property:renameOption', propertyId, oldValue, newTitle),
    removeOption: (propertyId: string, value: string): Promise<Ack> =>
      ipcRenderer.invoke('property:removeOption', propertyId, value),
    clearOption: (propertyId: string, value: string): Promise<Ack> =>
      ipcRenderer.invoke('property:clearOption', propertyId, value),
    // Status variants of the page-touching ops — same cascade, keyed on the Status property's
    // `status_groups`. Rename cascades the new value onto pages; remove/clear strip it.
    renameStatusOption: (propertyId: string, oldValue: string, newTitle: string): Promise<Ack> =>
      ipcRenderer.invoke('property:renameStatusOption', propertyId, oldValue, newTitle),
    removeStatusOption: (propertyId: string, value: string): Promise<Ack> =>
      ipcRenderer.invoke('property:removeStatusOption', propertyId, value),
    clearStatusOption: (propertyId: string, value: string): Promise<Ack> =>
      ipcRenderer.invoke('property:clearStatusOption', propertyId, value),
  },
  // The nexus-wide cosmetic property order — how every collection's All Properties lists.
  registry: {
    reorder: (propertyId: string, toIndex: number): Promise<Ack> =>
      ipcRenderer.invoke('registry:reorder', propertyId, toIndex),
  },
  // Batch frontmatter read for a container's view pipeline (pageId → frontmatter), lazy on open.
  loadValues: (containerPath: string): Promise<Record<string, PageFrontmatter>> =>
    ipcRenderer.invoke('view:loadValues', containerPath),
  // Which tables' first column renders as a heading (a Pommora-only visual, not in the .md).
  tableHeadingColumns: {
    get: (): Promise<Record<string, number[]>> => ipcRenderer.invoke('tableHeadingCols:get'),
    set: (pageId: string, indices: number[]): Promise<Ack> =>
      ipcRenderer.invoke('tableHeadingCols:set', pageId, indices),
  },
  // The block document behind the BlockHost seam — targeted per-host load + locked
  // partial writes (layout / blocks / locked) on the host's config.
  blocks: {
    get: (host: BlockHostRef): Promise<BlocksGetResult> => ipcRenderer.invoke('blocks:get', host),
    save: (host: BlockHostRef, patch: BlockDocPatch): Promise<BlocksSaveResult> =>
      ipcRenderer.invoke('blocks:save', host, patch),
    // create mints the ULID + file + entry (the renderer splices the layout after); remove
    // drops the entry + trashes the file; read/write is the tile editor's body persistence.
    createMarkdown: (
      host: BlockHostRef,
    ): Promise<{ ok: true; id: string } | { ok: false; error: string }> =>
      ipcRenderer.invoke('blocks:createMarkdown', host),
    removeTile: (host: BlockHostRef, tileId: string): Promise<BlocksSaveResult> =>
      ipcRenderer.invoke('blocks:removeTile', host, tileId),
    readMarkdown: (
      host: BlockHostRef,
      tileId: string,
    ): Promise<{ ok: true; body: string } | { ok: false; error: string }> =>
      ipcRenderer.invoke('blocks:readMarkdown', host, tileId),
    writeMarkdown: (host: BlockHostRef, tileId: string, body: string): Promise<BlocksSaveResult> =>
      ipcRenderer.invoke('blocks:writeMarkdown', host, tileId, body),
    // Link Page: the entry becomes a page embed; a markdown tile's .md trashes.
    convertToPage: (
      host: BlockHostRef,
      tileId: string,
      pageId: string,
    ): Promise<BlocksSaveResult> =>
      ipcRenderer.invoke('blocks:convertToPage', host, tileId, pageId),
    // Link View: the entry becomes a view embed carrying the COPIED config.
    convertToView: (
      host: BlockHostRef,
      tileId: string,
      views: EmbeddedView[],
    ): Promise<BlocksSaveResult> => ipcRenderer.invoke('blocks:convertToView', host, tileId, views),
    // Raw-entry copy under a fresh id; markdown copies its file, a view tile re-mints its config ids.
    duplicateTile: (
      host: BlockHostRef,
      tileId: string,
    ): Promise<{ ok: true; id: string } | { ok: false; error: string }> =>
      ipcRenderer.invoke('blocks:duplicateTile', host, tileId),
    // Delete keeps the native confirm (Nathan's call).
    confirmRemove: (): Promise<boolean> => ipcRenderer.invoke('blocks:confirmRemove'),
  },
  // Subfield (footer) config — React-owned `subfield` key in `.nexus/settings.json`.
  subfield: {
    get: (): Promise<SubfieldConfig | null> => ipcRenderer.invoke('subfield:get'),
    set: (config: SubfieldConfig): Promise<Ack> => ipcRenderer.invoke('subfield:set', config),
  },
  // Nav view modes (List/Gallery per surface) — React-owned `navViewModes` key.
  navViewModes: {
    get: (): Promise<NavViewModes | null> => ipcRenderer.invoke('navViewModes:get'),
    set: (modes: NavViewModes): Promise<Ack> => ipcRenderer.invoke('navViewModes:set', modes),
  },
  // Agenda read for the sidebar's Agenda mode — lazy, called only when that mode is active.
  agenda: {
    list: (): Promise<AgendaListResult> => ipcRenderer.invoke('agenda:list'),
  },
  // Navigation layer — recents/favorites persistence. The renderer owns the arrays; main persists.
  // saveRecents debounces main-side (immediate=true for the pin toggle); saveFavorites is immediate.
  nav: {
    load: (): Promise<NavStateResult> => ipcRenderer.invoke('nav:load'),
    saveRecents: (entries: RecentEntry[], immediate?: boolean): Promise<Ack> =>
      ipcRenderer.invoke('nav:saveRecents', entries, immediate),
    saveFavorites: (entries: NavFavorite[]): Promise<Ack> =>
      ipcRenderer.invoke('nav:saveFavorites', entries),
    loadPins: (): Promise<PinsResult> => ipcRenderer.invoke('nav:loadPins'),
    addPin: (pin: PinEntry): Promise<Ack> => ipcRenderer.invoke('nav:addPin', pin),
    reorderPin: (pin: PinEntry): Promise<Ack> => ipcRenderer.invoke('nav:reorderPin', pin),
    removePin: (target: NavTarget, order: number): Promise<Ack> =>
      ipcRenderer.invoke('nav:removePin', target, order),
  },
  // The tab set — synced tabs.json (unpinned tabs + active + per-tab history targets); saves debounce main-side.
  tabs: {
    load: (): Promise<TabsResult> => ipcRenderer.invoke('tabs:load'),
    save: (set: TabSet): Promise<Ack> => ipcRenderer.invoke('tabs:save', set),
  },
  // The preview tab sets — synced page-previews.json (nav set + per-origin sets + open pointer).
  previews: {
    load: (): Promise<PreviewsResult> => ipcRenderer.invoke('previews:load'),
    save: (file: PreviewsFile): Promise<Ack> => ipcRenderer.invoke('previews:save', file),
  },
  // capture returns the nexus-asset:// URL; evict prunes thumbnails outside the live recents∪pins set.
  capture: {
    thumbnail: (navKey: string, rect: ThumbRect, scaleFactor: number): Promise<ThumbResult> =>
      ipcRenderer.invoke('capture:thumbnail', navKey, rect, scaleFactor),
    evict: (liveKeys: string[]): Promise<Ack> => ipcRenderer.invoke('nav:evictThumbs', liveKeys),
  },
  // Persists one key; the tree surfaces current values, so there's no get.
  personalization: {
    set: <K extends keyof Personalization>(key: K, value: Personalization[K]): Promise<Ack> =>
      ipcRenderer.invoke('personalization:set', key, value),
  },
  // Renderer-initiated write (relative paths only); main resolves under the session root.
  mutate: (req: MutateRequest): Promise<MutateResult> => ipcRenderer.invoke('mutate', req),
  // Right-click an entity → main pops a native context menu + acts on it.
  contextMenu: (target: ContextTarget): Promise<void> => ipcRenderer.invoke('context-menu', target),
  // Push the editor's active formatting state so the native right-click menu renders accurate state.
  setEditorFormatState: (state: FormatState): void =>
    ipcRenderer.send('editor:format-state', state),
  // JS window mover for hover-bearing chrome (the tab bar): a native app-region never delivers
  // hover, so the bar drives the move itself via per-pointermove screen deltas.
  winDragBy: (dx: number, dy: number): void => ipcRenderer.send('win:dragBy', dx, dy),
  winZoom: (): void => ipcRenderer.send('win:zoom'),
  // Resolves with the picked request, for the renderer's store to run.
  popCreateMenu: (items: { label: string; req: MutateRequest }[]): Promise<MutateRequest | null> =>
    ipcRenderer.invoke('create-menu', items),
  // Surface a failure natively (renderer can't show a native dialog itself).
  showError: (message: string): Promise<void> => ipcRenderer.invoke('error:show', message),
  // Open an external link (http/https/mailto) in the OS default browser/app.
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('link:open', url),
  // `get` returns the whole cached map; `fetch` resolves one URL (cache hit or live fetch).
  linkTitles: {
    get: (): Promise<Record<string, string>> => ipcRenderer.invoke('linkTitles:get'),
    fetch: (
      url: string,
    ): Promise<{ ok: true; title: string | null } | { ok: false; error: string }> =>
      ipcRenderer.invoke('linkTitles:fetch', url),
  },
  // Open a page-attached file (nexus-relative path) in its OS default app.
  openFile: (path: string): Promise<Ack> => ipcRenderer.invoke('file:open', path),
  systemAccent: (): Promise<string | null> => ipcRenderer.invoke('theme:systemAccent'),
  // Pop the native nexus-identity icon menu (Change Icon / Add·Change Photo / removes) → the chosen action.
  iconMenu: (opts: {
    hasPhoto: boolean
    hasGlyph: boolean
  }): Promise<'changeIcon' | 'addPhoto' | 'removePhoto' | 'removeIcon' | null> =>
    ipcRenderer.invoke('nexus:iconMenu', opts),
  // Open the native image picker directly → data URL (null if canceled). Banner Add / Change.
  pickImage: (): Promise<string | null> => ipcRenderer.invoke('nexus:pickImage'),
  // `noRemove` drops the Remove item (an inherited banner has nothing of its own to remove).
  bannerMenu: (opts?: {
    noRemove?: boolean
    noun?: string
    add?: boolean
  }): Promise<'change' | 'remove' | null> => ipcRenderer.invoke('nexus:bannerMenu', opts),
  // The Rename / Edit Icon menu for a detail title.
  titleMenu: (opts?: {
    toggleIcon?: boolean
    iconHidden?: boolean
    noEditIcon?: boolean
  }): Promise<'rename' | 'editIcon' | 'toggleIcon' | null> =>
    ipcRenderer.invoke('nexus:titleMenu', opts),
  // The table grip's right-click menu.
  tableMenu: (ctx: TableMenuContext): Promise<TableMenuAction | null> =>
    ipcRenderer.invoke('table-menu', ctx),
  // The callout grip's right-click menu.
  calloutMenu: (): Promise<CalloutMenuAction | null> => ipcRenderer.invoke('callout-menu'),
  // The table-view column header's right-click menu.
  columnMenu: (ctx: ColumnMenuContext): Promise<ColumnMenuAction | null> =>
    ipcRenderer.invoke('column-menu', ctx),
  // A table cell's right-click menu (title meta / per-type Style / Edit).
  cellMenu: (ctx: CellMenuContext): Promise<CellMenuAction | null> =>
    ipcRenderer.invoke('cell-menu', ctx),
  // A card's right-click menu (page meta + Add Property ▸).
  cardMenu: (ctx: CardMenuContext): Promise<CardMenuAction | null> =>
    ipcRenderer.invoke('card-menu', ctx),
  tabMenu: (ctx: TabMenuContext): Promise<TabMenuAction | null> =>
    ipcRenderer.invoke('tab-menu', ctx),
  // A NavWindow row/card's right-click menu (Open · Pin · Favorite · Remove).
  navRowMenu: (ctx: NavRowMenuContext): Promise<NavRowMenuAction | null> =>
    ipcRenderer.invoke('nav-row-menu', ctx),
  // A wikilink's right-click menu (Open in Preview).
  connMenu: (): Promise<ConnMenuAction | null> => ipcRenderer.invoke('conn-menu'),
  // A property's native menu (editor ⋮ / row right-click); Delete confirms in main first.
  propertyMenu: (ctx: PropertyMenuContext): Promise<PropertyMenuAction | null> =>
    ipcRenderer.invoke('property-menu', ctx),
  // An option chip's native menu (Rename / Remove / Clear); Remove + Clear confirm in main first.
  optionMenu: (ctx: OptionMenuContext): Promise<OptionMenuAction | null> =>
    ipcRenderer.invoke('option-menu', ctx),
  // Flag (on hover) whether the pointer sits on a callout grip, so the generic editor menu stands down there.
  setCalloutGrip: (on: boolean): void => ipcRenderer.send('editor:callout-grip', on),
  // Rename the open nexus's root folder + re-point the live session to the new path.
  renameNexus: (newName: string): Promise<Ack> => ipcRenderer.invoke('nexus:rename', newName),
  // Native-menu actions pushed from main; returns an unsubscribe.
  onMenuAction: (cb: (action: string) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, action: string): void => cb(action)
    ipcRenderer.on('menu:action', listener)
    return () => {
      ipcRenderer.removeListener('menu:action', listener)
    }
  },
  // Main asks the renderer to start inline-renaming the row at this path (context-menu Rename).
  onBeginRename: (cb: (path: string) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, path: string): void => cb(path)
    ipcRenderer.on('begin-rename', listener)
    return () => {
      ipcRenderer.removeListener('begin-rename', listener)
    }
  },
  // The context-menu "Open in New Tab" push-back — the action runs renderer-side (main can't know
  // the tab set); returns an unsubscribe.
  onOpenInNewTab: (cb: (target: ContextTarget) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, target: ContextTarget): void => cb(target)
    ipcRenderer.on('open-in-new-tab', listener)
    return () => {
      ipcRenderer.removeListener('open-in-new-tab', listener)
    }
  },
  // The context-menu "Open in Preview" push-back — same contract as onOpenInNewTab.
  onOpenInPreview: (cb: (target: ContextTarget) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, target: ContextTarget): void => cb(target)
    ipcRenderer.on('open-in-preview', listener)
    return () => {
      ipcRenderer.removeListener('open-in-preview', listener)
    }
  },
  // The live watcher pushed fresh nav state (external/synced sidecar or pin change) — no tree walk.
  onNavChanged: (cb: (nav: NavChanged) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, nav: NavChanged): void => cb(nav)
    ipcRenderer.on('nav:changed', listener)
    return () => {
      ipcRenderer.removeListener('nav:changed', listener)
    }
  },
  // The live watcher pushed a fresh tree (external FS change) — swap it in place; returns an unsubscribe.
  onNexusChanged: (cb: (tree: NexusTree) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, tree: NexusTree): void => cb(tree)
    ipcRenderer.on('nexus:changed', listener)
    return () => {
      ipcRenderer.removeListener('nexus:changed', listener)
    }
  },
}

contextBridge.exposeInMainWorld('nexus', api)

export type NexusApi = typeof api
