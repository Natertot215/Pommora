import { ownerWindow } from '@pommora/uix/Interactions/dismissalStack'
import { cycle } from '../Navigation/tabsModel'
import { useSession } from '../Session/store'
import { undoValue } from '../Session/undo'
import { type CommandId, MENU_COMMANDS, type MenuCommand } from './commands'
import { newPage } from './createActions'

export const KEYED_COMMANDS = [
  'toggle-ribbon',
  'toggle-nav',
  'toggle-matrix',
  'toggle-iteration',
  'search',
  'next-tab',
  'previous-tab',
  'undo-value',
] as const satisfies readonly CommandId[]

type RoutedCommand = (typeof KEYED_COMMANDS)[number] | MenuCommand

export const isMenuCommand = (action: string): action is MenuCommand =>
  (MENU_COMMANDS as readonly string[]).includes(action)

/** Whether the command acted, so a keydown it answered stops there. */
export function runCommand(id: RoutedCommand, target: EventTarget | null = null): boolean {
  const s = useSession.getState()
  const root = ownerWindow(document.activeElement)
  const win =
    root?.matches('.page-window, .navwindow') && s.windowSlot?.kind !== 'matrix'
      ? s.windowSlot
      : null
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
      if (!win) {
        s.activateTab(
          cycle(
            [...s.pinnedTabs, ...s.tabs].map((t) => t.id),
            s.activeTabId,
            dir,
          ),
        )
        return true
      }
      const next = cycle(
        win.tabs.map((t) => t.id),
        win.activeTabId,
        dir,
      )
      if (next === win.activeTabId) return true
      // The switch unmounts or parks the focused tab body; the window's root keeps the keyboard so the next chord still lands here.
      root?.focus()
      s.activateWindowTab(next)
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
  }
}
