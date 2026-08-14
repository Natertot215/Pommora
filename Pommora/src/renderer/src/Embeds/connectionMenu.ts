import type { ConnMenuTarget } from '@renderer/MarkdownPM/connections'
import { pageLinkText, pagePathText } from '@shared/pageMenu'
import { isOpenInTabs } from '../Tabs/tabsModel'
import { useSession } from '../store'

/** main pops the native menu at the cursor; the chosen action runs renderer-side (the sidebar
 *  contextMenu contract). Shared by every ConnectionsApi host. */
export function showConnectionMenu(target: ConnMenuTarget): void {
  if (target.kind === 'url') {
    void window.nexus
      .connMenu({ editable: false, hasAlias: false, external: true })
      .then((action) => {
        if (action === 'title:copylink') void window.nexus.writeClipboard(target.url)
      })
    return
  }
  // An editable surface with no way back into it can't perform the edit either, so the two
  // authoring items are offered only when both hold.
  const editable = target.editable && target.apply !== undefined
  const page = target.page
  const ref = { kind: 'page', id: page.id, path: page.path } as const
  const { tabs, pinned } = useSession.getState()
  void window.nexus
    .connMenu({ editable, hasAlias: target.hasAlias, alreadyOpen: isOpenInTabs(tabs, pinned, ref) })
    .then((action) => {
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
        default:
          target.apply?.(action)
      }
    })
}
