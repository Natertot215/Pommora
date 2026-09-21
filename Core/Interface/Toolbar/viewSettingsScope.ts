import type { SelectionState } from '@pommora/core/Navigation/navRef'

type ViewSettingsScope = 'view' | 'page' | 'space' | 'context' | 'homepage' | 'matrix' | 'none'

export function viewSettingsScope(selection: SelectionState): ViewSettingsScope {
  switch (selection.kind) {
    case 'collection':
    case 'set':
      return 'view'
    case 'page':
      return 'page'
    case 'space':
      return 'space'
    case 'context':
      return 'context'
    case 'homepage':
      return 'homepage'
    case 'matrix':
      return 'matrix'
    default:
      return 'none'
  }
}
