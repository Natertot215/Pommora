import { BrowserWindow, ipcMain } from 'electron'
import type { Asks, Pushes, Tells } from '@pommora/core/Contract/bridge'
import { errText, fail, NO_NEXUS, ok, type Result } from '@pommora/core/Contract/result'
import { readScope, writeKey, type Scope } from '@pommora/core/Platform/localState'

type Args<K extends keyof Asks> = Asks[K]['args']
type Reply<K extends keyof Asks> = Asks[K]['reply']

/** One entry per ask channel — `kind` is the boundary policy, declared beside the handler:
 *  `envelope` catches a throw into `{ok:false,error}`; `raw` lets it reject; `menu` injects the
 *  sender's window and resolves null without one; `window` injects window-or-null. */
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

export function serveBridge(asks: BridgeAsks, tells: BridgeTells): void {
  for (const channel of Object.keys(asks) as (keyof Asks)[]) {
    const entry = asks[channel] as AskEntry<keyof Asks>
    ipcMain.handle(channel, async (e, ...raw) => {
      // The wire hands back `any[]`; the per-kind `fn` unions can't be correlated to the
      // channel's declared tuple without the assertion.
      const args = raw as Args<keyof Asks>
      switch (entry.kind) {
        case 'raw':
          return entry.fn(...args)
        case 'envelope':
          try {
            return await entry.fn(...args)
          } catch (err) {
            return fail('operation-failed', errText(err))
          }
        case 'menu': {
          const win = BrowserWindow.fromWebContents(e.sender)
          return win ? entry.fn(win, ...args) : null
        }
        case 'window':
          return entry.fn(BrowserWindow.fromWebContents(e.sender), ...args)
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

export function push<K extends keyof Pushes>(
  win: BrowserWindow,
  channel: K,
  payload: Pushes[K],
): void {
  if (!win.isDestroyed()) win.webContents.send(channel, payload)
}

const isEmptyValue = (v: unknown): boolean =>
  v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 0)

export function scopeGet<T>(scope: Scope): () => Record<string, T> {
  // Self-wrapped like nexus:state — raw channels have no envelope net, so a scope that can't be
  // read degrades to its empty default, never a rejection.
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
