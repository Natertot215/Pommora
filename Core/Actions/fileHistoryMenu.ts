import type { ActionItem } from './menuModel'

type FileHistoryMenuAction = 'restore' | 'delete'

export function fileHistoryMenuItems(batch: boolean): ActionItem<FileHistoryMenuAction>[] {
  return batch
    ? [{ label: 'Delete All', action: 'delete' }]
    : [
        { label: 'Restore', action: 'restore' },
        { label: 'Delete', action: 'delete', separatorBefore: true },
      ]
}
