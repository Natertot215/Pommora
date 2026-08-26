import type { SelectionState } from '@shared/types'

/** Maps the current selection to a Settings-dropdown scope; SettingsDropdown switches on this to
 *  pick its pane. Adding a future surface's pane is a new case here + a switch arm there. */
export type ViewSettingsScope = 'view' | 'page' | 'context' | 'homepage' | 'none'

export function viewSettingsScope(selection: SelectionState): ViewSettingsScope {
  switch (selection.kind) {
    case 'collection':
    case 'set':
      return 'view'
    case 'page':
      return 'page'
    case 'context':
      return 'context'
    case 'homepage':
      return 'homepage'
    default:
      return 'none'
  }
}
