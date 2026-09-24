import { BrowserWindow, ipcMain } from 'electron'
import type { Asks, Pushes, Tells } from '@pommora/core/Contract/bridge'
import type { Handlers, HostContext } from '@pommora/core/Contract/handlers'
import { errText, fail } from '@pommora/core/Contract/result'

export type TellHandlers = {
  [K in keyof Tells]: (win: BrowserWindow | null, ...args: Tells[K]) => void
}

const running = new Set<Promise<unknown>>()

/** Settles once every ask already received has answered: quit waits here, since a write can still be short of its lock. */
export const settleAsks = (): Promise<void> => Promise.all(running).then(() => undefined)

/** Every ask answers through the envelope: a throw comes back as `{ ok: false }`, never a rejection. */
export function serveIpc(
  handlers: Handlers,
  tells: TellHandlers,
  host: (win: BrowserWindow | null) => HostContext,
): void {
  for (const channel of Object.keys(handlers) as (keyof Asks)[]) {
    const handler = handlers[channel] as (ctx: HostContext, ...args: unknown[]) => unknown
    ipcMain.handle(channel, (e, ...args) => {
      const reply = (async () => {
        try {
          return await handler(host(BrowserWindow.fromWebContents(e.sender)), ...args)
        } catch (err) {
          return fail('operation-failed', errText(err))
        }
      })()
      running.add(reply)
      void reply.finally(() => running.delete(reply))
      return reply
    })
  }
  for (const channel of Object.keys(tells) as (keyof Tells)[]) {
    const tell = tells[channel] as (win: BrowserWindow | null, ...args: unknown[]) => void
    ipcMain.on(channel, (e, ...args) => tell(BrowserWindow.fromWebContents(e.sender), ...args))
  }
}

/** The window live now, read at each use: a captured one goes dead when macOS closes it and the Dock reopens another. */
export type CurrentWindow = () => BrowserWindow | null

export function push<K extends keyof Pushes>(
  win: BrowserWindow | CurrentWindow,
  channel: K,
  payload: Pushes[K],
): void {
  const w = typeof win === 'function' ? win() : win
  if (w && !w.isDestroyed()) w.webContents.send(channel, payload)
}
