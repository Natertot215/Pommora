import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import type { Handlers, HostContext } from '@pommora/core/Contract/handlers'
import { fail, ok, type Result } from '@pommora/core/Contract/result'
import { serveIpc } from './ipc'

const { handleReg, onReg } = vi.hoisted(() => ({
  handleReg: new Map<string, (e: { sender: unknown }, ...args: unknown[]) => unknown>(),
  onReg: new Map<string, (e: { sender: unknown }, ...args: unknown[]) => void>(),
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (e: { sender: unknown }, ...args: unknown[]) => unknown) =>
      handleReg.set(channel, fn),
    on: (channel: string, fn: (e: { sender: unknown }, ...args: unknown[]) => void) =>
      onReg.set(channel, fn),
  },
  BrowserWindow: { fromWebContents: (wc: unknown) => wc },
}))

const host = (): HostContext => ({}) as HostContext
const senderWindow = { id: 7 } as unknown as BrowserWindow
const event = { sender: senderWindow }

beforeEach(() => {
  handleReg.clear()
  onReg.clear()
})

describe('serveIpc registers and answers through the envelope', () => {
  it('registers one handler per Ask and one listener per Tell', () => {
    const handlers = {
      'clipboard:read': async () => ok(''),
      'assets:map': async () => ok({ files: {}, version: 0 }),
    } as unknown as Handlers
    const tells = { 'nav:changed': () => {} } as never

    serveIpc(handlers, tells, host)

    expect([...handleReg.keys()]).toEqual(['clipboard:read', 'assets:map'])
    expect([...onReg.keys()]).toEqual(['nav:changed'])
  })

  it('a handler that throws answers { ok: false, error: { code: "operation-failed" } }', async () => {
    const handlers = {
      boom: () => {
        throw new Error('no')
      },
    } as unknown as Handlers
    serveIpc(handlers, {} as never, host)

    const answer = (await handleReg.get('boom')?.(event)) as Result<never>
    expect(answer).toEqual(fail('operation-failed', 'no'))
  })

  it('a handler that returns a Result passes it through untouched', async () => {
    const passed = fail('not-found', 'gone')
    const handlers = {
      keep: async () => passed,
    } as unknown as Handlers
    serveIpc(handlers, {} as never, host)

    expect(await handleReg.get('keep')?.(event)).toBe(passed)
  })

  it('a Tell reaches its handler with the sender window', () => {
    const heard = vi.fn()
    const tells = { 'nav:changed': heard } as never
    serveIpc({} as Handlers, tells, host)

    onReg.get('nav:changed')?.(event, { open: true })
    expect(heard).toHaveBeenCalledWith(senderWindow, { open: true })
  })
})
