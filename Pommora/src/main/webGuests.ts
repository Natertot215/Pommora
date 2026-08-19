// One owner for the guest-webview story: what an attach is allowed to be, which session guests
// live on, where their popups go, and how they track the host's zoom. Every embed surface —
// tiles, the in-app browser, hover cards — attaches under these rules; none carries its own.

import { app, session, type BrowserWindow, type WebContents } from 'electron'
import { WEB_PARTITION } from '@shared/types'
import { push } from './ipc'

const guests = new Set<WebContents>()
let hostZoom = 1
let hostWindow: BrowserWindow | null = null

/** The host that trips on the Chrome token, and so gets the stripped UA variant. */
const GOOGLE_SIGNIN_HOST = 'accounts.google.com'

const isWebUrl = (url: string): boolean => /^https?:\/\//i.test(url)

/** The fallback UA with the tokens that name this as an Electron app removed — Ferdium's recipe,
 *  session-wide. Google sign-in additionally trips on the Chrome token's presence: on
 *  accounts.google.com the guest presents the suffix-stripped form, restored on leaving. All of it
 *  best-effort by decision — the detection is server-side policy, not a UA sniff. */
function cleanedUA(): string {
  const name = app.getName().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return app.userAgentFallback
    .replace(/\sElectron\/\S+/, '')
    .replace(new RegExp(`\\s${name}\\/\\S+`, 'i'), '')
}

export function installWebGuests(win: BrowserWindow): void {
  hostWindow = win
  const baseUA = cleanedUA()
  const googleUA = baseUA.replace(/\sChrome\/[\d.]+/, '')
  session.fromPartition(WEB_PARTITION).setUserAgent(baseUA)

  win.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    // Validator, not rewriter — spike-proven: `params` edits here don't reach the attach, so the
    // surfaces carry `partition` (and `allowpopups`, without which a guest's window.open dies
    // inside Blink before setWindowOpenHandler is consulted) as attributes, and an attach that
    // doesn't wear the shared partition — or wears a hostile src — is denied outright. The
    // renderer's own scheme gate makes both unreachable from app code; this is the trust boundary.
    const src = params.src ?? ''
    if ((src !== '' && !isWebUrl(src)) || params.partition !== WEB_PARTITION) {
      event.preventDefault()
      return
    }
    delete webPreferences.preload
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true
  })

  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() !== 'webview') return
    guests.add(contents)
    contents.on('destroyed', () => guests.delete(contents))

    // A guest's window.open answers only its own handler. The renderer's one open-link
    // adjudicator decides where the URL goes; no OS window ever opens from a guest.
    contents.setWindowOpenHandler(({ url }) => {
      if (hostWindow && isWebUrl(url)) push(hostWindow, 'web:popup', url)
      return { action: 'deny' }
    })

    contents.on('did-finish-load', () => contents.setZoomFactor(hostZoom))
    contents.on('did-navigate', (_e, url) => {
      let host = ''
      try {
        host = new URL(url).hostname
      } catch {}
      contents.setUserAgent(host === GOOGLE_SIGNIN_HOST ? googleUA : baseUA)
    })
  })
}

/** Guests don't inherit host zoom (per-render-host, and theirs is their own) — every host zoom
 *  write flows through here so the tiles track ⌘0/⌘+/⌘− and the nexus default alike. */
function syncGuestZoom(factor: number): void {
  hostZoom = factor
  for (const g of guests) if (!g.isDestroyed()) g.setZoomFactor(factor)
}

/** The single seam every host-zoom writer uses; a bare `setZoomFactor` elsewhere leaves guests
 *  at the old scale. */
export function setHostZoom(wc: WebContents, factor: number): void {
  wc.setZoomFactor(factor)
  syncGuestZoom(factor)
}

/** ⌘+/⌘− as the de-roled menu items step it: the native roles' half-level increments, minus the
 *  Chromium internals that bypassed the guest sync. */
export function stepHostZoom(wc: WebContents, dir: 1 | -1): void {
  wc.setZoomLevel(wc.getZoomLevel() + dir * 0.5)
  syncGuestZoom(wc.getZoomFactor())
}
