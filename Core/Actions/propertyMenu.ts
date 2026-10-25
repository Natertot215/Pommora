import type { ActionItem } from './menuModel'

// Delete is offered only inside the property's own pane.

type PropertyMenuContext = { kind: 'editor' } | { kind: 'assigned-row' }

type PropertyMenuAction = 'property:rename' | 'property:remove' | 'property:destroy'

export function propertyMenuModel(ctx: PropertyMenuContext): ActionItem<PropertyMenuAction>[] {
  switch (ctx.kind) {
    case 'editor':
      return [
        { label: 'Remove', action: 'property:remove' },
        { label: 'Delete', action: 'property:destroy', separatorBefore: true },
      ]
    case 'assigned-row':
      return [
        { label: 'Rename', action: 'property:rename' },
        { label: 'Remove', action: 'property:remove' },
      ]
  }
}
