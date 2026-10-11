import type { LinkMenuTarget } from '../../MarkdownPM/Links/connectionsApi'
import {
  connectionMenuModel,
  isLinkAction,
  type LinkAction,
  type LinkMenuContext,
} from '../../Actions/connectionMenu'
import { isOpenInTabs } from '../../Navigation/tabsModel'
import { shownDetail, useSession, windowTargetOf } from '../../Session/store'
import { dialer } from '../../Platform/dialer'
import { popMenu } from '../../Actions/menuActions'
import { isHttpLink } from '../../Paths/urlPath'
import { runPageAction } from './pageMenuActions'

export function showConnectionMenu(target: LinkMenuTarget): Promise<LinkAction | null> {
  const s = useSession.getState()
  const shared = { editable: target.editable, ...(target.value ? { value: target.value } : {}) }
  if (target.kind === 'url') {
    const ctx: LinkMenuContext = { ...shared, kind: 'url', web: isHttpLink(target.url) }
    return popMenu(connectionMenuModel(ctx)).then((action) => {
      if (action === 'link:window') s.openBrowser(target.url)
      else if (action === 'link:browser') void dialer().ask('link:open', target.url)
      else if (action === 'title:copylink') void dialer().ask('clipboard:write', target.url)
      else if (action !== null && isLinkAction(action)) return action
      return null
    })
  }
  const { page, heading } = target
  const ref = { kind: 'page', id: page.id, path: page.path } as const
  const ctx: LinkMenuContext = {
    ...shared,
    kind: 'page',
    // The two readings are independent: the content view answers for the tab item, the page window for its own. A named heading travels even where the page already shows, so it keeps both.
    open:
      !heading && shownDetail(s)?.path === page.path
        ? 'detail'
        : isOpenInTabs(s.tabs, s.pinned, ref)
          ? 'tab'
          : 'closed',
    windowed: !heading && windowTargetOf(s)?.id === page.id,
  }
  return popMenu(connectionMenuModel(ctx)).then((action) =>
    action === null || runPageAction(action, { ...page, heading }) || !isLinkAction(action)
      ? null
      : action,
  )
}
