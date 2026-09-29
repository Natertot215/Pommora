import { Icon } from '@pommora/uix/Symbols'
import { cx } from '@pommora/uix/Utilities/cx'
import { DropOutline, MenuItem, titleInput } from '@pommora/uix/Menus'
import type { MutableKind } from '@pommora/core/Nexus/mutateRequest'
import { RenamableTitle } from '../RenamableTitle'

export function ctxHandler(cb?: () => void): ((e: React.MouseEvent) => void) | undefined {
  return cb
    ? (e) => {
        e.preventDefault()
        cb()
      }
    : undefined
}

export type RenameTarget = { path: string; kind: MutableKind }

export function RowTitle({
  path,
  kind,
  title,
}: {
  path: string
  kind: MutableKind
  title: string
}): React.JSX.Element {
  return (
    <RenamableTitle
      path={path}
      kind={kind}
      title={title}
      className={cx(titleInput, 'row-title-input')}
      host="sidebar"
    />
  )
}

export function Leaf({
  icon,
  title,
  depth,
  selected = false,
  onSelect,
  onContextMenu,
  rename,
}: {
  icon: string
  title: string
  depth: number
  selected?: boolean
  onSelect?: (e: React.MouseEvent) => void
  onContextMenu?: () => void
  rename?: RenameTarget
}): React.JSX.Element {
  return (
    <MenuItem
      className="row"
      selected={selected}
      indent={depth}
      tabIndex={-1}
      onClick={onSelect}
      onContextMenu={ctxHandler(onContextMenu)}
      leading={<DropOutline kind="spacer" />}
    >
      <Icon name={icon} size="headline" className="row-icon" />
      {rename ? <RowTitle path={rename.path} kind={rename.kind} title={title} /> : title}
    </MenuItem>
  )
}
