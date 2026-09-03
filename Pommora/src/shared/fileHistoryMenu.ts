import type { ActionItem } from './menuModel'

export type FileHistoryMenuAction = 'restore' | 'delete'

/** A checked snapshot's right-click rows; a multi-check offers only the batch delete. */
export function fileHistoryMenuItems(batch: boolean): ActionItem<FileHistoryMenuAction>[] {
  return batch
    ? [{ label: 'Delete All', action: 'delete' }]
    : [
        { label: 'Restore', action: 'restore' },
        { label: 'Delete', action: 'delete', separatorBefore: true },
      ]
}
