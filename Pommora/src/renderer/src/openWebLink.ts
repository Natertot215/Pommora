// The one adjudicator every external-link open routes through — editor clicks, table cells, tile
// titles, and guest popups all land here, so the open-in preference can never be honored in one
// place and missed in another.
import { openInAppBrowser } from './PagePreview/BrowserWindow'
import { useSession } from './store'

/** Opens a web address where the user said links go: the system browser by default, Pommora's
 *  floating browser when `openLinksInApp` is on. */
export function openWebLink(url: string): void {
  if (useSession.getState().personalization.openLinksInApp) openInAppBrowser(url)
  else void window.nexus.openExternal(url)
}
