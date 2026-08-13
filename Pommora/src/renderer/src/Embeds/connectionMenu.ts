import type { ConnMenuTarget, ConnPage } from '@renderer/MarkdownPM/connections'
import { useSession } from '../store'

/** main pops the native menu at the cursor; the chosen action runs renderer-side (the sidebar
 *  contextMenu contract). Shared by every ConnectionsApi host. */
export function showConnectionMenu(page: ConnPage, target: ConnMenuTarget): void {
  // An editable surface with no way back into it can't perform the edit either, so the two
  // authoring items are offered only when both hold.
  const editable = target.editable && target.apply !== undefined
  void window.nexus.connMenu({ editable, hasAlias: target.hasAlias }).then((action) => {
    if (!action) return
    if (action === 'preview') {
      useSession.getState().openPreview({ id: page.id, path: page.path })
      return
    }
    target.apply?.(action)
  })
}
