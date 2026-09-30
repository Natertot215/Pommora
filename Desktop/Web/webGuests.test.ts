import { describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import { SETTING_DEFAULTS } from '@pommora/core/Settings/personalization'
import { installWebGuests, pauseGuestMedia, setGuestTileZoom, wheelGuest } from './webGuests'

type Answer = (granted: boolean) => void
type RequestHandler = (wc: unknown, permission: string, answer: Answer) => void
type CheckHandler = (wc: unknown, permission: string) => boolean

const { sessions, appOn, contents, pushed } = vi.hoisted(() => {
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
    contents: [] as { id: number }[],
    pushed: [] as unknown[][],
  }
})

vi.mock('electron', () => ({
  app: {
    getName: () => 'Pommora',
    userAgentFallback: 'Mozilla/5.0 Chrome/140.0 Electron/42.4.0 Pommora/1.0',
    on: (event: string, fn: (...args: unknown[]) => void) => appOn.set(event, fn),
  },
  session: { fromPartition: () => sessions.web, defaultSession: sessions.app },
  webContents: {
    getAllWebContents: () => contents,
    fromId: (id: number) => contents.find((wc) => wc.id === id),
  },
  BrowserWindow: { fromWebContents: (wc: unknown) => (wc ? 'host' : null) },
}))

vi.mock('../Bridge/ipc', () => ({ push: (...args: unknown[]) => pushed.push(args) }))

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
      isDestroyed: () => false,
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

describe('the guest channels', () => {
  const contentsOf = (id: number, type: string, destroyed = false) => ({
    id,
    getType: () => type,
    isDestroyed: () => destroyed,
    hostWebContents: { getZoomFactor: () => 2 },
    setZoomFactor: vi.fn(),
    sendInputEvent: vi.fn(),
    mainFrame: { framesInSubtree: [{ executeJavaScript: vi.fn(() => Promise.resolve()) }] },
  })
  const guest = contentsOf(7, 'webview')
  const app = contentsOf(1, 'window')
  const gone = contentsOf(9, 'webview', true)
  contents.push(guest, app, gone)

  it('reach a live guest', () => {
    setGuestTileZoom(7, 1.5)
    expect(guest.setZoomFactor).toHaveBeenLastCalledWith(2 * SETTING_DEFAULTS.webZoomFactor * 1.5)
    wheelGuest(7, 1, 2, 3, 4)
    expect(guest.sendInputEvent).toHaveBeenCalledTimes(1)
    pauseGuestMedia(7)
    expect(guest.mainFrame.framesInSubtree[0].executeJavaScript).toHaveBeenCalledTimes(1)
  })

  it("never reach the app's own contents or a destroyed guest", () => {
    for (const wc of [app, gone]) {
      setGuestTileZoom(wc.id, 2)
      wheelGuest(wc.id, 1, 2, 3, 4)
      pauseGuestMedia(wc.id)
      expect(wc.setZoomFactor).not.toHaveBeenCalled()
      expect(wc.sendInputEvent).not.toHaveBeenCalled()
      expect(wc.mainFrame.framesInSubtree[0].executeJavaScript).not.toHaveBeenCalled()
    }
  })
})

describe("a guest's keys", () => {
  const on = new Map<string, (...args: unknown[]) => void>()
  appOn.get('web-contents-created')?.(
    {},
    {
      getType: () => 'webview',
      isDestroyed: () => false,
      hostWebContents: {},
      setWindowOpenHandler: () => {},
      on: (event: string, fn: (...args: unknown[]) => void) => on.set(event, fn),
      once: () => {},
    },
  )
  const press = (key: string, mods: Record<string, boolean> = {}): boolean => {
    pushed.length = 0
    const preventDefault = vi.fn()
    on.get('before-input-event')?.(
      { preventDefault },
      {
        type: 'keyDown',
        key,
        code: '',
        meta: false,
        control: false,
        alt: false,
        shift: false,
        ...mods,
      },
    )
    return preventDefault.mock.calls.length > 0
  }

  it('take an app command from the site and hand it to the window', () => {
    expect(press('o', { meta: true })).toBe(true)
    expect(pushed).toEqual([
      [
        'host',
        'web:key',
        { key: 'o', code: '', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false },
      ],
    ])
  })

  it('share Escape with the site, and leave undo, find, and plain typing to it', () => {
    expect(press('Escape')).toBe(false)
    expect(pushed).toHaveLength(1)
    for (const [key, mods] of [
      ['z', { meta: true }],
      ['f', { meta: true }],
      ['o', {}],
    ] as const) {
      expect(press(key, mods)).toBe(false)
      expect(pushed).toHaveLength(0)
    }
  })
})
