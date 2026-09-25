// The one adjudicator every external-link open routes through — editor clicks, table cells, tile titles, and guest popups all land here, so the open-in preference can never be honored in one place and missed in another.
import { useSession } from '../Session/store'
import { host } from '../Platform/dialer'

export function openWebLink(url: string): void {
  const s = useSession.getState()
  if (s.personalization.openLinksInApp) s.openBrowser(url)
  else void host().ask('link:open', url)
}
