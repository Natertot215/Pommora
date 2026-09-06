import { BrowserWindow, ipcMain } from 'electron'
import type { Asks, Pushes, Tells } from '@pommora/core/Contract/bridge'
import type { Handlers, HostContext } from '@pommora/core/Contract/handlers'
import { errText, fail } from '@pommora/core/Contract/result'

export type TellHandlers = {
  [K in keyof Tells]: (win: BrowserWindow | null, ...args: Tells[K]) => void
}

/** Every ask answers through the envelope: a throw comes back as `{ ok: false }`, never a rejection. */
export function serveIpc(
  handlers: Handlers,
  tells: TellHandlers,
  host: (win: BrowserWindow | null) => HostContext,
): void {
  for (const channel of Object.keys(handlers) as (keyof Asks)[]) {
    const handler = handlers[channel] as (ctx: HostContext, ...args: unknown[]) => unknown
    ipcMain.handle(channel, async (e, ...args) => {
      try {
        return await handler(host(BrowserWindow.fromWebContents(e.sender)), ...args)
      } catch (err) {
        return fail('operation-failed', errText(err))
      }
    })
  }
  for (const channel of Object.keys(tells) as (keyof Tells)[]) {
    const tell = tells[channel] as (win: BrowserWindow | null, ...args: unknown[]) => void
    ipcMain.on(channel, (e, ...args) => tell(BrowserWindow.fromWebContents(e.sender), ...args))
  }
}

export function push<K extends keyof Pushes>(
  win: BrowserWindow,
  channel: K,
  payload: Pushes[K],
): void {
  if (!win.isDestroyed()) win.webContents.send(channel, payload)
}
