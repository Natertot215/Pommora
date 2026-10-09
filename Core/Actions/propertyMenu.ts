import { type ActionItem, joinGroups } from './menuModel'

// Delete is offered only inside the property's own pane.

type PropertyMenuContext =
  | { kind: 'editor'; name: string }
  | { kind: 'assigned-row'; name: string }
  /** Neither Clear nor Remove touches the schema: the property stays assigned to its Collection. */
  | { kind: 'page-value'; name: string; filled: boolean; editable?: boolean }

type PropertyMenuAction =
  | 'property:rename'
  | 'property:remove'
  | 'property:destroy'
  | 'value:edit'
  | 'value:clear'
  | 'value:remove'

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
    case 'page-value':
      return joinGroups<PropertyMenuAction>([
        ctx.editable ? [{ label: 'Edit', action: 'value:edit' }] : [],
        [
          ...(ctx.filled ? [{ label: 'Clear', action: 'value:clear' as const }] : []),
          { label: 'Remove', action: 'value:remove' },
        ],
      ])
  }
}
