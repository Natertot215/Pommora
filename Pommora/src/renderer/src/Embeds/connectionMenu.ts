import type { ConnMenuTarget } from '@renderer/MarkdownPM/connections'
import {
  isConnCellAction,
  isConnUrlAction,
  type ConnCellAction,
  type ConnEditAction,
  type ConnMenuContext,
} from '@shared/connMenu'
import { isValidLink } from '@shared/links'
import { readLink } from '@shared/linkValue'
import { resolveConnection } from '@renderer/treeIndex'
import { pageLinkText, pagePathText } from '@shared/pageMenu'
import { openInAppBrowser } from '../Windows/WebWindow'
import { deriveTarget } from '../Windows/windowTabs'
import { isOpenInTabs } from '../Tabs/tabsModel'
import { useSession } from '../store'

/** main pops the native menu at the cursor; the chosen action runs renderer-side (the sidebar
 *  contextMenu contract). Shared by every ConnectionsApi host and by the Link property's cells, so
 *  a link offers the same actions wherever it is right-clicked. */
export function showConnectionMenu(target: ConnMenuTarget): void {
  // An editable surface with no way back into it can't perform the edit either, so the two
  // authoring items are offered only when both hold.
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
    void window.nexus.connMenu(ctx).then((action) => {
      if (action === null) return
      if (action === 'link:preview') openInAppBrowser(target.url)
      else if (action === 'link:browser') void window.nexus.openExternal(target.url)
      else if (action === 'title:copylink') void window.nexus.writeClipboard(target.url)
      else if (isConnCellAction(action)) target.onCell?.(action)
      else if (isConnUrlAction(action)) apply?.(action)
    })
    return
  }
  const page = target.page
  const ref = { kind: 'page', id: page.id, path: page.path } as const
  const { tabs, pinned, pageDetail, preview } = useSession.getState()
  const ctx: ConnMenuContext = {
    ...shared,
    hasAlias: target.hasAlias,
    // A page already in hand is not somewhere to be opened. The two readings are independent: the
    // content view answers for the tab item, the page window for its own.
    open:
      pageDetail?.path === page.path
        ? 'detail'
        : isOpenInTabs(tabs, pinned, ref)
          ? 'tab'
          : 'closed',
    previewing: deriveTarget(preview)?.id === page.id,
  }
  void window.nexus.connMenu(ctx).then((action) => {
    switch (action) {
      case null:
        return
      case 'title:preview':
        useSession.getState().openPreview({ id: page.id, path: page.path })
        return
      case 'title:newtab':
        void useSession.getState().select(ref, { newTab: true })
        return
      case 'title:copylink':
        void window.nexus.writeClipboard(pageLinkText(page.title))
        return
      case 'title:copypath':
        void window.nexus.writeClipboard(pagePathText(page.path))
        return
      // The authoring gestures and the two that act on a cell's value, named rather than caught:
      // the action vocabulary is wider than any one menu, and an item this context never offered
      // has no span or value here to act on.
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

/** What a Link property cell can be told to do — the four its own surface answers, out of the wider
 *  vocabulary the shared menu speaks. */
export type LinkCellAction = ConnEditAction | ConnCellAction

/** The link menu target a Link property cell pops. A value naming a page menus as that connection;
 *  one holding an address menus as that address. Null when the value holds a live link of neither
 *  kind — empty, or a title no page answers to — which is the cell's own menu rather than this one:
 *  there is nothing there to open, copy, or reach. */
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
  // A cell's address menu carries only the authoring pair out of the wider url vocabulary; the rest
  // belong to a link sitting in prose, where there is a span to rewrite.
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
