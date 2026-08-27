import type { SelectionState } from '@shared/types'

/** Maps the current selection to a Settings-menu scope; SettingsMenu switches on this to
 *  pick its frame. Adding a future surface's frame is a new case here + a switch arm there. */
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
