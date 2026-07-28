import type { ConnPage } from '@renderer/MarkdownPM/connections'
import { useSession } from '../store'

/** main pops the native menu at the cursor; the chosen action runs renderer-side (the sidebar
 *  contextMenu contract). Shared by every ConnectionsApi host. */
export function showConnectionMenu(page: ConnPage): void {
  void window.nexus.connMenu().then((action) => {
    if (action === 'preview') useSession.getState().openPreview({ id: page.id, path: page.path })
  })
}
