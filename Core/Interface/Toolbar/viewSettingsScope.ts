import type { SelectionState } from '@pommora/core/Navigation/navRef'

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
