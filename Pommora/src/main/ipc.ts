import { BrowserWindow, ipcMain } from 'electron'
import type { Asks, Pushes, Tells } from '@shared/bridge'
import { errText, fail, ok, type Result } from '@shared/result'
import { readScope, writeKey, type Scope } from './db/localState'

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
    ipcMain.handle(channel, async (e, ...args) => {
      switch (entry.kind) {
        case 'raw':
          return entry.fn(...(args as Args<keyof Asks>))
        case 'envelope':
          try {
            return await entry.fn(...(args as Args<keyof Asks>))
          } catch (err) {
            return fail('operation-failed', errText(err))
          }
        case 'menu': {
          const win = BrowserWindow.fromWebContents(e.sender)
          return win ? entry.fn(win, ...(args as Args<keyof Asks>)) : null
        }
        case 'window':
          return entry.fn(BrowserWindow.fromWebContents(e.sender), ...(args as Args<keyof Asks>))
      }
    })
  }
  for (const channel of Object.keys(tells) as (keyof Tells)[]) {
    const entry = tells[channel] as TellEntry<keyof Tells>
    ipcMain.on(channel, (e, ...args) => {
      if (entry.kind === 'raw') return entry.fn(...(args as Tells[keyof Tells]))
      const win = BrowserWindow.fromWebContents(e.sender)
      if (win) entry.fn(win, ...(args as Tells[keyof Tells]))
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
const isEmptyValue = (v: unknown): boolean => v === '' || (Array.isArray(v) && v.length === 0)

/** The per-machine scope pair's handlers. The store is app-owned, so the only validation is
 *  here at the boundary, where the renderer's payload is still untrusted — one guard ladder
 *  and one emptiness rule for all four scopes. */
export function scopeGet<T>(scope: Scope): () => Record<string, T> {
  return () => readScope<T>(scope)
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

