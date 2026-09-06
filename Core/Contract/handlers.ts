import type { Asks, Pushes } from './bridge'
import type { ThumbRect } from '../Interface/chrome'
import type { MutateDeps } from '../Nexus/mutate'
import type { ContextTarget, MutateRequest } from '../Pages/mutateRequest'
import type { TrashMode } from '../Trash/trashRow'

export type PickKind = 'file' | 'folder' | 'image' | 'exclusion'

export interface PickOptions {
  defaultPath?: string
  message?: string
}

export type MenuChannel =
  | 'history:menu'
  | 'create-menu'
  | 'view-button-menu'
  | 'view-row-menu'
  | 'view-embed-title-menu'
  | 'view-embed-area-menu'
  | 'icon-favorite-menu'
  | 'nexus:iconMenu'
  | 'nexus:bannerMenu'
  | 'nexus:titleMenu'
  | 'table-menu'
  | 'grip-menu'
  | 'column-menu'
  | 'cell-menu'
  | 'page-actions-menu'
  | 'card-menu'
  | 'trash:menu'
  | 'trash:columnMenu'
  | 'tab-menu'
  | 'nav-row-menu'
  | 'conn-menu'
  | 'citation-menu'
  | 'property-menu'
  | 'option-menu'
  | 'row-menu'

/** What a host does that the engine cannot: reach the renderer, the user's dialogs and menus, the
 *  system, and the surfaces only that host draws. Every path handed in is forward-slash. */
export interface HostContext {
  push<K extends keyof Pushes>(k: K, payload: Pushes[K]): void
  pick(kind: PickKind, opts?: PickOptions): Promise<string | null>
  pasteImage(): Promise<string | null>
  clipboard: { read(): Promise<string>; write(text: string): Promise<void> }
  reveal(absPath: string): void
  openExternal(url: string): Promise<void>
  message(type: 'error' | 'info', message: string, detail: string): Promise<void>
  systemAccent(): string | null
  menu<K extends MenuChannel>(k: K, ...args: Asks[K]['args']): Promise<Asks[K]['reply']>
  contextMenu(
    target: ContextTarget,
    deps: MutateDeps,
    onChanged: (req: MutateRequest, reply: { created?: { id: string; path: string } }) => void,
  ): Promise<void>
  thumbnails: {
    capture(
      root: string,
      navKey: string,
      rect: ThumbRect,
      scaleFactor: number,
    ): Promise<string | null>
    evict(root: string, liveKeys: string[]): Promise<void>
  }
  webGuests: { setZoom(guestId: number, factor: number): void; pauseMedia(guestId: number): void }
  trashMode(): Promise<TrashMode>
  fetchTitle(url: string): Promise<string | null>
  openStores(root: string): void
  adopted(root: string, path: string): Promise<void>
  watch(root: string): Promise<void>
  applyZoom(): Promise<void>
}

export type Handler<K extends keyof Asks> = (
  ctx: HostContext,
  ...args: Asks[K]['args']
) => Asks[K]['reply'] | Promise<Asks[K]['reply']>

export type Handlers = { [K in keyof Asks]: Handler<K> }
