// The one adjudicator every external-link open routes through — editor clicks, table cells, tile titles, and guest popups all land here, so the open-in preference can never be honored in one place and missed in another.
import { openInAppBrowser } from '@pommora/core/Interface/Windows/WebWindow'
import { useSession } from '../Session/store'
import { host } from '../Platform/dialer'

export function openWebLink(url: string): void {
  if (useSession.getState().personalization.openLinksInApp) openInAppBrowser(url)
  else void host().ask('link:open', url)
}
