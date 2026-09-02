import { useRef, useState } from 'react'
import type { CollectionNode, SetNode } from '@shared/types'
import { DEFAULT_VIEW_ID, type SavedView } from '@shared/views'
import { askDeleteView } from '@renderer/Windows/confirmations'
import { notifyDeleted, notifyError, restoreView } from '@renderer/Interface/notifications'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { AccessoryButton, MenuItem, MenuSeparator } from '@renderer/DesignSystem/Menus'
import { PickerMenu } from '@renderer/DesignSystem/Pickers/picker-base'

/** The view's own "…" — Duplicate, and a Delete that asks first. */
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
  const canDelete = views.length > 1 && view.id !== DEFAULT_VIEW_ID

  const duplicateView = async (): Promise<void> => {
    const res = await window.nexus.views.save(source.path, source.kind, {
      ...view,
      id: DEFAULT_VIEW_ID,
    })
    if (res.ok) {
      const ids = views.map((v) => v.id).filter((id) => id !== res.value.id)
      const at = ids.indexOf(view.id)
      ids.splice(at < 0 ? ids.length : at + 1, 0, res.value.id)
      await window.nexus.views.reorder(source.path, source.kind, ids)
    }
  }
  const deleteView = async (): Promise<void> => {
    if (!(await askDeleteView())) return
    const res = await window.nexus.views.delete(source.path, source.kind, view.id)
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
