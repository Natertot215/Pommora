import { BrowserWindow, ipcMain } from 'electron'
import { errText, type Ack } from '@shared/result'

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
