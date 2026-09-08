import type { AssetMap, NexusState, NexusTree, ValueChange } from '../Nexus/tree'
import type { MutateReply, MutateRequest } from '../Pages/mutateRequest'
import type { Result } from './result'
import type { FormatState } from '../Actions/editorMenu'
import type { SavedView } from '../Views/views'
import type { PageDetail } from '../Pages/pageDetail'
import type { ClearReport, TrashMode, TrashRow } from '../Trash/trashRow'
import type { NavigationState } from '../Navigation/navRef'
import type { GlanceSize, StoredTabSet, WindowsFile } from '../Interface/Windows/windowRecord'
import type { NavViewModes, SubfieldConfig, ThumbRect } from '../Interface/chrome'
import type { OpenIn, PageValues, ViewButton } from '../Views/viewRow'
import type { Personalization } from '../Settings/personalization'
import type { TileDoc, TileDocPatch, TileHostRef, EmbeddedView } from '../Tiles/tiles'
import type {
  FileConfig,
  LinkConfig,
  NumberConfig,
  PropertyDefinition,
  StatusGroup,
} from '../Properties/properties'
import type { RowMenuRequest } from '../Actions/menuModel'
import type { DevicePrefs } from '../Settings/devicePrefs'

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
  'exclusions:count': { args: []; reply: Result<number> }

  'page:open': { args: [relPath: string]; reply: Result<PageDetail> }
  'page:updateBody': { args: [relPath: string, body: string]; reply: Result<null> }

  'history:list': { args: [pageId: string]; reply: Result<number[]> }
  'history:read': { args: [pageId: string, ts: number]; reply: Result<string> }
  'history:restore': { args: [pageId: string, ts: number]; reply: Result<{ path: string }> }
  'history:delete': { args: [pageId: string, ts: number[]]; reply: Result<number> }
  'history:clear': { args: []; reply: Result<number> }

  'folds:get': { args: []; reply: Result<Record<string, string[]>> }
  'folds:set': { args: [pageId: string, keys: string[]]; reply: Result<null> }
  'viewOrders:get': { args: []; reply: Result<Record<string, string[]>> }
  'viewOrders:set': { args: [viewId: string, order: string[]]; reply: Result<null> }
  'embedHeights:get': { args: []; reply: Result<Record<string, Record<string, number>>> }
  'embedHeights:set': {
    args: [pageId: string, heights: Record<string, number>]
    reply: Result<null>
  }
  'embedZooms:get': { args: []; reply: Result<Record<string, Record<string, number>>> }
  'embedZooms:set': {
    args: [pageId: string, zooms: Record<string, number>]
    reply: Result<null>
  }
  'tableHeadingCols:get': { args: []; reply: Result<Record<string, number[]>> }
  'tableHeadingCols:set': { args: [pageId: string, indices: number[]]; reply: Result<null> }
  'headingIcon:get': { args: []; reply: Result<Record<string, boolean>> }
  'headingIcon:set': { args: [pageId: string, hidden: boolean]; reply: Result<null> }
  'citations:get': { args: []; reply: Result<Record<string, boolean>> }
  'citations:set': { args: [pageId: string, shown: boolean | null]; reply: Result<null> }
  'aliases:get': { args: []; reply: Result<Record<string, string[]>> }
  'aliases:set': { args: [pageId: string, aliases: string[]]; reply: Result<null> }

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
      patch: { open_in?: OpenIn; view_button?: ViewButton },
    ]
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
  'property:setFileDirectory': {
    args: [propertyId: string, patch: FileConfig]
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

  'tiles:get': { args: [host: TileHostRef]; reply: Result<TileDoc> }
  'tiles:save': { args: [host: TileHostRef, patch: TileDocPatch]; reply: Result<null> }
  'tiles:createMarkdown': { args: [host: TileHostRef]; reply: Result<{ id: string }> }
  'tiles:removeTile': { args: [host: TileHostRef, tileId: string]; reply: Result<null> }
  'tiles:readMarkdown': {
    args: [host: TileHostRef, tileId: string]
    reply: Result<{ body: string }>
  }
  'tiles:writeMarkdown': {
    args: [host: TileHostRef, tileId: string, body: string]
    reply: Result<null>
  }
  'tiles:convertToPage': {
    args: [host: TileHostRef, tileId: string, pageId: string]
    reply: Result<null>
  }
  'tiles:convertToView': {
    args: [host: TileHostRef, tileId: string, views: EmbeddedView[]]
    reply: Result<null>
  }
  'tiles:duplicateTile': {
    args: [host: TileHostRef, tileId: string]
    reply: Result<{ id: string }>
  }

  'subfield:get': { args: []; reply: Result<SubfieldConfig | null> }
  'subfield:set': { args: [config: SubfieldConfig]; reply: Result<null> }
  'navViewModes:get': { args: []; reply: Result<NavViewModes | null> }
  'navViewModes:set': { args: [modes: NavViewModes]; reply: Result<null> }
  'personalization:set': {
    args: [key: keyof Personalization, value: Personalization[keyof Personalization]]
    reply: Result<null>
  }
  'theme:systemAccent': { args: []; reply: Result<string | null> }

  'nav:read': { args: []; reply: Result<NavigationState> }
  'nav:write': { args: [patch: Partial<NavigationState>]; reply: Result<null> }
  'tabs:load': { args: []; reply: Result<StoredTabSet | null> }
  'tabs:save': { args: [set: StoredTabSet]; reply: Result<null> }
  'windows:load': { args: []; reply: Result<WindowsFile> }
  'windows:save': { args: [file: WindowsFile]; reply: Result<null> }
  'glance:load': { args: []; reply: Result<GlanceSize | null> }
  'glance:save': { args: [size: GlanceSize]; reply: Result<null> }
  'devicePrefs:load': { args: []; reply: Result<DevicePrefs | null> }
  'devicePrefs:save': { args: [prefs: DevicePrefs]; reply: Result<null> }

  'capture:thumbnail': {
    args: [navKey: string, rect: ThumbRect, scaleFactor: number]
    reply: Result<{ url: string }>
  }
  'nav:evictThumbs': { args: [liveKeys: string[]]; reply: Result<null> }

  // `.trash` is outside the watcher, so the browser asks again after every action it takes.
  'trash:list': { args: []; reply: Result<TrashRow[]> }
  // Read at the moment of asking, never from the renderer's cache, so the confirmation can't promise the system trash while main erases outright.
  'delete:facts': { args: []; reply: Result<{ trashMode: TrashMode; permanentDelete: boolean }> }
  'trash:report': { args: [message: string, detail: string]; reply: Result<null> }

  mutate: { args: [req: MutateRequest]; reply: MutateReply }
  'error:show': { args: [message: string]; reply: Result<null> }
  'link:open': { args: [url: string]; reply: Result<null> }
  'webGuestZoom:set': { args: [guestId: number, factor: number]; reply: Result<null> }
  'webGuestMedia:pause': { args: [guestId: number]; reply: Result<null> }
  'linkTitles:get': { args: []; reply: Result<Record<string, string>> }
  'linkTitles:fetch': { args: [url: string]; reply: Result<{ title: string | null }> }

  'nexus:pickFile': { args: [opts?: PickFileOptions]; reply: Result<string | null> }
  'assets:adopt': { args: [source: string, subfolder?: string]; reply: Result<string> }
  'nexus:pasteImage': { args: []; reply: Result<string | null> }
  'row-menu': { args: [req: RowMenuRequest]; reply: Result<string | null> }
}

export interface Tells {
  'editor:format-state': [state: FormatState]
  'win:dragBy': [dx: number, dy: number]
  'win:zoom': []
  'editor:grip-hot': [on: boolean]
  // Handed to the guest a host-owned pointer covers — the only way it can still scroll beneath it.
  'web:wheel': [guestId: number, x: number, y: number, deltaX: number, deltaY: number]
}

export interface Pushes {
  'menu:action': string
  'nav:changed': Omit<NavigationState, 'recents'>
  'assets:changed': AssetMap
  'nexus:changed': NexusTree
  'values:changed': ValueChange[]
  'tiles:changed': TileHostRef
  // A guest's window.open, denied main-side so popups route through the one link adjudicator.
  'web:popup': string
}
