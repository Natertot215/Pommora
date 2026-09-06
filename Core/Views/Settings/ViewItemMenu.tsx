import { useRef, useState } from 'react'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import { DEFAULT_VIEW_ID, type SavedView } from '@pommora/core/Views/views'
import { askDeleteView } from '../../Interface/Confirm/confirmations'
import { notifyDeleted, notifyError } from '../../Interface/Notifications/notifications'
import { restoreView } from '../restoreView'
import { Icon } from '@pommora/uix/Symbols'
import { AccessoryButton, MenuItem, MenuSeparator } from '@pommora/uix/Menus'
import { PickerMenu } from '@pommora/uix/Pickers/picker-base'
import { host } from '../../Platform/dialer'

export function ViewItemMenu({
  source,
  view,
  onDeleted,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  onDeleted?: () => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const views = source.views ?? []
  const canDelete = views.length > 1

  const duplicateView = async (): Promise<void> => {
    const res = await host().ask('views:save', source.path, source.kind, {
      ...view,
      id: DEFAULT_VIEW_ID,
    })
    if (res.ok) {
      const ids = views.map((v) => v.id).filter((id) => id !== res.value.id)
      const at = ids.indexOf(view.id)
      ids.splice(at < 0 ? ids.length : at + 1, 0, res.value.id)
      await host().ask('views:reorder', source.path, source.kind, ids)
    }
  }
  const deleteView = async (): Promise<void> => {
    if (!(await askDeleteView())) return
    const res = await host().ask('views:delete', source.path, source.kind, view.id)
    if (!res.ok) return void notifyError(res.error.message)
    notifyDeleted(view.name, () => restoreView(source.path, source.kind, view, views))
    onDeleted?.()
  }

  return (
    <>
      <AccessoryButton
        ref={ref}
        icon="ellipsis-vertical"
        size="body"
        box={20}
        ariaLabel="View menu"
        onClick={() => setOpen(true)}
      />
      <PickerMenu solid open={open} onDismiss={() => setOpen(false)} triggerRef={ref}>
        <MenuItem
          leading={<Icon name="copy" size="body" />}
          onClick={() => {
            setOpen(false)
            void duplicateView()
          }}
        >
          Duplicate
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          disabled={!canDelete}
          leading={<Icon name="trash" size="body" />}
          onClick={() => {
            setOpen(false)
            void deleteView()
          }}
        >
          Delete
        </MenuItem>
      </PickerMenu>
    </>
  )
}
