import type { ConnMenuTarget } from '../../MarkdownPM/Links/connectionsApi'
import {
  connMenuModel,
  isConnCellAction,
  isConnUrlAction,
  type ConnCellAction,
  type ConnEditAction,
  type ConnMenuContext,
} from '@pommora/core/MarkdownPM/Links/connMenu'
import { isValidLink } from '@pommora/core/Connections/links'
import { readLink } from '@pommora/core/Connections/linkValue'
import { resolveConnection } from '../../Nexus/treeIndex'
import { pageLinkText, pagePathText } from '@pommora/core/Actions/pageMenu'
import { openInAppBrowser } from '@pommora/core/Interface/Windows/WebWindow'
import { deriveTarget } from '../Windows/windowTabs'
import { isOpenInTabs } from '../../Navigation/tabsModel'
import { shownDetail, useSession } from '../../Session/store'
import { host } from '../../Platform/dialer'
import { popMenu } from '../../Actions/menuActions'

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
    void popMenu(connMenuModel(ctx)).then((action) => {
      if (action === null) return
      if (action === 'link:window') openInAppBrowser(target.url)
      else if (action === 'link:browser') void host().ask('link:open', target.url)
      else if (action === 'title:copylink') void host().ask('clipboard:write', target.url)
      else if (isConnCellAction(action)) target.onCell?.(action)
      else if (isConnUrlAction(action)) apply?.(action)
    })
    return
  }
  const page = target.page
  const ref = { kind: 'page', id: page.id, path: page.path } as const
  const s = useSession.getState()
  const { tabs, pinned, pageWindow } = s
  const ctx: ConnMenuContext = {
    ...shared,
    hasAlias: target.hasAlias,
    // The two readings are independent: the content view answers for the tab item, the page window for its own.
    open:
      shownDetail(s)?.path === page.path
        ? 'detail'
        : isOpenInTabs(tabs, pinned, ref)
          ? 'tab'
          : 'closed',
    windowed: deriveTarget(pageWindow)?.id === page.id,
  }
  void popMenu(connMenuModel(ctx)).then((action) => {
    switch (action) {
      case null:
        return
      case 'title:window':
        useSession.getState().openWindow({ id: page.id, path: page.path })
        return
      case 'title:newtab':
        void useSession.getState().select(ref, { newTab: true })
        return
      case 'title:copylink':
        void host().ask('clipboard:write', pageLinkText(page.title))
        return
      case 'title:copypath':
        void host().ask('clipboard:write', pagePathText(page.path))
        return
      // Named rather than caught: the action vocabulary is wider than any one menu, and an item this context never offered has no span or value here to act on.
      case 'rename':
      case 'editLink':
        target.apply?.(action)
        return
      case 'link:clear':
      case 'link:hide':
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
    return page ? { ...base, kind: 'page', page, apply } : null
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
