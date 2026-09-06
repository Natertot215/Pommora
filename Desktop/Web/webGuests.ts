// One owner for the guest-webview story: the attach gate, the shared session, popup routing, zoom.

import { app, session, webContents, BrowserWindow, type Session, type WebContents } from 'electron'
import { hasWebScheme, isHttpLink } from '@pommora/core/Connections/links'
import { WEB_PARTITION } from '@pommora/core/Web/partition'
import { WEB_ZOOM_DEFAULT } from '@pommora/core/Settings/personalization'
import { push } from '../Bridge/ipc'

/** Its server-side detection additionally trips on the Chrome token. */
const GOOGLE_SIGNIN_HOST = 'accounts.google.com'

// `isHttpLink` alone normalizes a schemeless string to https, admitting what the renderer refuses.
const isWebUrl = (url: string): boolean => hasWebScheme(url) && isHttpLink(url)

// Best-effort by decision: the detection is server-side policy, not a UA sniff.
function cleanedUA(): string {
  const name = app.getName().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return app.userAgentFallback
    .replace(/\sElectron\/\S+/, '')
    .replace(new RegExp(`\\s${name}\\/\\S+`, 'i'), '')
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

const webSession = (): Session => session.fromPartition(WEB_PARTITION)

const webviewGuests = (): WebContents[] =>
  webContents.getAllWebContents().filter((wc) => wc.getType() === 'webview')

// Not derivable here: settings live per-nexus, so the boot read and the settings write push it in.
let webZoom = WEB_ZOOM_DEFAULT

export function setWebZoomFactor(factor: number): void {
  webZoom = factor
  syncGuestZoom()
}

const tileZooms = new Map<number, number>()

export function setGuestTileZoom(guestId: number, factor: number): void {
  if (factor === 1) tileZooms.delete(guestId)
  else tileZooms.set(guestId, factor)
  for (const g of webviewGuests()) if (g.id === guestId && !g.isDestroyed()) stampGuestZoom(g)
}

function stampGuestZoom(g: WebContents): void {
  const factor = g.hostWebContents?.getZoomFactor()
  if (factor) g.setZoomFactor(factor * webZoom * (tileZooms.get(g.id) ?? 1))
}

// createWindow re-runs on macOS activate, and a per-window listener would stack for the process life.
let appWired = false
function wireAppLevel(): void {
  if (appWired) return
  appWired = true

  const ses = webSession()
  const baseUA = cleanedUA()
  const googleUA = baseUA.replace(/\sChrome\/[\d.]+/, '')
  ses.setUserAgent(baseUA)
  // Pre-request, not post-navigation: redirect hops into the host carry no navigation event.
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    if (hostOf(details.url) === GOOGLE_SIGNIN_HOST) details.requestHeaders['User-Agent'] = googleUA
    callback({ requestHeaders: details.requestHeaders })
  })

  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() !== 'webview') return

    // The renderer's one open-link adjudicator decides where the URL goes; no OS window ever opens.
    contents.setWindowOpenHandler(({ url }) => {
      const host =
        contents.hostWebContents && BrowserWindow.fromWebContents(contents.hostWebContents)
      if (host && isWebUrl(url)) push(host, 'web:popup', url)
      return { action: 'deny' }
    })

    // Re-asserted per navigation: a guest re-aimed after a clean attach would otherwise sail through on the signed-in partition.
    contents.on('will-navigate', (event, url) => {
      if (!isWebUrl(url)) event.preventDefault()
    })

    // Guests inherit no host zoom and theirs is per-origin, so each commit re-stamps live.
    contents.on('did-navigate', () => stampGuestZoom(contents))
    contents.once('destroyed', () => tileZooms.delete(contents.id))
  })
}

export function installWebGuests(win: BrowserWindow): void {
  wireAppLevel()

  win.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    // Validator, not rewriter — spike-proven: `params` edits here don't reach the attach, so the surfaces carry `partition` and `allowpopups` as attributes (without the latter a guest's window.open dies inside Blink). This is the trust boundary.
    const src = params.src ?? ''
    if (
      (src !== '' && !isWebUrl(src)) ||
      params.partition !== WEB_PARTITION ||
      params.webpreferences
    ) {
      event.preventDefault()
      return
    }
    delete webPreferences.preload
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true
    webPreferences.webSecurity = true
    webPreferences.allowRunningInsecureContent = false
  })

  // Chromium applies wheel/pinch zoom before this event's turn ends, so the sync defers a tick.
  win.webContents.on('zoom-changed', () =>
    setImmediate(() => {
      if (!win.isDestroyed()) syncGuestZoom()
    }),
  )
}

function syncGuestZoom(): void {
  for (const g of webviewGuests()) if (!g.isDestroyed()) stampGuestZoom(g)
}

export function wheelGuest(
  guestId: number,
  x: number,
  y: number,
  deltaX: number,
  deltaY: number,
): void {
  // Numbers off the wire, and only ever a guest: any other WebContents is the app's own.
  if (!Number.isFinite(x) || !Number.isFinite(y)) return
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return
  const guest = webContents.fromId(guestId)
  if (!guest || guest.isDestroyed() || guest.getType() !== 'webview') return
  guest.sendInputEvent({ type: 'mouseWheel', x, y, deltaX, deltaY, canScroll: true })
}

// A fixed constant, never renderer-supplied; per frame so an iframe player pauses too.
const PAUSE_MEDIA = 'document.querySelectorAll("video,audio").forEach((m)=>m.pause())'
export function pauseGuestMedia(guestId: number): void {
  const guest = webContents.fromId(guestId)
  if (!guest || guest.isDestroyed() || guest.getType() !== 'webview') return
  for (const frame of guest.mainFrame.framesInSubtree)
    void frame.executeJavaScript(PAUSE_MEDIA).catch(() => {})
}

/** The single seam: a bare `setZoomFactor` elsewhere leaves guests at the old scale. */
export function setHostZoom(wc: WebContents, factor: number): void {
  wc.setZoomFactor(factor)
  syncGuestZoom()
}

// Chromium's visual zoom range; the native roles let the stored level run past the visible cap.
const ZOOM_FACTOR_MIN = 0.25
const ZOOM_FACTOR_MAX = 5

/** De-roled: a role acts on whatever holds focus, so a focused guest would zoom itself. */
export function stepHostZoom(wc: WebContents, dir: 1 | -1): void {
  const factor = wc.getZoomFactor() * 1.2 ** (dir * 0.5)
  setHostZoom(wc, Math.min(ZOOM_FACTOR_MAX, Math.max(ZOOM_FACTOR_MIN, factor)))
}
