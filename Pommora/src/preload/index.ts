import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { Asks, Pushes, Tells } from '@shared/bridge'
import type { Personalization } from '@shared/types'
import type { Ack } from '@shared/result'

// Every dialer derives from the bridge map — the channel key is the only thing written here,
// and its signature (arg names included) flows from `Asks`. A typo'd or drifted channel is a
// compile error, never a dead line.
const ask =
  <K extends keyof Asks>(k: K) =>
  (...args: Asks[K]['args']): Promise<Asks[K]['reply']> =>
    ipcRenderer.invoke(k, ...args)

const tell =
  <K extends keyof Tells>(k: K) =>
  (...args: Tells[K]): void => {
    ipcRenderer.send(k, ...args)
  }

const on =
  <K extends keyof Pushes>(k: K) =>
  (cb: (payload: Pushes[K]) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: Pushes[K]): void => cb(payload)
    ipcRenderer.on(k, listener)
    return () => {
      ipcRenderer.removeListener(k, listener)
    }
  }

// The ONLY API the renderer can see. Narrow read surface; no fs, no Node. The grouping below is
// the renderer-facing shape; the wire truth lives in @shared/bridge.
const api = {
  state: ask('nexus:state'),
  choose: ask('nexus:choose'),
  // Resolve a dropped folder's path here (the renderer can't) and send only the
  // path to main — the absolute path never enters web content.
  openDropped: (file: File): Promise<boolean> =>
    ipcRenderer.invoke('nexus:openPath', webUtils.getPathForFile(file)),
  openPage: ask('page:open'),
  // Debounced editor body write (relative path); main resolves under the session root + preserves frontmatter.
  updatePageBody: ask('page:updateBody'),
  // Heading-fold UI state — per-machine rows in nexus.db, keyed by page id (not frontmatter).
  folds: { get: ask('folds:get'), set: ask('folds:set') },
  // Active-view pointer — per-machine rows in nexus.db, container id → active view id.
  activeViews: { get: ask('activeViews:get'), set: ask('activeViews:set') },
  // Sorted-view manual order — per-machine rows in nexus.db, view id → page-id tiebreaker.
  viewOrders: { get: ask('viewOrders:get'), set: ask('viewOrders:set') },
  // View persistence — save / reorder / delete a SavedView in a Collection/Set sidecar's views[].
  views: {
    save: ask('views:save'),
    reorder: ask('views:reorder'),
    delete: ask('views:delete'),
  },
  // Per-container non-view settings (open_in is collection-only; view_button / view_style either level).
  container: { configure: ask('container:configure') },
  // The ViewDropdown right-click menu — resolves the picked action (or null on dismiss).
  viewButtonMenu: ask('view-button-menu'),
  // The Space settings pane's (Icon)(Title) row right-click menu.
  spaceHeaderMenu: ask('space-header-menu'),
  // The view embed's title-row right-click menu (Hide/Show Icon · Title Size · Hide Title).
  viewEmbedTitleMenu: ask('view-embed-title-menu'),
  // The view embed switcher area's right-click menu (Hide/Show Titles · New View · Style).
  viewEmbedAreaMenu: ask('view-embed-area-menu'),
  // The ViewSettings ⋮ menu (Duplicate / Delete); Delete disabled when the view can't be removed.
  viewItemMenu: ask('view-item-menu'),
  // A ViewPane view row's right-click menu (Rename / Edit Icon / Delete); Delete disabled on the last view.
  viewRowMenu: ask('view-row-menu'),
  // The icon picker's right-click Favorite/Remove menu — resolves 'toggle' on click, null on dismiss.
  iconFavoriteMenu: ask('icon-favorite-menu'),
  // Property schema CRUD on a Collection's page schema. containerPath is the schema-owning
  // Collection's folder (a Set inherits, so the renderer passes its ancestor Collection's path).
  schema: {
    add: ask('schema:add'),
    rename: ask('schema:rename'),
    reorder: ask('schema:reorder'),
    delete: ask('schema:delete'),
    assign: ask('schema:assign'),
    changeType: ask('schema:changeType'),
  },
  // Nexus-wide property ops (registry-level, no container scope). `property.delete` is the
  // global destructive op (snapshot, scrub every collection, purge caches, drop the def);
  // `schema.delete` above is the per-Collection Remove (strip + cache restorably).
  property: {
    delete: ask('property:delete'),
    setOptions: ask('property:setOptions'),
    setStatusGroups: ask('property:setStatusGroups'),
    // Registry-only display config for a URL / Link property (underline, full-url ⇄ title, color).
    setLinkConfig: ask('property:setLinkConfig'),
    // Registry-only display config for a Checkbox property: its property-wide color (undefined = Default).
    setCheckboxColor: ask('property:setCheckboxColor'),
    // Registry-only: a property's icon (a symbol id; undefined = the type's default glyph).
    setIcon: ask('property:setIcon'),
    // Registry-only display config for a Number property: its property-wide format fields.
    setNumberFormat: ask('property:setNumberFormat'),
    renameOption: ask('property:renameOption'),
    removeOption: ask('property:removeOption'),
    clearOption: ask('property:clearOption'),
    // Status variants of the page-touching ops — same cascade, keyed on the Status property's
    // `status_groups`. Rename cascades the new value onto pages; remove/clear strip it.
    renameStatusOption: ask('property:renameStatusOption'),
    removeStatusOption: ask('property:removeStatusOption'),
    clearStatusOption: ask('property:clearStatusOption'),
  },
  // The nexus-wide cosmetic property order — how every collection's All Properties lists.
  registry: { reorder: ask('registry:reorder') },
  // Batch frontmatter read for a container's view pipeline (pageId → frontmatter), lazy on open.
  loadValues: ask('view:loadValues'),
  // Which tables' first column renders as a heading (a Pommora-only visual, not in the .md).
  tableHeadingColumns: { get: ask('tableHeadingCols:get'), set: ask('tableHeadingCols:set') },
  // The block document behind the BlockHost seam — targeted per-host load + locked
  // partial writes (layout / blocks / locked) on the host's config.
  blocks: {
    get: ask('blocks:get'),
    save: ask('blocks:save'),
    // create mints the ULID + file + entry (the renderer splices the layout after); remove
    // drops the entry + trashes the file; read/write is the tile editor's body persistence.
    createMarkdown: ask('blocks:createMarkdown'),
    removeTile: ask('blocks:removeTile'),
    readMarkdown: ask('blocks:readMarkdown'),
    writeMarkdown: ask('blocks:writeMarkdown'),
    // Link Page: the entry becomes a page embed; a markdown tile's .md trashes.
    convertToPage: ask('blocks:convertToPage'),
    // Link View: the entry becomes a view embed carrying the COPIED config.
    convertToView: ask('blocks:convertToView'),
    // Raw-entry copy under a fresh id; markdown copies its file, a view tile re-mints its config ids.
    duplicateTile: ask('blocks:duplicateTile'),
    // Delete keeps the native confirm (Nathan's call).
    confirmRemove: ask('blocks:confirmRemove'),
  },
  // Subfield (footer) config — React-owned `subfield` key in `.nexus/settings.json`.
  subfield: { get: ask('subfield:get'), set: ask('subfield:set') },
  // Nav view modes (List/Gallery per surface) — React-owned `navViewModes` key.
  navViewModes: { get: ask('navViewModes:get'), set: ask('navViewModes:set') },
  // Agenda read for the sidebar's Agenda mode — lazy, called only when that mode is active.
  agenda: { list: ask('agenda:list') },
  // Navigation intent — one contract over two stores; the IO layer routes each key. The
  // renderer owns the arrays and sends only the keys it means to change.
  nav: { read: ask('nav:read'), write: ask('nav:write') },
  // The tab set — one device-local db row (unpinned tabs + active + per-tab history refs).
  tabs: { load: ask('tabs:load'), save: ask('tabs:save') },
  // The preview tab sets — synced page-previews.json (nav set + per-origin sets + open pointer).
  previews: { load: ask('previews:load'), save: ask('previews:save') },
  // capture returns the nexus-asset:// URL; evict prunes thumbnails outside the live recents∪pins set.
  capture: { thumbnail: ask('capture:thumbnail'), evict: ask('nav:evictThumbs') },
  // Persists one key; the tree surfaces current values, so there's no get. Hand-typed so the
  // key↔value correlation the map's tuple can't express survives for callers.
  personalization: {
    set: <K extends keyof Personalization>(key: K, value: Personalization[K]): Promise<Ack> =>
      ipcRenderer.invoke('personalization:set', key, value),
  },
  // Renderer-initiated write (relative paths only); main resolves under the session root.
  mutate: ask('mutate'),
  // Right-click an entity → main pops a native context menu + acts on it.
  contextMenu: ask('context-menu'),
  // Push the editor's active formatting state so the native right-click menu renders accurate state.
  setEditorFormatState: tell('editor:format-state'),
  // JS window mover for hover-bearing chrome (the tab bar): a native app-region never delivers
  // hover, so the bar drives the move itself via per-pointermove screen deltas.
  winDragBy: tell('win:dragBy'),
  winZoom: tell('win:zoom'),
  // Resolves with the picked request, for the renderer's store to run.
  popCreateMenu: ask('create-menu'),
  // Surface a failure natively (renderer can't show a native dialog itself).
  showError: ask('error:show'),
  // Open an external link (http/https/mailto) in the OS default browser/app.
  openExternal: ask('link:open'),
  // `get` returns the whole cached map; `fetch` resolves one URL (cache hit or live fetch).
  linkTitles: { get: ask('linkTitles:get'), fetch: ask('linkTitles:fetch') },
  // Open a page-attached file (nexus-relative path) in its OS default app.
  openFile: ask('file:open'),
  systemAccent: ask('theme:systemAccent'),
  // Pop the native nexus-identity icon menu (Change Icon / Add·Change Photo / removes) → the chosen action.
  iconMenu: ask('nexus:iconMenu'),
  // Open the native image picker directly → data URL (null if canceled). Banner Add / Change.
  pickImage: ask('nexus:pickImage'),
  // `noRemove` drops the Remove item (an inherited banner has nothing of its own to remove).
  bannerMenu: ask('nexus:bannerMenu'),
  // The Rename / Edit Icon menu for a detail title.
  titleMenu: ask('nexus:titleMenu'),
  // The table grip's right-click menu.
  tableMenu: ask('table-menu'),
  // The callout grip's right-click menu.
  calloutMenu: ask('callout-menu'),
  // The table-view column header's right-click menu.
  columnMenu: ask('column-menu'),
  // A table cell's right-click menu (title meta / per-type Style / Edit).
  cellMenu: ask('cell-menu'),
  // A card's right-click menu (page meta + Add Property ▸).
  cardMenu: ask('card-menu'),
  tabMenu: ask('tab-menu'),
  // A NavWindow row/card's right-click menu (Open · Pin · Favorite · Remove).
  navRowMenu: ask('nav-row-menu'),
  // A wikilink's right-click menu (Open in Preview).
  connMenu: ask('conn-menu'),
  // A property's native menu (editor ⋮ / row right-click); Delete confirms in main first.
  propertyMenu: ask('property-menu'),
  // An option chip's native menu (Rename / Remove / Clear); Remove + Clear confirm in main first.
  optionMenu: ask('option-menu'),
  // Flag (on hover) whether the pointer sits on a callout grip, so the generic editor menu stands down there.
  setCalloutGrip: tell('editor:callout-grip'),
  // Rename the open nexus's root folder + re-point the live session to the new path.
  renameNexus: ask('nexus:rename'),
  // Native-menu actions pushed from main; each subscriber returns an unsubscribe.
  onMenuAction: on('menu:action'),
  // Main asks the renderer to start inline-renaming the row at this path (context-menu Rename).
  onBeginRename: on('begin-rename'),
  // The context-menu "Open in New Tab" push-back — the action runs renderer-side (main can't know
  // the tab set).
  onOpenInNewTab: on('open-in-new-tab'),
  // The context-menu "Open in Preview" push-back — same contract as onOpenInNewTab.
  onOpenInPreview: on('open-in-preview'),
  // The live watcher pushed fresh nav state (external/synced sidecar or pin change) — no tree walk.
  onNavChanged: on('nav:changed'),
  // The live watcher pushed a fresh tree (external FS change) — swap it in place.
  onNexusChanged: on('nexus:changed'),
}

contextBridge.exposeInMainWorld('nexus', api)

export type NexusApi = typeof api
