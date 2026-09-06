import type { Asks, Pushes } from './bridge'
import { NO_NEXUS } from './result'
import { sessionRoot } from '../Nexus/session'
import type { RowMenuRequest } from '../Actions/menuModel'
import type { ThumbRect } from '../Interface/chrome'
import type { TrashMode } from '../Trash/trashRow'

export type PickKind = 'file' | 'folder' | 'image' | 'exclusion'

interface PickOptions {
  defaultPath?: string
  message?: string
}

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
  /** A host without a native popper answers with the in-app presenter. */
  menu(req: RowMenuRequest): Promise<string | null>
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

/** The no-nexus refusal every rooted handler shares: the session root or the one refusal. */
export const withRoot =
  <A extends unknown[], R>(fn: (root: string, ctx: HostContext, ...args: A) => R) =>
  (ctx: HostContext, ...args: A): R | typeof NO_NEXUS => {
    const root = sessionRoot()
    return root === null ? NO_NEXUS : fn(root, ctx, ...args)
  }
