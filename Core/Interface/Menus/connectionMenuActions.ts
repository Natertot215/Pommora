import type { ConnMenuTarget } from '../../MarkdownPM/Links/connectionsApi'
import {
  connectionMenuModel,
  isConnCellAction,
  isConnUrlAction,
  type ConnCellAction,
  type ConnEditAction,
  type ConnMenuContext,
} from '@pommora/core/Actions/connectionMenu'
import { isValidLink } from '@pommora/core/Paths/urlPath'
import { readLink } from '@pommora/core/Connections/linkValue'
import { resolveConnection } from '../../Nexus/treeIndex'
import { isOpenInTabs } from '../../Navigation/tabsModel'
import { shownDetail, useSession, windowTargetOf } from '../../Session/store'
import { dialer } from '../../Platform/dialer'
import { popMenu } from '../../Actions/menuActions'
import { runPageAction } from './pageMenuActions'

export function showConnectionMenu(target: ConnMenuTarget): void {
  // An editable surface with no way back into it can't perform the edit either, so the authoring pair needs both.
  const shared = {
    surface: target.surface ?? 'editor',
    editable: (target.editable ?? true) && target.apply !== undefined,
    ...(target.hideable ? { hideable: true } : {}),
  }
  if (target.kind === 'url') {
    const apply = target.apply
    const ctx: ConnMenuContext = {
      ...shared,
      hasAlias: target.hasAlias ?? false,
      external: true,
    }
    void popMenu(connectionMenuModel(ctx)).then((action) => {
      if (action === null) return
      if (action === 'link:window') useSession.getState().openBrowser(target.url)
      else if (action === 'link:browser') void dialer().ask('link:open', target.url)
      else if (action === 'title:copylink') void dialer().ask('clipboard:write', target.url)
      else if (isConnCellAction(action)) target.onCell?.(action)
      else if (isConnUrlAction(action)) apply?.(action)
    })
    return
  }
  const page = target.page
  const ref = { kind: 'page', id: page.id, path: page.path } as const
  const s = useSession.getState()
  const { tabs, pinned } = s
  const ctx: ConnMenuContext = {
    ...shared,
    hasAlias: target.hasAlias,
    // The two readings are independent: the content view answers for the tab item, the page window for its own. A named heading travels even where the page already shows, so it keeps both.
    open:
      !target.heading && shownDetail(s)?.path === page.path
        ? 'detail'
        : isOpenInTabs(tabs, pinned, ref)
          ? 'tab'
          : 'closed',
    windowed: !target.heading && windowTargetOf(s)?.id === page.id,
  }
  void popMenu(connectionMenuModel(ctx)).then((action) => {
    if (action === null || runPageAction(action, { ...page, heading: target.heading })) return
    switch (action) {
      // Named rather than caught: the action vocabulary is wider than any one menu, and an item this context never offered has no span or value here to act on.
      case 'rename':
      case 'editLink':
        target.apply?.(action)
        return
      case 'cell:clear':
      case 'cell:hide':
        target.onCell?.(action)
    }
  })
}

type LinkCellAction = ConnEditAction | ConnCellAction

export function linkValueMenuTarget(
  raw: string,
  apply: (action: LinkCellAction) => void,
  hideable = false,
): ConnMenuTarget | null {
  const value = readLink(raw.trim())
  const base = {
    surface: 'cell',
    editable: true,
    hasAlias: value.alias !== undefined,
    onCell: apply,
    ...(hideable ? { hideable } : {}),
  } as const
  if (value.kind === 'page') {
    const page = resolveConnection(useSession.getState().tree, value.title)
    return page ? { ...base, kind: 'page', page, heading: value.heading, apply } : null
  }
  return isValidLink(value.url)
    ? {
        ...base,
        kind: 'url',
        url: value.url,
        apply: (action) => {
          if (action === 'rename' || action === 'editLink') apply(action)
        },
      }
    : null
}
