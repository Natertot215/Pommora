import { BrowserWindow, ipcMain } from 'electron'
import type { Asks, Pushes, Tells } from '@shared/bridge'
import { errText, fail, ok, type Result } from '@shared/result'
import { readScope, writeKey, type Scope } from './db/localState'
import { invalidateLiveTree } from './liveTree'
import { writesSeen } from './io/writeEcho'

/** THE two session refusals — one spelling, one code, everywhere. A handler refuses through
 *  these or not at all. */
export const NO_NEXUS = fail('no-nexus', 'No nexus is open.')
export const BUSY = fail('busy', 'Nexus switching.')

type Args<K extends keyof Asks> = Asks[K]['args']
type Reply<K extends keyof Asks> = Asks[K]['reply']

/** One entry per ask channel — the `kind` is the boundary policy, declared beside the handler:
 *  `envelope` catches a throw into `{ok:false,error}`; `raw` lets it reject (the sentinel reads
 *  the renderer already catches); `menu` injects the sender's window and resolves null without
 *  one; `window` injects window-or-null and leaves the rest to the handler. */
export type AskEntry<K extends keyof Asks> =
  | { kind: 'envelope' | 'raw'; fn: (...args: Args<K>) => Reply<K> | Promise<Reply<K>> }
  | { kind: 'menu'; fn: (win: BrowserWindow, ...args: Args<K>) => Reply<K> | Promise<Reply<K>> }
  | {
      kind: 'window'
      fn: (win: BrowserWindow | null, ...args: Args<K>) => Reply<K> | Promise<Reply<K>>
    }

export type TellEntry<K extends keyof Tells> =
  | { kind: 'raw'; fn: (...args: Tells[K]) => void }
  | { kind: 'window'; fn: (win: BrowserWindow, ...args: Tells[K]) => void }

export type BridgeAsks = { [K in keyof Asks]: AskEntry<K> }
export type BridgeTells = { [K in keyof Tells]: TellEntry<K> }

/** Registers the whole ask + tell surface from the exhaustive handler objects — a declared
 *  channel with no handler, a handler with no channel, or a duplicate key is a compile error. */
export function serveBridge(asks: BridgeAsks, tells: BridgeTells): void {
  for (const channel of Object.keys(asks) as (keyof Asks)[]) {
    const entry = asks[channel] as AskEntry<keyof Asks>
    ipcMain.handle(channel, async (e, ...raw) => {
      // The wire hands back `any[]`; the map's tuple is the declared truth for this channel,
      // and the per-kind `fn` unions can't be correlated to it without the assertion.
      const args = raw as Args<keyof Asks>
      // A handler that wrote anything leaves the held tree stale; the check rides handler
      // COMPLETION because the writes are finished by the time an awaited handler returns —
      // an invalidation at write start would let a discarded walk's immediate re-run install
      // mid-write disk as canon.
      const writesBefore = writesSeen()
      try {
        switch (entry.kind) {
          case 'raw':
            return await entry.fn(...args)
          case 'envelope':
            try {
              return await entry.fn(...args)
            } catch (err) {
              return fail('operation-failed', errText(err))
            }
          case 'menu': {
            const win = BrowserWindow.fromWebContents(e.sender)
            return win ? await entry.fn(win, ...args) : null
          }
          case 'window':
            return await entry.fn(BrowserWindow.fromWebContents(e.sender), ...args)
        }
      } finally {
        if (writesSeen() !== writesBefore) invalidateLiveTree()
      }
    })
  }
  for (const channel of Object.keys(tells) as (keyof Tells)[]) {
    const entry = tells[channel] as TellEntry<keyof Tells>
    ipcMain.on(channel, (e, ...raw) => {
      const args = raw as Tells[keyof Tells]
      if (entry.kind === 'raw') return entry.fn(...args)
      const win = BrowserWindow.fromWebContents(e.sender)
      if (win) entry.fn(win, ...args)
    })
  }
}

/** The typed sending half of a push — the map declares the payload, every sender speaks it. */
export function push<K extends keyof Pushes>(
  win: BrowserWindow,
  channel: K,
  payload: Pushes[K],
): void {
  if (!win.isDestroyed()) win.webContents.send(channel, payload)
}

/** An emptied value — no fold keys, no manual order, an unset pointer — deletes its key rather
 *  than persisting an empty container, matching the properties map and contexts. */
const isEmptyValue = (v: unknown): boolean =>
  v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 0)

/** The per-machine scope pair's handlers. The store is app-owned, so the only validation is
 *  here at the boundary, where the renderer's payload is still untrusted — one guard ladder
 *  and one emptiness rule for all four scopes. */
export function scopeGet<T>(scope: Scope): () => Record<string, T> {
  // Self-wrapped like nexus:state — raw channels have no envelope net, and a scope that can't be
  // read (corrupt db, missing table, gone volume) degrades to its empty default, never a rejection.
  return () => {
    try {
      return readScope<T>(scope)
    } catch {
      return {}
    }
  }
}

export function scopeSet<T>(
  scope: Scope,
  valid: (v: unknown) => v is T,
  expected: string,
): (key: string, value: T) => Result<null> {
  return (key, value) => {
    if (typeof key !== 'string') return fail('operation-failed', 'A key is required.')
    if (!valid(value)) return fail('operation-failed', expected)
    if (!writeKey(scope, key, isEmptyValue(value) ? null : value)) return NO_NEXUS
    return ok(null)
  }
}
