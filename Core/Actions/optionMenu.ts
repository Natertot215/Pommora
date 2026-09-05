/** The option chip's native right-click menu. Rename edits inline; Remove
 *  deletes the option AND strips its value from every page; Clear strips the value but keeps the
 *  option. Remove and Clear are destructive — main pops a confirm and resolves only on confirm, so
 *  the renderer never runs an unconfirmed strip. Pure model — main maps it to Electron MenuItems. */

import type { ActionItem } from './menuModel'

export interface OptionMenuContext {
  name: string
  /** Select / multi only — adds Edit Icon for the option's Compact glyph. */
  canEditIcon?: boolean
}

export type OptionMenuAction =
  | 'option:rename'
  | 'option:edit-icon'
  | 'option:remove'
  | 'option:clear'

/** `canEditIcon` gates the Compact glyph editor onto select / multi options; status options wear
 *  their group's glyph, so they never carry one of their own. */
export function optionMenuModel(canEditIcon = false): ActionItem<OptionMenuAction>[] {
  return [
    { label: 'Rename', action: 'option:rename' },
    ...(canEditIcon ? [{ label: 'Edit Icon', action: 'option:edit-icon' as const }] : []),
    { label: 'Remove', action: 'option:remove', confirm: true },
    { label: 'Clear', action: 'option:clear', confirm: true },
  ]
}
