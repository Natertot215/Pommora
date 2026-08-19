// The one adjudicator every external-link open routes through — editor clicks, table cells, tile
// titles, and guest popups all land here, so the open-in preference can never be honored in one
// place and missed in another.
import { useSession } from './store'

/** Opens a web address where the user said links go: the system browser by default, Pommora's
 *  floating browser when `openLinksInApp` is on. */
export function openWebLink(url: string): void {
  if (useSession.getState().personalization.openLinksInApp) {
    openInAppBrowser(url)
    return
  }
  void window.nexus.openExternal(url)
}

/** The knob-independent summon of the floating browser — the resting state routes external until
 *  the browser flavor lands. */
export function openInAppBrowser(url: string): void {
  void window.nexus.openExternal(url)
}
