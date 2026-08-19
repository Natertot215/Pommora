// One owner for the guest-webview story: what an attach is allowed to be, which session guests
// live on, where their popups go, and how they track the host's zoom. Every embed surface —
// tiles, the in-app browser, hover cards — attaches under these rules; none carries its own.

import { app, session, webContents, BrowserWindow, type Session, type WebContents } from 'electron'
import { isHttpLink } from '@shared/links'
import { WEB_PARTITION, WEB_ZOOM_DEFAULT } from '@shared/types'
import { push } from './ipc'

/** The sign-in host whose server-side detection additionally trips on the Chrome token; requests
 *  to it carry the suffix-stripped UA variant. */
const GOOGLE_SIGNIN_HOST = 'accounts.google.com'

/** The explicit scheme is required on top of the shared validation — `isHttpLink` alone normalizes
 *  a schemeless string to https, which would admit at the trust boundary what the renderer's own
 *  gate refuses. */
const isWebUrl = (url: string): boolean => /^https?:\/\//i.test(url) && isHttpLink(url)

/** The fallback UA with the tokens that name this as an Electron app removed — Ferdium's recipe,
 *  session-wide. All of it best-effort by decision: the detection is server-side policy, not a UA
 *  sniff. */
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

/** The one session every guest lives on — the wiring stamps it, the wipes clear it. */
const webSession = (): Session => session.fromPartition(WEB_PARTITION)

const webviewGuests = (): WebContents[] =>
  webContents.getAllWebContents().filter((wc) => wc.getType() === 'webview')

// The user's web-guest scale (personalization.webZoomFactor) — guests render at their host's
// factor times this. Not derivable here: settings live per-nexus, so the boot read and the
// settings write both push the coerced value in.
let webZoom = WEB_ZOOM_DEFAULT

/** The settings seam: re-stamps every living guest so a changed preference applies in place. */
export function setWebZoomFactor(factor: number): void {
  webZoom = factor
  syncGuestZoom()
}

// One derivation of a guest's factor — its own host's zoom scaled by the preference.
function stampGuestZoom(g: WebContents): void {
  const factor = g.hostWebContents?.getZoomFactor()
  if (factor) g.setZoomFactor(factor * webZoom)
}

// App-level wiring registers exactly once — createWindow re-runs on macOS activate, and a
// listener registered per window would stack for the process lifetime.
let appWired = false
function wireAppLevel(): void {
  if (appWired) return
  appWired = true

  const ses = webSession()
  const baseUA = cleanedUA()
  const googleUA = baseUA.replace(/\sChrome\/[\d.]+/, '')
  ses.setUserAgent(baseUA)
  // Pre-request, not post-navigation: the sign-in page's server-side check reads the document
  // request itself, and redirect hops into the host arrive with no navigation event of their own.
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    if (hostOf(details.url) === GOOGLE_SIGNIN_HOST) details.requestHeaders['User-Agent'] = googleUA
    callback({ requestHeaders: details.requestHeaders })
  })

  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() !== 'webview') return

    // A guest's window.open answers only its own handler. The renderer's one open-link
    // adjudicator decides where the URL goes; no OS window ever opens from a guest.
    contents.setWindowOpenHandler(({ url }) => {
      const host =
        contents.hostWebContents && BrowserWindow.fromWebContents(contents.hostWebContents)
      if (host && isWebUrl(url)) push(host, 'web:popup', url)
      return { action: 'deny' }
    })

    // The attach gate, re-asserted per navigation — a guest re-aimed at file:/javascript: after
    // a clean attach would otherwise sail through on the signed-in partition.
    contents.on('will-navigate', (event, url) => {
      if (!isWebUrl(url)) event.preventDefault()
    })

    // Guests don't inherit host zoom (per-render-host, and theirs is their own), and their zoom
    // is per-origin in their session — every commit re-stamps from the embedder's live factor,
    // so a slow page never renders unscaled while it loads.
    contents.on('did-navigate', () => stampGuestZoom(contents))
  })
}

export function installWebGuests(win: BrowserWindow): void {
  wireAppLevel()

  win.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    // Validator, not rewriter — spike-proven: `params` edits here don't reach the attach, so the
    // surfaces carry `partition` (and `allowpopups`, without which a guest's window.open dies
    // inside Blink before setWindowOpenHandler is consulted) as attributes, and an attach that
    // doesn't wear the shared partition, carries a hostile src, or asks for its own
    // webpreferences is denied outright. The renderer's own scheme gate makes all three
    // unreachable from app code; this is the trust boundary.
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

  // Wheel/pinch zoom bypasses the menu seam; Chromium applies it before this event's turn ends,
  // so the sync reads the settled factor a tick later.
  win.webContents.on('zoom-changed', () =>
    setImmediate(() => {
      if (!win.isDestroyed()) syncGuestZoom()
    }),
  )
}

function syncGuestZoom(): void {
  for (const g of webviewGuests()) if (!g.isDestroyed()) stampGuestZoom(g)
}

/** The single seam every host-zoom writer uses; a bare `setZoomFactor` elsewhere leaves guests
 *  at the old scale. */
export function setHostZoom(wc: WebContents, factor: number): void {
  wc.setZoomFactor(factor)
  syncGuestZoom()
}

// Chromium's visual zoom range; the de-roled step clamps to it where the native roles let the
// stored level run past the visible cap and go dead on the way back.
const ZOOM_FACTOR_MIN = 0.25
const ZOOM_FACTOR_MAX = 5

/** ⌘+/⌘− with the stride the native roles had. De-roled because the roles act on whatever
 *  WebContents holds focus — a focused guest would zoom itself, not the host — and their writes
 *  bypass the guest sync. */
export function stepHostZoom(wc: WebContents, dir: 1 | -1): void {
  const factor = wc.getZoomFactor() * 1.2 ** (dir * 0.5)
  setHostZoom(wc, Math.min(ZOOM_FACTOR_MAX, Math.max(ZOOM_FACTOR_MIN, factor)))
}

/** The one honest wipe-everything: the whole partition's storage — sign-ins live wherever the
 *  user made them, and Electron cannot enumerate storage-holding origins reliably enough for
 *  anything narrower to be truthful. */
export async function clearWebBrowsing(): Promise<void> {
  await webSession().clearStorageData()
}
