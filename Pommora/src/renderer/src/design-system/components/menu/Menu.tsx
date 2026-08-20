import { forwardRef, type ReactNode, type MouseEvent, type CSSProperties } from 'react'
import { DISCLOSURE_INDENT } from '../../tokens/size.css'
import { Icon, type IconName } from '../../symbols'
import * as s from './menu.css'
import { cx } from '../../cx'
import { onActivateClick } from '../../interactions/activate'
import { lockLabel } from '@shared/toggleLabels'

type MenuItemProps = {
  leading?: ReactNode
  subLabel?: ReactNode
  detail?: ReactNode
  trailing?: ReactNode
  selected?: boolean
  /** Shown but unable to act — dimmed, unhittable, and its click dropped, so a rule the write path
   *  enforces reads on the row instead of offering a pick that only bounces. */
  disabled?: boolean
  indent?: number
  onClick?: (e: React.MouseEvent) => void
  onContextMenu?: (e: MouseEvent) => void
  onPointerDown?: (e: React.PointerEvent) => void
  className?: string
  children: ReactNode
}

/** The row primitive (menu item + sidebar row). Geometry + states only — every
 *  behavior (selection, rename, drag, context menu) is the consumer's, passed in. */
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
        <span className={s.titleText}>{children}</span>
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

export function MenuHeading({
  leading,
  detail,
  children,
}: {
  leading?: ReactNode
  detail?: ReactNode
  children: ReactNode
}): React.JSX.Element {
  return (
    <div className={s.heading}>
      {leading != null && <span className={s.side}>{leading}</span>}
      <span className={s.titleText} style={{ flex: '1 1 auto', minWidth: 0 }}>
        {children}
      </span>
      {detail != null && <span className={cx(s.side, s.detail)}>{detail}</span>}
    </div>
  )
}

/** `flush` drops the side inset so the hairline spans the full gutter (matches full-width rows
 *  inside a MenuSurface). */
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

/** KNOB — a bar's glyph, sized against the ActionRow ramp its label rides rather than against the
 *  body rows below it. */
const BAR_GLYPH = 12

/** A pane's TopRow — a leading ‹ chevron + label that pops the nav stack one level. The trailing
 *  action rides the row's trailing slot so it reads — and colors — as part of the TopRow, not a
 *  floating toolbar button beside it. */
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

export function Menu({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}): React.JSX.Element {
  return <div className={cx(s.menu, className)}>{children}</div>
}

/** No dedicated `variant` prop — ghost/hidden-rest styling composes via `className`. */
export const AccessoryButton = forwardRef<
  HTMLButtonElement,
  {
    icon: IconName
    size: React.ComponentProps<typeof Icon>['size']
    ariaLabel: string
    box?: number
    onClick: () => void
    className?: string
    /** Whether pressing this makes something that isn't there yet — a creator takes the finger
     *  cursor, where the rest of the app's chrome keeps the arrow. */
    create?: boolean
    /** A feature that hasn't landed — inert and dimmed, never a live button wired to a no-op
     *  (which reads as broken rather than pending). */
    disabled?: boolean
  }
>(function AccessoryButton(
  { icon, size, ariaLabel, box, onClick, className, create = false, disabled = false },
  ref,
): React.JSX.Element {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      className={cx(s.accessoryButton, className)}
      data-create={create || undefined}
      style={box ? ({ '--accessory-box': `${box}px` } as CSSProperties) : undefined}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <Icon name={icon} size={size} />
    </button>
  )
})

export function MenuPaneTopRow({
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
  /** Scale/tone the CONTENT row only — the separator stays full so a density zoom never thins or
   *  shifts the divider. */
  contentClassName?: string
}): React.JSX.Element {
  const right = trailing ? (
    <span className={s.topBarTrailingSymbol}>{trailing}</span>
  ) : current ? (
    <span className={s.topBarTrailingLabel}>{current}</span>
  ) : undefined
  return (
    <>
      <MenuTopRow
        label={label}
        onClick={onBack}
        className={cx(s.topRowPad, contentClassName)}
        trailing={right}
      />
      <MenuSeparator flush className={s.paneSeparator} />
    </>
  )
}

/**
 * Mirror of MenuPaneTopRow. Carries its own flush divider and bottom placement — it sinks to the
 * pane's bottom edge in a flex-column pane, and is inert when a frame already pins it in a footer
 * slot, so a footing can never lose its divider or ride up mid-pane. Placement only: no imposed
 * typography, so each menu keeps its own action sizing.
 */
/** The lock a surface's bottom row carries — the same control on a board, a Space and a tile, so
 *  the three cannot come to disagree about its glyph, its wording, or what it announces. `noun`
 *  names what is being locked for a screen reader; the visible label is the verb alone. */
export function FooterLockButton({
  locked,
  noun,
  onToggle,
}: {
  locked: boolean
  noun: string
  onToggle: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={lockLabel(locked, noun)}
      className={s.footerLockAction}
      onClick={onToggle}
    >
      <Icon name="lock" size="control" className={s.lockIcon} />
      {lockLabel(locked)}
    </button>
  )
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

/**
 * The body is the ONE overflow region: a drag inside auto-scrolls it (it owns the scroll
 * ancestor), and it carries the shared edge-fade mask. PaneSlider slides between frames but never
 * caps/scrolls a slot itself — this frame is the single source.
 */
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
      <div className={cx(s.scrollFrameBody, 'edge-fade')}>{children}</div>
      {footer && <div className={s.scrollFrameEdge}>{footer}</div>}
    </div>
  )
}
