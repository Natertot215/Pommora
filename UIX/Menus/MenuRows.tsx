import { Fragment, type ReactNode, type MouseEvent, type CSSProperties, type Ref } from 'react'
import { DISCLOSURE_INDENT, type IconSize } from '../Theme/theme-vars.css'
import { Button } from '../Buttons/Button'
import { Icon, type IconName, LockGlyph } from '../Symbols'
import * as s from './menu-row.css'
import { cx } from '../Utilities/cx'
import { overScrollEllipsis } from '../Interactions/OverScroll'
import { onActivateClick } from '../Interactions/activate'
import { segment } from '../Elements/segment.css'

const BAR_GLYPH = 12 // KNOB
const CHECK = 12
const INDENT_BASE = 8 // KNOB

const rowLead = (depth: number): number | string =>
  depth ? INDENT_BASE + depth * DISCLOSURE_INDENT : s.ROW_LEAD

export const rowDropLine = (depth = 0): CSSProperties => ({
  left: rowLead(depth),
  right: s.ROW_TRAIL,
})

/** A searched row's label with the typed match drawn emphasized; `at` is where the matcher found it. */
export function emphasizeMatch(label: string, at: number | null, len: number): ReactNode {
  if (at === null || len === 0) return label
  return (
    <>
      {label.slice(0, at)}
      <span className={s.matchText}>{label.slice(at, at + len)}</span>
      {label.slice(at + len)}
    </>
  )
}

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
    <span className={cx(s.topBarTrailingLabel, overScrollEllipsis)}>{current}</span>
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
        // The value panes commit-on-blur, so an unguarded mousedown commits before Back lands.
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
  detail?: ReactNode
  trailing?: ReactNode
  overlay?: ReactNode
  selected?: boolean
  checked?: boolean
  centered?: boolean
  disabled?: boolean
  inert?: boolean
  indent?: number
  onClick?: (e: React.MouseEvent) => void
  onContextMenu?: (e: MouseEvent) => void
  onPointerDown?: (e: React.PointerEvent) => void
  onMouseDown?: (e: MouseEvent) => void
  onPointerEnter?: (e: React.PointerEvent) => void
  onPointerLeave?: (e: React.PointerEvent) => void
  className?: string
  children: ReactNode
  ref?: Ref<HTMLDivElement>
}

export function MenuItem({
  leading,
  subLabel,
  detail,
  trailing,
  overlay,
  selected = false,
  checked,
  centered = false,
  disabled = false,
  inert = false,
  indent = 0,
  onClick,
  onContextMenu,
  onPointerDown,
  onMouseDown,
  onPointerEnter,
  onPointerLeave,
  className,
  children,
  ref,
}: MenuItemProps): React.JSX.Element {
  const rowStyle = {
    ...(indent ? { paddingLeft: rowLead(indent) } : undefined),
    ...(trailing != null ? { '--row-pad-trail': '0px' } : undefined),
  } as CSSProperties
  const hasTrailing = detail != null || trailing != null
  const act = disabled || inert ? undefined : onClick
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the button role is applied conditionally on the click handler, which a static parse cannot see
    <div
      ref={ref}
      className={cx(
        inert ? s.rowBox : s.item,
        selected && s.itemSelected,
        checked && s.itemChecked,
        disabled && s.rowDisabled,
        className,
      )}
      style={rowStyle}
      data-reveal-host={inert ? undefined : ''}
      role={act ? 'button' : undefined}
      tabIndex={act ? 0 : undefined}
      onClick={act}
      onKeyDown={act ? onActivateClick : undefined}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      onMouseDown={onMouseDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {leading != null && <span className={s.side}>{leading}</span>}
      <span className={cx(s.titleWrap, centered && s.titleCentered)}>
        <span className={cx(s.titleText, overScrollEllipsis)}>{children}</span>
        {subLabel != null && <span className={s.subLabel}>{subLabel}</span>}
      </span>
      {hasTrailing && (
        <span className={s.side}>
          {detail != null && <span className={s.detail}>{detail}</span>}
          {trailing}
        </span>
      )}
      {checked !== undefined && (
        <Icon name="check" size={CHECK} className={cx(s.check, !checked && s.checkHidden)} />
      )}
      {overlay}
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
          <span className={s.spacer} />
          {trailing}
        </div>
      )}
    </div>
  )
}

export function AccessoryButton({
  icon,
  size,
  ariaLabel,
  box,
  onClick,
  className,
  create = false,
  disabled = false,
  pressed,
  reveal,
  ref,
}: {
  icon: IconName
  size: IconSize
  ariaLabel: string
  box?: number
  onClick: () => void
  className?: string
  create?: boolean
  disabled?: boolean
  pressed?: boolean
  reveal?: boolean
  ref?: Ref<HTMLButtonElement>
}): React.JSX.Element {
  return (
    <Button
      ref={ref}
      size="button-inline"
      paddingX="0"
      icon={icon}
      iconSize={size}
      disabled={disabled}
      pressed={pressed}
      reveal={reveal}
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
}

export function FooterIconButton({
  icon,
  ariaLabel,
  onClick,
  disabled,
  pressed,
  quiet,
  ref,
}: {
  icon: string | React.JSX.Element
  ariaLabel: string
  onClick?: () => void
  disabled?: boolean
  pressed?: boolean
  quiet?: boolean
  ref?: Ref<HTMLButtonElement>
}): React.JSX.Element {
  return (
    <Button
      ref={ref}
      size="button-inline"
      aria-label={ariaLabel}
      className={cx(s.footingLabel, quiet && s.footingQuiet)}
      onClick={onClick}
      disabled={disabled}
      pressed={pressed}
    >
      {typeof icon === 'string' ? <Icon name={icon} size="body" /> : icon}
    </Button>
  )
}

export function FooterLockButton({
  ariaLabel,
  locked,
  onToggle,
  disabled,
}: {
  ariaLabel: string
  locked: boolean
  onToggle: () => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <FooterIconButton
      icon={<LockGlyph locked={locked} size="body" />}
      ariaLabel={ariaLabel}
      pressed={locked}
      onClick={onToggle}
      disabled={disabled}
    />
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
      <div className={cx(s.scrollFrameBody, 'scroll-fade')}>{children}</div>
      {footer && <div className={s.scrollFrameEdge}>{footer}</div>}
    </div>
  )
}
