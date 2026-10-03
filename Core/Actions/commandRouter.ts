import { ownerWindow } from '@pommora/uix/Interactions/dismissalStack'
import { cycle } from '../Navigation/tabsModel'
import { useSession } from '../Session/store'
import { undoValue } from '../Session/undo'
import { dialer } from '../Platform/dialer'
import { applyEditorAction } from '../MarkdownPM/Menus/menu'
import { editorAt } from '../MarkdownPM/api'
import type { EditMenuAction, KeyedCommand, MenuCommand } from './commands'
import { newPage } from './createActions'
import { PASTE_PLAIN_ACTION } from './editorMenu'

type RoutedCommand = KeyedCommand | MenuCommand | EditMenuAction

/** Whether the command acted, so a keydown it answered stops there. */
export function runCommand(id: RoutedCommand, target: EventTarget | null = null): boolean {
  const s = useSession.getState()
  const root = ownerWindow(document.activeElement)
  const win = root?.matches('.page-window, .navwindow') ? s.windowSlot : null
  switch (id) {
    case 'new-tab':
      if (win) s.promoteWindowTab(win.activeTabId, true)
      else s.openNewTab()
      return true
    case 'new-page':
      void newPage(win !== null)
      return true
    case 'next-tab':
    case 'previous-tab': {
      const dir = id === 'next-tab' ? 1 : -1
      const tabs = win ? win.tabs : [...s.pinnedTabs, ...s.tabs]
      const next = cycle(
        tabs.map((t) => t.id),
        win ? win.activeTabId : s.activeTabId,
        dir,
      )
      if (!win) s.activateTab(next)
      else if (next !== win.activeTabId) {
        // The switch unmounts or parks the focused tab body; the window's root keeps the keyboard so the next chord still lands here.
        root?.focus()
        s.activateWindowTab(next)
      }
      return true
    }
    case 'toggle-sidebar':
      s.toggleSidebar()
      return true
    case 'toggle-ribbon':
      s.toggleRibbon()
      return true
    case 'toggle-nav':
      s.toggleNav()
      return true
    case 'toggle-matrix':
      s.toggleMatrixWindow()
      return true
    case 'toggle-iteration':
      s.toggleIteration()
      return true
    case 'search':
      return root === null && s.searchView(s.activeTabId)
    case 'undo-value':
      return undoValue(target)
    case 'undo':
      if (!undoValue(target)) dialer().tell('edit:native', 'undo')
      return true
    case PASTE_PLAIN_ACTION: {
      const view = target instanceof Element ? editorAt(target) : null
      if (view) applyEditorAction(view, PASTE_PLAIN_ACTION)
      else dialer().tell('edit:native', 'pasteAndMatchStyle')
      return true
    }
  }
}
