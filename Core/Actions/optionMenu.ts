// Clear strips the option's value from every page; Remove deletes the option and strips it too.

import { styleBranch, type StyleAction, type StyleMenuContext } from './columnMenu'
import type { ActionItem } from './menuModel'

type OptionMenuAction = 'option:edit' | 'option:clear' | 'option:remove' | StyleAction

export function optionMenuModel(style?: StyleMenuContext): ActionItem<OptionMenuAction>[] {
  return [
    ...(style ? styleBranch(style) : []),
    { label: 'Edit Option', action: 'option:edit' },
    { label: 'Clear', action: 'option:clear', separatorBefore: true },
    { label: 'Remove', action: 'option:remove' },
  ]
}
