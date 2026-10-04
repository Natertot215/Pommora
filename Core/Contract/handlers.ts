import type { Asks, Pushes } from './bridge'
import { BUSY, NO_NEXUS } from './result'
import { adopting, sessionRoot } from '../Nexus/session'
import { settleNow } from '../Nexus/settle'
import type { EditorMenuRequest } from '../Actions/editorMenu'
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
  menu(req: MenuRequest): Promise<string | null>
  editorMenu(req: EditorMenuRequest): Promise<string | null>
  thumbnails: {
    capture(
      root: string,
      nexusId: string,
      navKey: string,
      rect: ThumbRect,
      scaleFactor: number,
    ): Promise<string | null>
    evict(root: string, nexusId: string, liveKeys: string[]): Promise<void>
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
  adopted(path: string): Promise<void>
  /** Starts the watch again, and once it listens, settles what it missed through `settleBatch`'s `missed`, which seeds the index a change of scope leaves to it. */
  watch(root: string): Promise<void>
  applyZoom(): Promise<void>
}

// What the window sends arrives unknown: the declared argument types shape the ask, and every handler narrows what it was handed before it acts.
export type Untrusted<A extends unknown[]> = { [I in keyof A]: unknown }

type Handler<K extends keyof Asks> = (
  ctx: HostContext,
  ...args: Untrusted<Asks[K]['args']>
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

/** The one session gate for a write: also refused while a Nexus switch is binding the new root. Whatever the handler wrote has applied as it landed; the gate settles it and pushes what moved before the reply leaves, so the reply finds the window current. */
export const withWriteRoot = <A extends unknown[], R>(fn: RootFn<A, R>) => {
  const gated = withRoot(
    async (root: string, ctx: HostContext, ...args: A): Promise<Awaited<R>> => {
      try {
        return await fn(root, ctx, ...args)
      } finally {
        await settleNow(ctx, root)
      }
    },
  )
  return (ctx: HostContext, ...args: A): Promise<Awaited<R>> | typeof NO_NEXUS | typeof BUSY =>
    adopting() ? BUSY : gated(ctx, ...args)
}
