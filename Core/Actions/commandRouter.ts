import type { WindowState } from '../Interface/Windows/windowTabs'
import { cycle } from '../Navigation/tabsModel'
import { useSession } from '../Session/store'
import { undoValue } from '../Session/undo'
import type { CommandId } from './commands'
import { newPage } from './createActions'

/** Heard as keydowns in the window. */
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

/** Carried by the app menu, whose accelerators take the keystroke before the window sees it. */
const MENU_COMMANDS = [
  'new-tab',
  'new-page',
  'toggle-sidebar',
] as const satisfies readonly CommandId[]

type RoutedCommand = (typeof KEYED_COMMANDS)[number] | (typeof MENU_COMMANDS)[number]

export const isMenuCommand = (action: string): action is (typeof MENU_COMMANDS)[number] =>
  (MENU_COMMANDS as readonly string[]).includes(action)

const focusedWindow = (): Element | null => document.activeElement?.closest('.window') ?? null

const focusedTabbedWindow = (): WindowState | null => {
  const win = useSession.getState().windowSlot
  return win && win.kind !== 'matrix' && focusedWindow()?.matches('.page-window, .navwindow')
    ? win
    : null
}

/** Whether the command acted, so a keydown it answered stops there. */
export function runCommand(id: RoutedCommand, target: EventTarget | null = null): boolean {
  const s = useSession.getState()
  const win = focusedTabbedWindow()
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
      // The switch unmounts or parks the focused tab body; the window's root keeps the keyboard so the next chord still lands here.
      const root = focusedWindow()
      if (root instanceof HTMLElement) root.focus()
      s.activateWindowTab(
        cycle(
          win.tabs.map((t) => t.id),
          win.activeTabId,
          dir,
        ),
      )
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
      return focusedWindow() === null && s.searchView()
    case 'undo-value':
      return undoValue(target)
  }
}
