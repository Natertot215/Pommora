/** The option chip's native right-click menu. Rename edits inline; Remove
 *  deletes the option AND strips its value from every page; Clear strips the value but keeps the
 *  option. Remove and Clear are destructive — main pops a confirm and resolves only on confirm, so
 *  the renderer never runs an unconfirmed strip. Pure model — main maps it to Electron MenuItems. */

import type { ActionItem } from './menuModel'

export interface OptionMenuContext {
  name: string
}

export type OptionMenuAction = 'option:rename' | 'option:remove' | 'option:clear'

export function optionMenuModel(): ActionItem<OptionMenuAction>[] {
  return [
    { label: 'Rename', action: 'option:rename' },
    { label: 'Remove', action: 'option:remove', confirm: true },
    { label: 'Clear', action: 'option:clear', confirm: true },
  ]
}
