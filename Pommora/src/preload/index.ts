import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { Asks, Pushes, Tells } from '@shared/bridge'
import type { Personalization } from '@shared/types'
import type { Result } from '@shared/result'

// Every dialer derives from the bridge map — the channel key is the only thing written here, and
// its signature flows from `Asks`. A typo'd or drifted channel is a compile error, never a dead line.
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
  // Resolve a dropped folder's path here (the renderer can't) and send only the path to main.
  openDropped: (file: File) => ask('nexus:openPath')(webUtils.getPathForFile(file)),
  openPage: ask('page:open'),
  updatePageBody: ask('page:updateBody'),
  listHistory: ask('history:list'),
  readSnapshot: ask('history:read'),
  restoreSnapshot: ask('history:restore'),
  deleteSnapshots: ask('history:delete'),
  clearHistory: ask('history:clear'),
  historyMenu: ask('history:menu'),
  folds: { get: ask('folds:get'), set: ask('folds:set') },
  activeViews: { get: ask('activeViews:get'), set: ask('activeViews:set') },
  viewOrders: { get: ask('viewOrders:get'), set: ask('viewOrders:set') },
  views: {
    save: ask('views:save'),
    reorder: ask('views:reorder'),
    delete: ask('views:delete'),
  },
  container: { configure: ask('container:configure') },
  viewButtonMenu: ask('view-button-menu'),
  viewRowMenu: ask('view-row-menu'),
  viewEmbedTitleMenu: ask('view-embed-title-menu'),
  viewEmbedAreaMenu: ask('view-embed-area-menu'),
  iconFavoriteMenu: ask('icon-favorite-menu'),
  // containerPath is the schema-owning Collection's folder (a Set inherits, so the renderer
  // passes its ancestor Collection's path).
  schema: {
    add: ask('schema:add'),
    rename: ask('schema:rename'),
    reorder: ask('schema:reorder'),
    delete: ask('schema:delete'),
    assign: ask('schema:assign'),
  },
  // `property.delete` is the global destructive op; `schema.delete` above is the per-Collection
  // Remove (strip + cache restorably).
  property: {
    delete: ask('property:delete'),
    setOptions: ask('property:setOptions'),
    setStatusGroups: ask('property:setStatusGroups'),
    setLinkConfig: ask('property:setLinkConfig'),
    setCheckboxColor: ask('property:setCheckboxColor'),
    setIcon: ask('property:setIcon'),
    setNumberFormat: ask('property:setNumberFormat'),
    setFileDirectory: ask('property:setFileDirectory'),
    renameOption: ask('property:renameOption'),
    removeOption: ask('property:removeOption'),
    clearOption: ask('property:clearOption'),
    // Status variants of the page-touching ops: rename cascades the new value onto pages;
    // remove/clear strip it.
    renameStatusOption: ask('property:renameStatusOption'),
    removeStatusOption: ask('property:removeStatusOption'),
    clearStatusOption: ask('property:clearStatusOption'),
  },
  registry: { reorder: ask('registry:reorder') },
  loadValues: ask('view:loadValues'),
  embedHeights: { get: ask('embedHeights:get'), set: ask('embedHeights:set') },
  embedZooms: { get: ask('embedZooms:get'), set: ask('embedZooms:set') },
  webGuestZoom: { set: ask('webGuestZoom:set') },
  webGuestMedia: { pause: ask('webGuestMedia:pause') },
  tableHeadingColumns: { get: ask('tableHeadingCols:get'), set: ask('tableHeadingCols:set') },
  headingIcon: { get: ask('headingIcon:get'), set: ask('headingIcon:set') },
  citations: { get: ask('citations:get'), set: ask('citations:set') },
  aliases: { get: ask('aliases:get'), set: ask('aliases:set') },
  blocks: {
    get: ask('blocks:get'),
    save: ask('blocks:save'),
    // create mints the ULID + file + entry (the renderer splices the layout after); remove
    // drops the entry + trashes the file.
    createMarkdown: ask('blocks:createMarkdown'),
    removeTile: ask('blocks:removeTile'),
    readMarkdown: ask('blocks:readMarkdown'),
    writeMarkdown: ask('blocks:writeMarkdown'),
    convertToPage: ask('blocks:convertToPage'),
    convertToView: ask('blocks:convertToView'),
    duplicateTile: ask('blocks:duplicateTile'),
  },
  subfield: { get: ask('subfield:get'), set: ask('subfield:set') },
  navViewModes: { get: ask('navViewModes:get'), set: ask('navViewModes:set') },
  nav: { read: ask('nav:read'), write: ask('nav:write') },
  tabs: { load: ask('tabs:load'), save: ask('tabs:save') },
  windows: { load: ask('windows:load'), save: ask('windows:save') },
  glance: { load: ask('glance:load'), save: ask('glance:save') },
  devicePrefs: { load: ask('devicePrefs:load'), save: ask('devicePrefs:save') },
  rowMenu: ask('row-menu'),
  capture: { thumbnail: ask('capture:thumbnail'), evict: ask('nav:evictThumbs') },
  // Persists one key; the tree surfaces current values, so there's no get.
  personalization: {
    set: <K extends keyof Personalization>(
      key: K,
      value: Personalization[K],
    ): Promise<Result<null>> => ipcRenderer.invoke('personalization:set', key, value),
  },
  listTrash: ask('trash:list'),
  trashMenu: ask('trash:menu'),
  trashColumnMenu: ask('trash:columnMenu'),
  deleteFacts: ask('delete:facts'),
  reportTrash: ask('trash:report'),
  mutate: ask('mutate'),
  contextMenu: ask('context-menu'),
  setEditorFormatState: tell('editor:format-state'),
  // A native app-region never delivers hover, so hover-bearing chrome (the tab bar) drives
  // its own move via per-pointermove screen deltas.
  winDragBy: tell('win:dragBy'),
  winZoom: tell('win:zoom'),
  popCreateMenu: ask('create-menu'),
  showError: ask('error:show'),
  openExternal: ask('link:open'),
  linkTitles: { get: ask('linkTitles:get'), fetch: ask('linkTitles:fetch') },
  systemAccent: ask('theme:systemAccent'),
  iconMenu: ask('nexus:iconMenu'),
  pickFile: ask('nexus:pickFile'),
  adoptFile: ask('assets:adopt'),
  pasteImage: ask('nexus:pasteImage'),
  bannerMenu: ask('nexus:bannerMenu'),
  titleMenu: ask('nexus:titleMenu'),
  tableMenu: ask('table-menu'),
  gripMenu: ask('grip-menu'),
  columnMenu: ask('column-menu'),
  cellMenu: ask('cell-menu'),
  writeClipboard: ask('clipboard:write'),
  readClipboard: ask('clipboard:read'),
  revealPath: ask('path:reveal'),
  assetMap: ask('assets:map'),
  chooseAssetDir: ask('assets:chooseDir'),
  setAssetDir: ask('assets:setDir'),
  setExclusions: ask('exclusions:set'),
  chooseExclusion: ask('exclusions:choose'),
  clearExclusions: ask('exclusions:clear'),
  countExclusions: ask('exclusions:count'),
  pageActionsMenu: ask('page-actions-menu'),
  cardMenu: ask('card-menu'),
  tabMenu: ask('tab-menu'),
  navRowMenu: ask('nav-row-menu'),
  connMenu: ask('conn-menu'),
  citationMenu: ask('citation-menu'),
  // Delete confirms in main first.
  propertyMenu: ask('property-menu'),
  optionMenu: ask('option-menu'),
  setGripHot: tell('editor:grip-hot'),
  wheelGuest: tell('web:wheel'),
  renameNexus: ask('nexus:rename'),
  onMenuAction: on('menu:action'),
  onBeginRename: on('begin-rename'),
  // The picker anchors to a row only the renderer can find.
  onBeginIcon: on('begin-icon'),
  onNewPageAdjacent: on('new-page-adjacent'),
  // Runs renderer-side because main can't know the tab set.
  onOpenInNewTab: on('open-in-new-tab'),
  onConfirmDelete: on('confirm-delete'),
  onOpenInWindow: on('open-in-window'),
  onOpenHistory: on('open-history'),
  onNavChanged: on('nav:changed'),
  onAssetsChanged: on('assets:changed'),
  onNexusChanged: on('nexus:changed'),
  onValuesChanged: on('values:changed'),
  onWebPopup: on('web:popup'),
}

contextBridge.exposeInMainWorld('nexus', api)

export type NexusApi = typeof api
