// The one adjudicator every external-link open routes through — editor clicks, table cells, tile titles, and guest popups all land here, so the open-in preference can never be honored in one place and missed in another.
import { useSession } from '../Session/store'
import { dialer } from '../Platform/dialer'
import { settingOf } from '../Settings/personalization'
import { personalizationOf } from '../Session/configSlice'

export function openWebLink(url: string): void {
  const s = useSession.getState()
  if (settingOf(personalizationOf(s), 'openLinksInApp')) s.openBrowser(url)
  else void dialer().ask('link:open', url)
}
