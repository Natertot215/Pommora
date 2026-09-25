import { useRef, useState } from 'react'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { SavedView } from '@pommora/core/Views/views'
import { askDeleteView } from '../../Interface/Confirm/confirmations'
import { notifyDeleted, reportRefusal } from '../../Interface/Notifications/notifications'
import { restoreView } from '../restoreView'
import { Icon } from '@pommora/uix/Symbols'
import { AccessoryButton, MenuItem, MenuSeparator } from '@pommora/uix/Menus'
import { PickerMenu } from '@pommora/uix/Pickers/picker-base'
import { dialer } from '../../Platform/dialer'

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

  const deleteView = async (): Promise<void> => {
    if (!(await askDeleteView())) return
    const res = await dialer().ask('views:delete', source.path, source.kind, view.id)
    if (!reportRefusal(res)) return
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
          disabled={views.length === 0}
          leading={<Icon name="copy" size="body" />}
          onClick={() => {
            setOpen(false)
            void dialer()
              .ask('views:duplicate', source.path, source.kind, view.id)
              .then(reportRefusal)
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
