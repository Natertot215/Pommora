import { BrowserWindow, ipcMain } from 'electron'
import { errText, type Ack } from '@shared/result'
import { readScope, writeKey, type Scope } from './db/localState'

/** Registers a handler that needs the sender's window — a native menu has nothing to hang off
 *  without one, so a senderless invoke resolves null instead of reaching the popup. */
export function handleWindowMenu<A extends unknown[], T>(
  channel: string,
  fn: (win: BrowserWindow, ...args: A) => T | Promise<T>,
): void {
  ipcMain.handle(channel, async (e, ...args): Promise<T | null> => {
    const win = BrowserWindow.fromWebContents(e.sender)
    return win ? await fn(win, ...(args as A)) : null
  })
}

/** Registers an envelope handler. The boundary must never reject into the renderer, so a
 *  throw out of the body lands as `{ ok: false, error }` here rather than in each handler. */
export function handleEnvelope<A extends unknown[], T extends { ok: true } | Ack>(
  channel: string,
  fn: (...args: A) => T | Promise<T>,
): void {
  ipcMain.handle(channel, async (_e, ...args): Promise<T | Ack> => {
    try {
      return await fn(...(args as A))
    } catch (e) {
      return { ok: false, error: errText(e) }
    }
  })
}

/** An emptied value — no fold keys, no manual order, an unset pointer — deletes its key rather
 *  than persisting an empty container, matching the properties map and contexts. */
const isEmptyValue = (v: unknown): boolean => v === '' || (Array.isArray(v) && v.length === 0)

/** The store is app-owned, so the only validation is here at the boundary, where the renderer's
 *  payload is still untrusted. */
export function handleLocalScope<T>(
  channel: string,
  scope: Scope,
  valid: (v: unknown) => v is T,
  expected: string,
): void {
  ipcMain.handle(`${channel}:get`, (): Record<string, T> => readScope<T>(scope))
  handleEnvelope(`${channel}:set`, (key: unknown, value: unknown): Ack => {
    if (typeof key !== 'string') return { ok: false, error: 'A key is required.' }
    if (!valid(value)) return { ok: false, error: expected }
    if (!writeKey(scope, key, isEmptyValue(value) ? null : value))
      return { ok: false, error: 'No nexus is open.' }
    return { ok: true }
  })
}
