// Remove deletes the option AND strips its value from every page; Clear strips the value only.

import type { ActionItem } from './menuModel'

type OptionMenuAction = 'option:rename' | 'option:edit-icon' | 'option:remove' | 'option:clear'

export function optionMenuModel(): ActionItem<OptionMenuAction>[] {
  return [
    { label: 'Rename', action: 'option:rename' },
    { label: 'Edit Icon', action: 'option:edit-icon' },
    { label: 'Remove', action: 'option:remove', separatorBefore: true },
    { label: 'Clear', action: 'option:clear' },
  ]
}
