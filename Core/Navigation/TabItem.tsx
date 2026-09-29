import { Fragment } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
import { HoverRemove, hoverRemoveHost } from '@pommora/uix/Interactions/HoverRemove'
import { useDragItem, type DragItem } from '@pommora/uix/Interactions/drag'
import { segment } from '@pommora/uix/Elements/segment.css'
import { Icon } from '@pommora/uix/Symbols'
import { text } from '@pommora/uix/Theme'
import type { TabTarget, WindowTabTarget } from '@pommora/core/Navigation/navRef'
import { EntityIcon } from '../Assets/EntityIcon'
import { hoverGlance, leaveGlance } from '../Interface/Glance/glanceAction'
import type { ResolvedNav } from './navResolve'

// A page tab is a location: it raises its preview on Shift, never on plain hover. Non-page tabs carry no id/path, so they raise nothing.
export const glanceHoverProps = (target: TabTarget | WindowTabTarget | undefined) => ({
  onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
    if (target?.kind === 'page') hoverGlance(target, e.currentTarget, 'location', e.shiftKey)
  },
  onPointerLeave: () => leaveGlance(),
})

const VARIANT = {
  standard: { text: text.control.standard, icon: 'body' },
  compact: { text: text.caption.standard, icon: 'control' },
  pinned: { text: undefined, icon: 'body' },
} as const

export interface TabItemProps {
  id: string
  label: string
  icon: ResolvedNav | string
  variant: keyof typeof VARIANT
  active: boolean
  closing?: boolean
  drag?: DragItem
  iconOnly?: boolean
  slide?: { seq: number; className: string }
  glance?: TabTarget | WindowTabTarget
  onActivate?: () => void
  onClose?: () => void
  onMenu?: (e: React.MouseEvent) => void
}

export function TabItem({
  id,
  label,
  icon,
  variant,
  active,
  closing,
  drag,
  iconOnly,
  slide,
  glance,
  onActivate,
  onClose,
  onMenu,
}: TabItemProps): React.JSX.Element {
  const size = VARIANT[variant].icon
  const pinned = variant === 'pinned'
  const iconClass = cx('tab-icon', slide?.className)
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the drag handle spread supplies onKeyDown (Space lifts, Enter opens), which a spread hides from static analysis
    <div
      ref={drag?.setNodeRef}
      style={drag?.style}
      {...drag?.handle}
      data-tab-id={id}
      {...glanceHoverProps(glance)}
      data-reveal-host=""
      className={cx(
        pinned ? 'tab-pinned' : 'tab',
        !pinned && hoverRemoveHost,
        VARIANT[variant].text,
        active && 'is-active',
        closing && 'is-closing',
        iconOnly && 'tab-map',
      )}
      title={label}
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={onActivate}
      onContextMenu={onMenu}
    >
      <Fragment key={slide?.seq ?? 0}>
        {typeof icon === 'string' ? (
          <Icon name={icon} size={size} className={iconClass} />
        ) : (
          <EntityIcon item={icon} size={size} className={iconClass} />
        )}
        {!iconOnly && !pinned && (
          <span className={cx(overScrollEllipsis, 'tab-label', slide?.className)}>{label}</span>
        )}
      </Fragment>
      {onClose && (
        <HoverRemove reveal="host" className="tab-x" label="Close Tab" onRemove={onClose} />
      )}
    </div>
  )
}

export function DraggableTabItem(props: Omit<TabItemProps, 'drag'>): React.JSX.Element {
  const drag = useDragItem(props.id, { open: props.onActivate })
  return <TabItem {...props} drag={drag} />
}

export function TabSeparator({ closing }: { closing?: boolean }): React.JSX.Element {
  return <span className={cx(segment, 'tab-seg', closing && 'is-closing')} aria-hidden />
}
