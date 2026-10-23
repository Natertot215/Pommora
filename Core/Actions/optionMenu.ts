import { styleBranch, type StyleAction, type StyleMenuContext } from './columnMenu'
import type { ActionItem } from './menuModel'

type OptionMenuAction = 'option:edit' | 'option:clear' | 'option:delete' | StyleAction

export function optionMenuModel({
  style,
  destructive,
}: {
  style?: StyleMenuContext
  destructive: boolean
}): ActionItem<OptionMenuAction>[] {
  return [
    ...(style ? styleBranch(style) : []),
    { label: 'Edit Option', action: 'option:edit' },
    ...(destructive
      ? [
          { label: 'Clear', action: 'option:clear' as const, separatorBefore: true },
          { label: 'Delete', action: 'option:delete' as const },
        ]
      : []),
  ]
}
