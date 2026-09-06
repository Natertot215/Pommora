// Remove deletes the option AND strips its value from every page; Clear strips the value only.

import type { ActionItem } from './menuModel'

type OptionMenuAction = 'option:rename' | 'option:edit-icon' | 'option:remove' | 'option:clear'

export function optionMenuModel(canEditIcon = false): ActionItem<OptionMenuAction>[] {
  return [
    { label: 'Rename', action: 'option:rename' },
    ...(canEditIcon ? [{ label: 'Edit Icon', action: 'option:edit-icon' as const }] : []),
    { label: 'Remove', action: 'option:remove', separatorBefore: true, confirm: true },
    { label: 'Clear', action: 'option:clear', confirm: true },
  ]
}
