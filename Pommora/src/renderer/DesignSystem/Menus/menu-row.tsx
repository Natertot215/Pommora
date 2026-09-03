import { forwardRef, Fragment, type ReactNode, type MouseEvent, type CSSProperties } from 'react'
import { DISCLOSURE_INDENT, type IconSize } from '../Tokens/size.css'
import { Button } from '../Buttons'
import { Icon, type IconName } from '../Symbols'
import * as s from './menu-base.css'
import { cx } from '../Util/cx'
import { overScrollEllipsis } from '../Interactions/OverScroll'
import { onActivateClick } from '../Interactions/activate'
import { segment } from '../Elements/Segment/segment.css'

const BAR_GLYPH = 12 // KNOB

export function MenuTopRow({
  label,
  onBack,
  trailing,
  current,
  className,
}: {
  label: string
  onBack: () => void
  trailing?: ReactNode
  current?: string
  className?: string
}): React.JSX.Element {
  const right = trailing ? (
    <span className={s.topBarTrailingSymbol}>{trailing}</span>
  ) : current ? (
    <span className={s.topBarTrailingLabel}>{current}</span>
  ) : undefined
  return (
    <>
      <MenuItem
        className={cx(s.topRow, className)}
        leading={
          <span className={s.topBarLeadingSymbol}>
            <Icon name="chevron-left" size={BAR_GLYPH} />
          </span>
        }
        trailing={right}
        onClick={onBack}
        // A press must not steal focus: the value panes commit-on-blur, so an unguarded mousedown here
        // would commit-and-dismiss before this row's click (Back) ever lands.
        onPointerDown={(e) => e.preventDefault()}
      >
        <span className={s.topBarLeadingLabel}>{label}</span>
      </MenuItem>
      <MenuSeparator flush className={s.paneSeparator} />
    </>
  )
}

type MenuItemProps = {
  leading?: ReactNode
  subLabel?: ReactNode
  value?: ReactNode
  detail?: ReactNode
  trailing?: ReactNode
  overlay?: ReactNode
  selected?: boolean
  disabled?: boolean
  inert?: boolean
  indent?: number
  onClick?: (e: React.MouseEvent) => void
  onContextMenu?: (e: MouseEvent) => void
  onPointerDown?: (e: React.PointerEvent) => void
  onMouseDown?: (e: MouseEvent) => void
  onMouseEnter?: (e: React.MouseEvent) => void
  onMouseLeave?: (e: React.MouseEvent) => void
  className?: string
  children: ReactNode
}

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(function MenuItem(
  {
    leading,
    subLabel,
    value,
    detail,
    trailing,
    overlay,
    selected = false,
    disabled = false,
    inert = false,
    indent = 0,
    onClick,
    onContextMenu,
    onPointerDown,
    onMouseDown,
    onMouseEnter,
    onMouseLeave,
    className,
    children,
  },
  ref,
): React.JSX.Element {
  const rowStyle = {
    ...(indent ? { paddingLeft: 8 + indent * DISCLOSURE_INDENT } : undefined),
    ...(trailing != null ? { '--row-pad-trail': '0px' } : undefined),
  } as CSSProperties
  const hasTrailing = value != null || detail != null || trailing != null
  const act = disabled || inert ? undefined : onClick
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the button role is applied conditionally on the click handler, which a static parse cannot see
    <div
      ref={ref}
      className={cx(
        inert ? s.rowBox : s.item,
        selected && s.itemSelected,
        disabled && s.rowDisabled,
        className,
      )}
      style={rowStyle}
      role={act ? 'button' : undefined}
      tabIndex={act ? 0 : undefined}
      onClick={act}
      onKeyDown={act ? onActivateClick : undefined}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {leading != null && <span className={s.side}>{leading}</span>}
      <span className={s.titleWrap}>
        <span className={cx(s.titleText, overScrollEllipsis)}>{children}</span>
        {subLabel != null && <span className={s.subLabel}>{subLabel}</span>}
      </span>
      {hasTrailing && (
        <span className={s.side}>
          {value != null && <span className={s.value}>{value}</span>}
          {detail != null && <span className={s.detail}>{detail}</span>}
          {trailing}
        </span>
      )}
      {overlay}
    </div>
  )
})

export function MenuSeparator({
  flush = false,
  className,
}: {
  flush?: boolean
  className?: string
} = {}): React.JSX.Element {
  return (
    <div className={cx(s.separator, flush && s.separatorFlush, className)} aria-hidden="true">
      <span className={s.separatorLine} />
    </div>
  )
}

export function MenuSegments({ parts }: { parts: readonly ReactNode[] }): React.JSX.Element {
  return (
    <span className={s.subLabelSegments}>
      {parts.map((part, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the parts are positional by definition
        <Fragment key={i}>
          {i > 0 && <span className={cx(segment, s.subLabelSegment)} aria-hidden="true" />}
          {part}
        </Fragment>
      ))}
    </span>
  )
}

export function MenuCaption({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className={s.caption}>{children}</div>
}

/** A MenuFooting's row: the footing's glyph + label treatment, with every other MenuItem prop
 *  (trailing, value, onClick) passed straight through. */
export function FootingItem({
  icon,
  label,
  ...rest
}: { icon: IconName; label: ReactNode } & Omit<
  MenuItemProps,
  'leading' | 'children'
>): React.JSX.Element {
  return (
    <MenuItem
      leading={
        <span className={s.footingSymbol}>
          <Icon name={icon} size="control" />
        </span>
      }
      {...rest}
    >
      <span className={s.footingLabel}>{label}</span>
    </MenuItem>
  )
}

export function MenuFooting({
  leading,
  trailing,
  children,
}: {
  leading?: ReactNode
  trailing?: ReactNode
  children?: ReactNode
}): React.JSX.Element {
  return (
    <div className={s.footingBar}>
      <MenuSeparator flush />
      {children ?? (
        <div className={s.footing}>
          {leading}
          <span style={{ flex: '1 1 auto' }} />
          {trailing}
        </div>
      )}
    </div>
  )
}

export const AccessoryButton = forwardRef<
  HTMLButtonElement,
  {
    icon: IconName
    size: IconSize
    ariaLabel: string
    box?: number
    onClick: () => void
    className?: string
    create?: boolean
    disabled?: boolean
    pressed?: boolean
  }
>(function AccessoryButton(
  { icon, size, ariaLabel, box, onClick, className, create = false, disabled = false, pressed },
  ref,
): React.JSX.Element {
  return (
    <Button
      ref={ref}
      size="button-inline"
      paddingX="0"
      icon={icon}
      iconSize={size}
      disabled={disabled}
      pressed={pressed}
      className={cx(s.accessoryButton, className)}
      data-create={create || undefined}
      style={box ? ({ '--accessory-box': `${box}px` } as CSSProperties) : undefined}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    />
  )
})

export function FooterLockButton({
  verb,
  noun,
  locked,
  onToggle,
}: {
  verb: string
  noun: string
  locked: boolean
  onToggle: () => void
}): React.JSX.Element {
  return (
    <Button
      size="button-inline"
      aria-label={`${verb} ${noun}`}
      className={s.footerLockAction}
      onClick={onToggle}
    >
      <Icon name={locked ? 'locked' : 'lock-open'} size="control" className={s.lockIcon} />
      {verb}
    </Button>
  )
}

export const FooterIconButton = forwardRef<
  HTMLButtonElement,
  {
    icon: string
    ariaLabel: string
    onClick?: () => void
    disabled?: boolean
    pressed?: boolean
  }
>(function FooterIconButton(
  { icon, ariaLabel, onClick, disabled, pressed },
  ref,
): React.JSX.Element {
  return (
    <Button
      ref={ref}
      size="button-inline"
      aria-label={ariaLabel}
      className={s.footerLockAction}
      onClick={onClick}
      disabled={disabled}
      pressed={pressed}
    >
      <Icon name={icon} size="body" />
    </Button>
  )
})

export function Menu({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}): React.JSX.Element {
  return <div className={cx(s.menu, className)}>{children}</div>
}

export function MenuScrollFrame({
  header,
  footer,
  maxHeight = s.MENU_MAX_HEIGHT,
  className,
  children,
}: {
  header?: ReactNode
  footer?: ReactNode
  maxHeight?: number
  className?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <div className={cx(s.scrollFrame, className)} style={{ maxHeight }}>
      {header && <div className={s.scrollFrameEdge}>{header}</div>}
      <div className={cx(s.scrollFrameBody, 'over-scroll')}>{children}</div>
      {footer && <div className={s.scrollFrameEdge}>{footer}</div>}
    </div>
  )
}
