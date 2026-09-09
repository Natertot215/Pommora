import { useEffect, useRef } from 'react'
import { Icon } from '@pommora/uix/Symbols'
import { cx } from '@pommora/uix/Utilities/cx'
import { MenuItem, titleInput } from '@pommora/uix/Menus'
import type { MutableKind } from '@pommora/core/Nexus/mutateRequest'
import { useSidebarDrag } from './sidebarDnd'
import { registerDiscloseTarget } from '@pommora/uix/Interactions/dragDisclose'
import { RenamableTitle } from '../RenamableTitle'
import { dropOutlineSpacer } from '@pommora/uix/Menus/listed-outline.css'

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
  chevronSpace = true,
  onSelect,
  onContextMenu,
  rename,
}: {
  icon: string
  title: string
  depth: number
  selected?: boolean
  chevronSpace?: boolean
  onSelect?: (e: React.MouseEvent) => void
  onContextMenu?: () => void
  rename?: RenameTarget
}): React.JSX.Element {
  return (
    <MenuItem
      className="row"
      selected={selected}
      indent={depth}
      onClick={onSelect}
      onContextMenu={ctxHandler(onContextMenu)}
      leading={
        chevronSpace ? <span className={dropOutlineSpacer} data-drop-outline-spacer /> : null
      }
    >
      <Icon name={icon} size="headline" className="row-icon" />
      {rename ? <RowTitle path={rename.path} kind={rename.kind} title={title} /> : title}
    </MenuItem>
  )
}

export function DragRow({
  id,
  springOpen,
  onPointerEnter,
  onPointerLeave,
  children,
}: {
  id: string
  springOpen?: { collapsed: boolean; onExpand: () => void }
  onPointerEnter?: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerLeave?: () => void
  children: React.ReactNode
}): React.JSX.Element {
  const drag = useSidebarDrag(id)
  const el = useRef<HTMLDivElement | null>(null)
  const expandRef = useRef(springOpen?.onExpand)
  expandRef.current = springOpen?.onExpand
  const collapsed = springOpen?.collapsed ?? false
  useEffect(() => {
    if (!collapsed || !el.current) return
    return registerDiscloseTarget(el.current, () => expandRef.current?.())
  }, [collapsed])
  return (
    <div
      ref={(node) => {
        el.current = node
        drag.ref(node)
      }}
      className={`tree-item${drag.isDragging ? ' dragging' : ''}`}
      data-disclose={collapsed ? '' : undefined}
      {...drag.handle}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </div>
  )
}
