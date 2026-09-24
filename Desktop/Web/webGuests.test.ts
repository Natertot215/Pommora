import { describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import { installWebGuests } from './webGuests'

type Answer = (granted: boolean) => void
type RequestHandler = (wc: unknown, permission: string, answer: Answer) => void
type CheckHandler = (wc: unknown, permission: string) => boolean

const { sessions, appOn } = vi.hoisted(() => {
  const fakeSession = () => ({
    request: null as RequestHandler | null,
    check: null as CheckHandler | null,
    setUserAgent: () => {},
    webRequest: { onBeforeSendHeaders: () => {} },
    setPermissionRequestHandler(fn: RequestHandler) {
      this.request = fn
    },
    setPermissionCheckHandler(fn: CheckHandler) {
      this.check = fn
    },
  })
  return {
    sessions: { web: fakeSession(), app: fakeSession() },
    appOn: new Map<string, (...args: unknown[]) => void>(),
  }
})

vi.mock('electron', () => ({
  app: {
    getName: () => 'Pommora',
    userAgentFallback: 'Mozilla/5.0 Chrome/140.0 Electron/42.4.0 Pommora/1.0',
    on: (event: string, fn: (...args: unknown[]) => void) => appOn.set(event, fn),
  },
  session: { fromPartition: () => sessions.web, defaultSession: sessions.app },
  webContents: { getAllWebContents: () => [] },
  BrowserWindow: { fromWebContents: () => null },
}))

installWebGuests({ webContents: { on: () => {} } } as unknown as BrowserWindow)

const asked = (s: typeof sessions.web, permission: string): boolean => {
  if (!s.request || !s.check) throw new Error('No permission handler is set.')
  let granted: boolean | null = null
  s.request({}, permission, (g) => {
    granted = g
  })
  return granted === true && s.check({}, permission)
}

describe('web guest permissions', () => {
  it('grants embedded sites fullscreen and sanitized clipboard writes, and nothing else', () => {
    expect(asked(sessions.web, 'fullscreen')).toBe(true)
    expect(asked(sessions.web, 'clipboard-sanitized-write')).toBe(true)
    for (const p of [
      'geolocation',
      'clipboard-read',
      'media',
      'notifications',
      'openExternal',
      'midi',
    ])
      expect(asked(sessions.web, p)).toBe(false)
  })

  it("denies every permission on the app's own session", () => {
    for (const p of ['fullscreen', 'clipboard-read', 'geolocation', 'notifications'])
      expect(asked(sessions.app, p)).toBe(false)
  })

  it('refuses a subframe navigation to a non-web scheme', () => {
    const on = new Map<string, (...args: unknown[]) => void>()
    const guest = {
      getType: () => 'webview',
      setWindowOpenHandler: () => {},
      on: (event: string, fn: (...args: unknown[]) => void) => on.set(event, fn),
      once: () => {},
    }
    appOn.get('web-contents-created')?.({}, guest)
    const refuse = (url: string, isMainFrame = false): boolean => {
      const preventDefault = vi.fn()
      on.get('will-frame-navigate')?.({ preventDefault, url, isMainFrame })
      return preventDefault.mock.calls.length > 0
    }
    expect(refuse('zoommtg://join?confno=1')).toBe(true)
    expect(refuse('file:///etc/hosts')).toBe(true)
    expect(refuse('https://example.com/embed')).toBe(false)
    expect(refuse('blob:https://example.com/0f3a')).toBe(false)
    expect(refuse('data:application/pdf;base64,JVBERi0=')).toBe(false)
    expect(refuse('data:text/html,<p>x</p>', true)).toBe(true)
  })
})
