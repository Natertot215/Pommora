import type { ActionItem } from './menuModel'

// Delete is deliberately reachable ONLY inside the property's own pane, behind main's confirm dialog.

type PropertyMenuContext =
  | { kind: 'editor'; name: string }
  | { kind: 'assigned-row'; name: string }
  | { kind: 'registry-row'; name: string }
  /** Neither Clear nor Remove touches the schema: the property stays assigned to its Collection. */
  | { kind: 'page-value'; name: string; filled: boolean }

type PropertyMenuAction =
  | 'property:rename'
  | 'property:remove'
  | 'property:destroy'
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
    case 'registry-row':
      return [{ label: 'Rename', action: 'property:rename' }]
    case 'page-value':
      return ctx.filled
        ? [
            { label: 'Clear', action: 'value:clear' },
            { label: 'Remove', action: 'value:remove' },
          ]
        : [{ label: 'Remove', action: 'value:remove' }]
  }
}
