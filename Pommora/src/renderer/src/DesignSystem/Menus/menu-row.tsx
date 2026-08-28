import { forwardRef, type ReactNode, type MouseEvent, type CSSProperties } from 'react'
import { DISCLOSURE_INDENT, type IconSize } from '../Tokens/size.css'
import { Button } from '../Components/Controls/Button'
import { Icon, type IconName } from '../Symbols'
import * as s from './menu-base.css'
import { cx } from '../Util/cx'
import { overScrollEllipsis } from '../Interactions/OverScroll'
import { onActivateClick } from '../Interactions/activate'

const BAR_GLYPH = 12 // KNOB

export function MenuTopRow({
  label,
  onClick,
  className,
  trailing,
}: {
  label: string
  onClick: () => void
  className?: string
  trailing?: ReactNode
}): React.JSX.Element {
  return (
    <MenuItem
      className={cx(s.topRow, trailing != null && s.flushTrailing, className)}
      leading={
        <span className={s.topBarLeadingSymbol}>
          <Icon name="chevron-left" size={BAR_GLYPH} />
        </span>
      }
      trailing={trailing}
      onClick={onClick}
      // A press must not steal focus: the value panes commit-on-blur, so an unguarded mousedown here
      // would commit-and-dismiss before this row's click (Back) ever lands.
      onPointerDown={(e) => e.preventDefault()}
    >
      <span className={s.topBarLeadingLabel}>{label}</span>
    </MenuItem>
  )
}

export function MenuFrameTopRow({
  label,
  onBack,
  trailing,
  current,
  contentClassName,
}: {
  label: string
  onBack: () => void
  trailing?: ReactNode
  current?: string
  contentClassName?: string
}): React.JSX.Element {
  const right = trailing ? (
    <span className={s.topBarTrailingSymbol}>{trailing}</span>
  ) : current ? (
    <span className={s.topBarTrailingLabel}>{current}</span>
  ) : undefined
  return (
    <>
      <MenuTopRow label={label} onClick={onBack} className={contentClassName} trailing={right} />
      <MenuSeparator flush className={s.paneSeparator} />
    </>
  )
}

type MenuItemProps = {
  leading?: ReactNode
  subLabel?: ReactNode
  detail?: ReactNode
  trailing?: ReactNode
  selected?: boolean
  disabled?: boolean
  indent?: number
  onClick?: (e: React.MouseEvent) => void
  onContextMenu?: (e: MouseEvent) => void
  onPointerDown?: (e: React.PointerEvent) => void
  className?: string
  children: ReactNode
}

export function MenuItem({
  leading,
  subLabel,
  detail,
  trailing,
  selected = false,
  disabled = false,
  indent = 0,
  onClick,
  onContextMenu,
  onPointerDown,
  className,
  children,
}: MenuItemProps): React.JSX.Element {
  const rowStyle: CSSProperties | undefined = indent
    ? { paddingLeft: 8 + indent * DISCLOSURE_INDENT }
    : undefined
  const hasTrailing = detail != null || trailing != null
  const act = disabled ? undefined : onClick
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the button role is applied conditionally on the click handler, which a static parse cannot see
    <div
      className={cx(s.item, selected && s.itemSelected, disabled && s.rowDisabled, className)}
      style={rowStyle}
      role={act ? 'button' : undefined}
      tabIndex={act ? 0 : undefined}
      onClick={act}
      onKeyDown={act ? onActivateClick : undefined}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
    >
      {leading != null && <span className={s.side}>{leading}</span>}
      <span className={s.titleWrap}>
        <span className={cx(s.titleText, overScrollEllipsis)}>{children}</span>
        {subLabel != null && <span className={s.subLabel}>{subLabel}</span>}
      </span>
      {hasTrailing && (
        <span className={s.side}>
          {detail != null && <span className={s.detail}>{detail}</span>}
          {trailing}
        </span>
      )}
    </div>
  )
}

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

export function MenuCaption({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className={s.caption}>{children}</div>
}

export function MenuBottomRow({
  leading,
  trailing,
  children,
}: {
  leading?: ReactNode
  trailing?: ReactNode
  children?: ReactNode
}): React.JSX.Element {
  return (
    <div className={s.bottomBar}>
      <MenuSeparator flush />
      {children ?? (
        <div className={s.bottomRow}>
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
  onToggle,
}: {
  verb: string
  noun: string
  onToggle: () => void
}): React.JSX.Element {
  return (
    <Button
      size="button-inline"
      aria-label={`${verb} ${noun}`}
      className={s.footerLockAction}
      onClick={onToggle}
    >
      <Icon name="lock" size="control" className={s.lockIcon} />
      {verb}
    </Button>
  )
}

export function FooterMoreButton({
  onClick,
  disabled,
}: {
  onClick?: () => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <Button
      size="button-inline"
      aria-label="More actions"
      className={s.footerLockAction}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon name="ellipsis" size="body" />
    </Button>
  )
}

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
  children,
}: {
  header?: ReactNode
  footer?: ReactNode
  maxHeight?: number
  children: ReactNode
}): React.JSX.Element {
  return (
    <div className={s.scrollFrame} style={{ maxHeight }}>
      {header && <div className={s.scrollFrameEdge}>{header}</div>}
      <div className={cx(s.scrollFrameBody, 'over-scroll')}>{children}</div>
      {footer && <div className={s.scrollFrameEdge}>{footer}</div>}
    </div>
  )
}
