import type { AssetMap, NexusChange, NexusState, ValueChange } from '../Nexus/tree'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
import type { Result } from './result'
import type { EditorMenuRequest } from '../Actions/editorMenu'
import type { KeyPress, MenuCommand } from '../Actions/commands'
import type { RemovedView, SavedView, ViewPatch } from '../Views/views'
import type { BodyWrite, PageDetail } from '../Pages/pageDetail'
import type { TrashMode, TrashRow } from '../Trash/trashRow'
import type { ClearReport } from '../Settings/exclusionScan'
import type { NavigationState, StoredTabSet } from '../Navigation/navRef'
import type { MatrixConfig, MatrixPatch } from '../Matrix/matrixConfig'
import type { MatrixGraphReply } from '../Matrix/matrixGraph'
import type { LayoutPatch, MatrixLayout } from '../Matrix/matrixLayout'
import type { WindowsFile } from '../Interface/Windows/windowRecord'
import type { ThumbRect } from '../Interface/chrome'
import type { PageValues } from '../Views/viewRow'
import type { ContainerConfigPatch } from '../Views/containerConfig'
import type { ContainerKind } from '../Nexus/entities'
import type { OptionEdit } from '../Properties/optionModel'
import type { PropertyDeletion } from '../Properties/deleteProperty'
import type { SchemaCascade, SchemaJournal } from '../Properties/propertyJournal'
import type { PropertyRename } from '../Properties/registryProperty'
import type { Personalization } from '../Settings/personalization'
import type {
  Landed,
  RemovedTile,
  TileDoc,
  TileDocPatch,
  TileHostRef,
  TilePick,
} from '../Tiles/tiles'
import type {
  FileConfig,
  LinkConfig,
  NumberConfig,
  PropertyDefinition,
} from '../Properties/properties'
import type { MenuRequest } from '../Actions/menuModel'
import type { DevicePrefs } from '../Settings/devicePrefs'
import type { SyncState, SyncStatus } from '../Sync/Contract/wire'

export type HostPlatform = 'windows' | 'posix'

export interface EditorPrefs {
  folds: string[]
  embedHeights: Record<string, number>
  embedZooms: Record<string, number>
  headingCols: number[]
}

export type EditorPrefWrite = {
  [S in keyof EditorPrefs]: [scope: S, value: EditorPrefs[S]]
}[keyof EditorPrefs]

/** `dir` is nexus-relative; a folder gone missing opens at the root rather than refusing. */
interface PickFileOptions {
  dir?: string
  any?: boolean
}

/** `args` labels become the derived dialer's parameter names. */
export interface Asks {
  'nexus:state': { args: []; reply: Result<NexusState> }
  'nexus:choose': { args: []; reply: Result<boolean> }
  'nexus:openPath': { args: [path: string]; reply: Result<boolean> }
  'nexus:rename': { args: [newName: string]; reply: Result<null> }
  'index:headings': { args: [paths?: string[]]; reply: Result<Record<string, string[]>> }
  'clipboard:write': { args: [text: string]; reply: Result<null> }
  // A chord matched on keydown has no `clipboardData` of its own; read is its door to a paste.
  'clipboard:read': { args: []; reply: Result<string> }
  'path:reveal': { args: [nexusRelativePath: string]; reply: Result<null> }
  'assets:map': { args: []; reply: Result<AssetMap> }
  // `null` is a cancelled dialog, not a failure.
  'assets:chooseDir': {
    args: [scope?: 'nexus' | 'property', at?: string]
    reply: Result<string | null>
  }
  'assets:setDir': { args: [dir: string]; reply: Result<string> }
  'exclusions:set': { args: [folders: string[]]; reply: Result<string[]> }
  'exclusions:choose': { args: []; reply: Result<string | null> }
  'exclusions:clear': { args: []; reply: Result<ClearReport | null> }

  'page:open': { args: [relPath: string]; reply: Result<PageDetail> }
  'page:updateBody': {
    args: [relPath: string, body: string, baseHash: string]
    reply: Result<BodyWrite>
  }

  'history:list': { args: [pageId: string]; reply: Result<number[]> }
  'history:read': { args: [pageId: string, ts: number]; reply: Result<string> }
  'history:restore': { args: [pageId: string, ts: number]; reply: Result<{ path: string }> }
  'history:delete': { args: [pageId: string, ts: number[]]; reply: Result<number> }
  'history:clear': { args: []; reply: Result<number> }

  'editorPrefs:get': { args: [pageId: string]; reply: Result<EditorPrefs> }
  'editorPrefs:set': { args: [pageId: string, ...write: EditorPrefWrite]; reply: Result<null> }
  'citations:get': { args: []; reply: Result<Record<string, boolean>> }
  'citations:set': { args: [pageId: string, shown: boolean | null]; reply: Result<null> }

  'views:save': {
    args: [containerPath: string, kind: ContainerKind, base: SavedView, patch: ViewPatch]
    reply: Result<{ id: string }>
  }
  'views:duplicate': {
    args: [containerPath: string, kind: ContainerKind, viewId: string]
    reply: Result<null>
  }
  'views:reorder': {
    args: [containerPath: string, kind: ContainerKind, orderedIds: string[]]
    reply: Result<null>
  }
  'views:delete': {
    args: [containerPath: string, kind: ContainerKind, viewId: string]
    reply: Result<RemovedView>
  }
  'views:restore': {
    args: [containerPath: string, kind: ContainerKind, removed: RemovedView]
    reply: Result<null>
  }
  'container:configure': {
    args: [containerPath: string, kind: ContainerKind, patch: ContainerConfigPatch]
    reply: Result<null>
  }
  'view:loadValues': {
    args: [containerPath: string, pageIds?: string[]]
    reply: Result<Record<string, PageValues>>
  }

  'schema:add': {
    args: [containerPath: string, def: PropertyDefinition]
    reply: Result<{ id: string }>
  }
  'schema:reorder': {
    args: [containerPath: string, propertyId: string, toIndex: number]
    reply: Result<null>
  }
  'schema:unassign': { args: [containerPath: string, propertyId: string]; reply: Result<null> }
  'schema:assign': {
    args: [containerPath: string, propertyId: string, toIndex?: number]
    reply: Result<null>
  }
  'registry:reorder': { args: [propertyId: string, toIndex: number]; reply: Result<null> }
  'property:rename': {
    args: [propertyId: string, name: string]
    reply: Result<PropertyRename | null>
  }
  'property:delete': { args: [propertyId: string]; reply: Result<PropertyDeletion> }
  'property:replay': { args: [record: SchemaJournal]; reply: Result<null> }
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
  'property:setFileDirectory': {
    args: [propertyId: string, patch: FileConfig]
    reply: Result<null>
  }
  'property:editOption': { args: [propertyId: string, edit: OptionEdit]; reply: Result<null> }
  'property:renameOption': {
    args: [propertyId: string, oldValue: string, newTitle: string]
    reply: Result<SchemaCascade>
  }
  'property:removeOption': {
    args: [propertyId: string, value: string]
    reply: Result<SchemaCascade>
  }
  'property:clearOption': { args: [propertyId: string, value: string]; reply: Result<null> }

  'tiles:get': { args: [host: TileHostRef]; reply: Result<TileDoc> }
  'tiles:save': { args: [host: TileHostRef, patch: TileDocPatch]; reply: Result<Landed> }
  'tiles:createMarkdown': { args: [host: TileHostRef]; reply: Result<Landed<{ id: string }>> }
  'tiles:removeTile': {
    args: [host: TileHostRef, tileId: string]
    reply: Result<Landed<{ removed: RemovedTile }>>
  }
  'tiles:restoreTile': { args: [host: TileHostRef, removed: RemovedTile]; reply: Result<Landed> }
  'tiles:readMarkdown': {
    args: [host: TileHostRef, tileId: string]
    reply: Result<{ body: string; hash: string }>
  }
  'tiles:writeMarkdown': {
    args: [host: TileHostRef, tileId: string, body: string, baseHash: string]
    reply: Result<BodyWrite>
  }
  'tiles:convert': {
    args: [host: TileHostRef, tileId: string, pick: TilePick]
    reply: Result<Landed>
  }
  'tiles:duplicateTile': {
    args: [host: TileHostRef, tileId: string]
    reply: Result<Landed<{ id: string }>>
  }

  'personalization:set': {
    args: [key: keyof Personalization, value: Personalization[keyof Personalization]]
    reply: Result<null>
  }
  'host:platform': { args: []; reply: Result<HostPlatform> }

  'nav:read': { args: []; reply: Result<NavigationState> }
  'nav:write': { args: [patch: Partial<NavigationState>]; reply: Result<null> }
  'matrix:read': { args: []; reply: Result<MatrixConfig> }
  'matrix:write': { args: [patch: MatrixPatch]; reply: Result<null> }
  'matrix:graph': { args: [paths?: string[]]; reply: Result<MatrixGraphReply> }
  'matrixLayout:load': { args: []; reply: Result<MatrixLayout> }
  'matrixLayout:save': { args: [patch: LayoutPatch]; reply: Result<null> }
  'tabs:load': { args: []; reply: Result<StoredTabSet | null> }
  'tabs:save': { args: [set: StoredTabSet]; reply: Result<null> }
  'windows:load': { args: []; reply: Result<WindowsFile> }
  'windows:save': { args: [file: WindowsFile]; reply: Result<null> }
  'devicePrefs:load': { args: []; reply: Result<DevicePrefs> }
  'devicePrefs:save': { args: [prefs: DevicePrefs]; reply: Result<null> }
  'sync:state': { args: []; reply: Result<SyncState> }
  'sync:renameDevice': { args: [name: string]; reply: Result<SyncState> }
  'sync:connect': {
    args: [address: string, password?: string, pin?: string]
    reply: Result<SyncState>
  }
  'sync:disconnect': { args: []; reply: Result<SyncState> }
  'sync:approve': { args: [deviceId: string]; reply: Result<SyncState> }
  'sync:revoke': { args: [deviceId: string]; reply: Result<SyncState> }
  'sync:now': { args: []; reply: Result<SyncState> }
  'sync:captureLocal': { args: [relPath: string, text: string]; reply: Result<null> }

  'capture:thumbnail': {
    args: [navKey: string, rect: ThumbRect, scaleFactor: number]
    reply: Result<{ url: string }>
  }
  'nav:evictThumbs': { args: [liveKeys: string[]]; reply: Result<null> }

  // `.trash` is outside the watcher, so the browser asks again after every action it takes.
  'trash:list': { args: []; reply: Result<TrashRow[]> }
  // Read at the moment of asking, never from the renderer's cache, so the confirmation can't promise the system trash while main erases outright.
  'delete:facts': { args: []; reply: Result<{ trashMode: TrashMode; permanentDelete: boolean }> }

  mutate: { args: [req: MutateRequest]; reply: MutateReply }
  'link:open': { args: [url: string]; reply: Result<null> }
  'webGuestZoom:set': { args: [guestId: number, factor: number]; reply: Result<null> }
  'webGuestMedia:pause': { args: [guestId: number]; reply: Result<null> }
  'linkTitles:get': { args: []; reply: Result<Record<string, string>> }
  'linkTitles:fetch': { args: [url: string]; reply: Result<{ title: string | null }> }

  'nexus:pickFile': { args: [opts?: PickFileOptions]; reply: Result<string | null> }
  'assets:adopt': { args: [source: string, subfolder?: string]; reply: Result<string> }
  'nexus:pasteImage': { args: []; reply: Result<string | null> }
  menu: { args: [req: MenuRequest]; reply: Result<string | null> }
  'editor:menu': { args: [req: EditorMenuRequest]; reply: Result<string | null> }
}

export interface Tells {
  'win:dragBy': [dx: number, dy: number]
  'win:zoom': []
  'win:resend': []
  // The quit handshake's answer: every save the window owed has landed.
  'app:flushed': []
  // Handed to the guest a host-owned pointer covers — the only way it can still scroll beneath it.
  'web:wheel': [guestId: number, x: number, y: number, deltaX: number, deltaY: number]
}

export interface Pushes {
  'menu:action': MenuCommand | 'open'
  // Open Recent routed through the window, so its pending saves land before the root flips.
  'nexus:openRecent': string
  'app:flush': null
  'nav:changed': Omit<NavigationState, 'recents'>
  'matrix:changed': MatrixConfig
  'assets:changed': AssetMap
  'nexus:changed': NexusChange
  'values:changed': ValueChange[]
  'tiles:changed': TileHostRef
  'pages:changed': string[]
  'sync:changed': SyncStatus
  'win:fullscreen': boolean
  'theme:systemAccent': string | null
  // A guest's window.open, denied main-side so popups route through the one link adjudicator.
  'web:popup': string
  'web:key': KeyPress
}
