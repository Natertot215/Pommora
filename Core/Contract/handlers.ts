import type { Asks, Pushes } from './bridge'
import { BUSY, NO_NEXUS } from './result'
import { adopting, sessionRoot } from '../Nexus/session'
import type { MenuRequest } from '../Actions/menuModel'
import type { ThumbRect } from '../Interface/chrome'
import type { TrashMode } from '../Trash/trashRow'
import type { SyncDevice } from '../Sync/Contract/wire'

export type PickKind = 'file' | 'folder' | 'image' | 'exclusion'

interface PickOptions {
  defaultPath?: string
  message?: string
}

// The host holds the private key: signing and renaming are its acts, and Core sees only the result.
export interface HostDevice extends SyncDevice {
  x25519: string
  sign(canonical: string): Promise<string>
  agree(peerPublicKey: string): Promise<Uint8Array>
  rename(name: string): Promise<void>
}

export interface TransportRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: string | Uint8Array
  timeoutMs?: number
  /** A `fingerprint256` in Node's colon-hex form; present means the certificate is pinned to it. */
  pin?: string
}

export interface TransportReply {
  status: number
  body: string
  bytes: Uint8Array
}

/** What a host does that the engine cannot. Every path handed in is forward-slash. */
export interface HostContext {
  push<K extends keyof Pushes>(k: K, payload: Pushes[K]): void
  pick(kind: PickKind, opts?: PickOptions): Promise<string | null>
  pasteImage(): Promise<string | null>
  clipboard: { read(): Promise<string>; write(text: string): Promise<void> }
  reveal(absPath: string): void
  openExternal(url: string): Promise<void>
  message(type: 'error' | 'info', message: string, detail: string): Promise<void>
  systemAccent(): string | null
  menu(req: MenuRequest): Promise<string | null>
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
  device: HostDevice | null
  secrets: {
    get(name: string): Promise<string | null>
    set(name: string, value: string | null): Promise<void>
  }
  transport(req: TransportRequest): Promise<TransportReply>
  openStores(root: string, nexusId: string | null): void
  adopted(root: string, path: string): Promise<void>
  watch(root: string): Promise<void>
  applyZoom(): Promise<void>
}

type Handler<K extends keyof Asks> = (
  ctx: HostContext,
  ...args: Asks[K]['args']
) => Asks[K]['reply'] | Promise<Asks[K]['reply']>

export type Handlers = { [K in keyof Asks]: Handler<K> }

type RootFn<A extends unknown[], R> = (root: string, ctx: HostContext, ...args: A) => R

/** The one session gate for a read: refused with no Nexus open, or answered `whenClosed` by a read whose empty answer is deliberate. */
export const withRoot =
  <A extends unknown[], R, C = typeof NO_NEXUS>(fn: RootFn<A, R>, whenClosed?: C) =>
  (ctx: HostContext, ...args: A): R | C => {
    const root = sessionRoot()
    return root === null ? ((whenClosed ?? NO_NEXUS) as C) : fn(root, ctx, ...args)
  }

/** The one session gate for a write: also refused while a Nexus switch is binding the new root. */
export const withWriteRoot = <A extends unknown[], R>(fn: RootFn<A, R>) => {
  const gated = withRoot(fn)
  return (ctx: HostContext, ...args: A): R | typeof NO_NEXUS | typeof BUSY =>
    adopting() ? BUSY : gated(ctx, ...args)
}
