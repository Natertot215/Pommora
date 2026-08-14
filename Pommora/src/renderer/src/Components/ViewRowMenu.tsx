import { Icon } from '@renderer/design-system/symbols'
import { MenuItem, MenuSeparator } from '../design-system/components/menu'
import { PointMenu } from '../design-system/components/PickerMenu'

/** A saved view row's right-click menu, shared by the toolbar's view pane and the view embed — the
 *  two surfaces that list the same container's views. Each action is optional and its row appears
 *  only where the host can perform it: the titles toggle belongs to the embed's own chrome, so no
 *  other host offers it. Delete is refused on a container's last view, mirroring the write path. */
export function ViewRowMenu({
  at,
  onDismiss,
  onRename,
  onIcon,
  onColor,
  titles,
  onDelete,
  deletable,
}: {
  at: { x: number; y: number }
  onDismiss: () => void
  onRename: () => void
  onIcon: () => void
  onColor?: () => void
  titles?: { shown: boolean; onToggle: () => void }
  onDelete: () => void
  deletable: boolean
}): React.JSX.Element {
  const row = (glyph: string, label: string, run: () => void): React.JSX.Element => (
    <MenuItem
      leading={<Icon name={glyph} size={13} />}
      onClick={() => {
        onDismiss()
        run()
      }}
    >
      {label}
    </MenuItem>
  )
  return (
    <PointMenu at={at} onDismiss={onDismiss}>
      {row('pencil', 'Rename', onRename)}
      {row('smile', 'Edit Icon', onIcon)}
      {onColor && row('palette', 'Edit Color', onColor)}
      {titles && row('type', titles.shown ? 'Hide Titles' : 'Show Titles', titles.onToggle)}
      <MenuSeparator />
      <MenuItem
        disabled={!deletable}
        leading={<Icon name="trash" size={13} />}
        onClick={() => {
          onDismiss()
          onDelete()
        }}
      >
        Delete
      </MenuItem>
    </PointMenu>
  )
}
