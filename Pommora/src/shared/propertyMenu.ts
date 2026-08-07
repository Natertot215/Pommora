/** The Properties pane's native menus. The editor's ⋮ carries Remove AND Delete —
 *  Delete is deliberately reachable ONLY inside the property's own pane, behind main's confirm
 *  dialog. An assigned row right-clicks to Rename · Remove; a registry row to Rename only
 *  (Remove is meaningless unassigned). Pure model — main maps it to Electron MenuItems. */

export type PropertyMenuContext =
  | { kind: 'editor'; name: string }
  | { kind: 'assigned-row'; name: string }
  | { kind: 'registry-row'; name: string }
  /** A value row on an entity: Clear empties what this one holds, Remove also takes the row away.
   *  Neither touches the schema — the property stays assigned to its Collection either way. */
  | { kind: 'page-value'; name: string; filled: boolean }

export type PropertyMenuAction =
  | 'property:rename'
  | 'property:remove'
  | 'property:destroy'
  | 'value:clear'
  | 'value:remove'

export interface PropertyMenuItem {
  label: string
  action: PropertyMenuAction
  /** Main separates a destructive item from the rest and gates it behind the confirm dialog. */
  destructive?: boolean
}

export function propertyMenuModel(ctx: PropertyMenuContext): PropertyMenuItem[] {
  switch (ctx.kind) {
    case 'editor':
      return [
        { label: 'Remove', action: 'property:remove' },
        { label: 'Delete', action: 'property:destroy', destructive: true },
      ]
    case 'assigned-row':
      return [
        { label: 'Rename', action: 'property:rename' },
        { label: 'Remove', action: 'property:remove' },
      ]
    case 'registry-row':
      return [{ label: 'Rename', action: 'property:rename' }]
    case 'page-value':
      // Nothing to clear on an empty row, so Clear stands down rather than showing inert.
      return ctx.filled
        ? [
            { label: 'Clear', action: 'value:clear' },
            { label: 'Remove', action: 'value:remove' },
          ]
        : [{ label: 'Remove', action: 'value:remove' }]
  }
}
